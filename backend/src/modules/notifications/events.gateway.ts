import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { fallbackSignatureColor } from '@friday/types';

/** Rich per-band presence profile (name, avatar, signature color — PRD §16). */
export interface BandMemberInfo {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  color: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSocketMap = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private bandSockets = new Map<string, Map<string, BandMemberInfo>>(); // bandId -> userId -> member
  /**
   * Soft node-edit locks (Figma-style): while a member is actively editing a
   * node, other members are read-only on it. Keyed per socket so closing one
   * tab never drops the locks of another tab of the same user.
   */
  private nodeLocks = new Map<
    string,
    Map<string, { socketId: string; userId: string; name: string; color: string; avatarUrl: string | null }>
  >(); // bandId -> nodeId -> lock

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    try {
      // Extract token from cookie or handshake auth
      const cookieHeader = client.handshake.headers.cookie;
      let token: string | undefined = client.handshake.auth?.token;

      if (!token && cookieHeader) {
        const match = cookieHeader.match(/friday_token=([^;]+)/);
        if (match) token = match[1];
      }

      if (token) {
        const secret = this.configService.get<string>('JWT_SECRET');
        const decoded = this.jwtService.verify(token, { secret });
        client.data.user = decoded;

        const userId = decoded.sub || decoded.id;
        if (userId) {
          client.data.userId = userId;
          client.data.username = decoded.username || userId;
          if (!this.userSocketMap.has(userId)) {
            this.userSocketMap.set(userId, new Set());
          }
          this.userSocketMap.get(userId)!.add(client.id);
          // Join user's personal room
          client.join(`user:${userId}`);
          this.logger.debug(`Socket connected for user ${userId}: ${client.id}`);
        }
      } else {
        this.logger.debug(`Anonymous socket connected: ${client.id}`);
      }
    } catch (err: any) {
      this.logger.debug(`Socket connection unauthenticated: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSocketMap.has(userId)) {
      const sockets = this.userSocketMap.get(userId)!;
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSocketMap.delete(userId);
      }
    }
    for (const [bandId, members] of this.bandSockets) {
      if (members.has(userId)) {
        members.delete(userId);
        this.emitPresence(bandId);
      }
      if (this.releaseSocketLocks(bandId, client.id)) {
        this.emitNodeLocks(bandId);
      }
    }
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  /** Drops every node lock held by one socket; returns true when anything changed. */
  private releaseSocketLocks(bandId: string, socketId: string): boolean {
    const locks = this.nodeLocks.get(bandId);
    if (!locks) return false;
    let changed = false;
    for (const [nodeId, lock] of locks) {
      if (lock.socketId === socketId) {
        locks.delete(nodeId);
        changed = true;
      }
    }
    return changed;
  }

  private emitPresence(bandId: string) {
    const members = this.bandSockets.get(bandId);
    const payload = members ? [...members.values()] : [];
    this.server?.to(`band:${bandId}`).emit('canvas:presence', { bandId, members: payload });
  }

  @SubscribeMessage('join:band')
  async handleJoinBand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bandId: string },
  ) {
    if (!data?.bandId) {
      return { status: 'error', message: 'Missing bandId' };
    }
    const userId = client.data.userId;
    if (!userId) {
      return { status: 'error', message: 'Unauthenticated' };
    }

    // Membership is verified server-side so a logged-in user cannot listen to
    // presence/cursors of a Band they don't belong to.
    const member = await this.resolveBandMember(userId, data.bandId);
    if (!member) {
      this.logger.debug(`Socket ${client.id} denied join to band ${data.bandId} (not a member)`);
      return { status: 'error', message: 'You are not a member of this Band' };
    }

    client.join(`band:${data.bandId}`);
    if (!this.bandSockets.has(data.bandId)) {
      this.bandSockets.set(data.bandId, new Map());
    }
    this.bandSockets.get(data.bandId)!.set(userId, member);
    this.emitPresence(data.bandId);
    this.logger.debug(`Socket ${client.id} joined room band:${data.bandId}`);
    return { status: 'joined', room: `band:${data.bandId}` };
  }

  /**
   * Resolves the rich presence profile (display name, avatar, signature
   * color) of a Band member, or null when the user is not a member. The
   * Band creator counts as a member even without a membership row, mirroring
   * CanvasService.assertAccess.
   */
  private async resolveBandMember(userId: string, bandId: string): Promise<BandMemberInfo | null> {
    try {
      const membership = await this.prisma.bandMembership.findUnique({
        where: { userId_bandId: { userId, bandId } },
        include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
      });
      if (membership) {
        const { username, displayName, avatarUrl } = membership.user;
        return {
          userId,
          username: username || userId,
          displayName: displayName || username || userId,
          avatarUrl: avatarUrl ?? null,
          color: membership.signatureColor || fallbackSignatureColor(userId),
        };
      }
      const band = await this.prisma.band.findUnique({
        where: { id: bandId },
        select: { id: true, creatorId: true },
      });
      if (band && band.creatorId === userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, displayName: true, avatarUrl: true },
        });
        return {
          userId,
          username: user?.username || userId,
          displayName: user?.displayName || user?.username || userId,
          avatarUrl: user?.avatarUrl ?? null,
          color: fallbackSignatureColor(userId),
        };
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`Presence lookup failed for ${userId} in band ${bandId}: ${err.message}`);
      return null;
    }
  }

  @SubscribeMessage('leave:band')
  handleLeaveBand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bandId: string },
  ) {
    if (data?.bandId) {
      client.leave(`band:${data.bandId}`);
      const userId = client.data.userId;
      if (userId) {
        this.bandSockets.get(data.bandId)?.delete(userId);
        this.emitPresence(data.bandId);
      }
      if (this.releaseSocketLocks(data.bandId, client.id)) {
        this.emitNodeLocks(data.bandId);
      }
      this.logger.debug(`Socket ${client.id} left room band:${data.bandId}`);
      return { status: 'left', room: `band:${data.bandId}` };
    }
    return { status: 'error', message: 'Missing bandId' };
  }

  /** Currently-connected members of a band (for "active edits" awareness). */
  getBandPresence(bandId: string): BandMemberInfo[] {
    return [...(this.bandSockets.get(bandId)?.values() ?? [])];
  }

  /**
   * Live canvas cursor position, relayed to the whole band room. The client
   * only sends coordinates (throttled to ~25 Hz); the profile (name, avatar,
   * signature color) is stamped server-side from the join:band membership so
   * cursors always carry a verified identity. x/y are null when the user's
   * pointer left the canvas — receivers hide the cursor.
   */
  @SubscribeMessage('canvas:cursor')
  handleCanvasCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bandId?: string; pageId?: string; x?: number | null; y?: number | null },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.bandId || !data.pageId) return;
    const member = this.bandSockets.get(data.bandId)?.get(userId);
    if (!member) return;

    const x = data.x == null ? null : Math.round(Number(data.x) || 0);
    const y = data.y == null ? null : Math.round(Number(data.y) || 0);
    this.server?.to(`band:${data.bandId}`).emit('canvas:cursor', {
      bandId: data.bandId,
      pageId: data.pageId,
      x,
      y,
      userId,
      name: member.displayName,
      color: member.color,
      avatarUrl: member.avatarUrl,
    });
  }

  /**
   * Acquire or release the soft edit lock on a canvas node. First come,
   * first served: a node already locked by another member cannot be stolen,
   * so two people can't clobber the same document simultaneously. The full
   * lock set is broadcast so every member converges on the same state.
   */
  @SubscribeMessage('canvas:node-lock')
  handleNodeLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bandId?: string; nodeId?: string; acquire?: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.bandId || !data.nodeId) return;
    const member = this.bandSockets.get(data.bandId)?.get(userId);
    if (!member) return;

    let locks = this.nodeLocks.get(data.bandId);
    if (!locks) {
      locks = new Map();
      this.nodeLocks.set(data.bandId, locks);
    }
    const current = locks.get(data.nodeId);

    if (data.acquire) {
      // Allow re-acquiring your own lock (another tab of the same user);
      // refuse to steal a lock held by someone else.
      if (current && current.userId !== userId) return;
      locks.set(data.nodeId, {
        socketId: client.id,
        userId,
        name: member.displayName,
        color: member.color,
        avatarUrl: member.avatarUrl,
      });
    } else {
      if (!current || current.userId !== userId) return;
      locks.delete(data.nodeId);
    }
    this.emitNodeLocks(data.bandId);
  }

  private emitNodeLocks(bandId: string) {
    const locks = this.nodeLocks.get(bandId);
    const payload = locks
      ? [...locks.entries()].map(([nodeId, lock]) => ({
          nodeId,
          userId: lock.userId,
          name: lock.name,
          color: lock.color,
          avatarUrl: lock.avatarUrl,
        }))
      : [];
    this.server?.to(`band:${bandId}`).emit('canvas:node-locks', { bandId, locks: payload });
  }

  /** Emit to all members of a band */
  emitToBand(bandId: string, event: string, payload: unknown) {
    if (this.server) {
      this.server.to(`band:${bandId}`).emit(event, payload);
    }
  }

  /** Emit to a specific user */
  emitToUser(userId: string, event: string, payload: unknown) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, payload);
    }
  }

  /** Broadcast to all connected clients */
  broadcast(event: string, payload: unknown) {
    if (this.server) {
      this.server.emit(event, payload);
    }
  }
}
