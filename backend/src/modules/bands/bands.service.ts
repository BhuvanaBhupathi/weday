import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BandMemberRole } from '@prisma/client';
import { SIGNATURE_COLOR_PALETTE, nextSignatureColor } from '../../common/signature-colors';
import type { CreateBandDto } from './dto/create-band.dto';
import type { UpdateBandDto } from './dto/update-band.dto';

/** 8-character alphanumeric join code: e.g. QRT-8X4P */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment()}-${segment()}`;
}

/** URL-safe slug from band name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/** Ensure slug is unique by appending a suffix if needed */
async function uniqueSlug(prisma: PrismaService, base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const exists = await prisma.band.findUnique({ where: { slug } });
    if (!exists) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

@Injectable()
export class BandsService {
  private readonly logger = new Logger(BandsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new Band. The creator is automatically made Band Admin.
   * Default chat channels are created.
   */
  async createBand(creatorId: string, dto: CreateBandDto) {
    const slug = await uniqueSlug(this.prisma, slugify(dto.name));
    const joinCode = generateJoinCode();

    const band = await this.prisma.$transaction(async (tx) => {
      const newBand = await tx.band.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          iconUrl: dto.iconUrl,
          joinCode,
          creatorId,
          memberships: {
            create: {
              userId: creatorId,
              role: BandMemberRole.ADMIN,
              // Creator is the first member: they get the first palette color.
              signatureColor: SIGNATURE_COLOR_PALETTE[0],
            },
          },
        },
        include: { memberships: true },
      });

      // Create default chat channels
      const defaultChannels = [
        { name: 'general', slug: 'general', description: 'General discussion', isDefault: true, order: 0 },
        { name: 'announcements', slug: 'announcements', description: 'Band announcements', isDefault: false, order: 1 },
        { name: 'development', slug: 'development', description: 'Development discussions', isDefault: false, order: 2 },
        { name: 'frontend', slug: 'frontend', description: 'Frontend work', isDefault: false, order: 3 },
        { name: 'backend', slug: 'backend', description: 'Backend work', isDefault: false, order: 4 },
        { name: 'random', slug: 'random', description: 'Off-topic', isDefault: false, order: 5 },
      ];

      await tx.chatChannel.createMany({
        data: defaultChannels.map((ch) => ({ ...ch, bandId: newBand.id, type: 'TEXT' })),
      });

      // Create a Stage and Architecture placeholder
      await tx.stage.create({ data: { bandId: newBand.id, creatorId } });
      await tx.architecture.create({ data: { bandId: newBand.id } });
      await tx.pRD.create({ data: { bandId: newBand.id, title: `${dto.name} — PRD` } });

      this.logger.log(`Band created: ${newBand.name} (${newBand.id}) by ${creatorId}`);
      return newBand;
    });

    return band;
  }

  /**
   * Get all bands the user is a member of (or created).
   */
  async getUserBands(userId: string) {
    return this.prisma.band.findMany({
      where: {
        OR: [
          { memberships: { some: { userId } } },
          { creatorId: userId },
        ],
      },
      include: {
        memberships: {
          where: { userId },
          select: { role: true },
        },
        gitRepository: {
          select: { owner: true, name: true, fullName: true, htmlUrl: true },
        },
        _count: { select: { memberships: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get full Band details (requires membership).
   */
  async getBandById(bandId: string, requestingUserId: string) {
    const membership = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId: requestingUserId, bandId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this Band');
    }

    await this.ensureSignatureColors(bandId);

    return this.prisma.band.findUniqueOrThrow({
      where: { id: bandId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        gitRepository: true,
        _count: { select: { memberships: true } },
      },
    });
  }

  /**
   * Update band settings (Admin only).
   */
  async updateBand(bandId: string, requestingUserId: string, dto: UpdateBandDto) {
    await this.requireAdmin(bandId, requestingUserId);

    return this.prisma.band.update({
      where: { id: bandId },
      data: {
        name: dto.name,
        description: dto.description,
        iconUrl: dto.iconUrl,
      },
    });
  }

  /**
   * Join a Band via join code.
   * Adds user as MEMBER.
   */
  async joinByCode(userId: string, joinCode: string) {
    const band = await this.prisma.band.findUnique({ where: { joinCode } });
    if (!band) {
      throw new NotFoundException('Invalid join code. Please check and try again.');
    }

    const existing = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId, bandId: band.id } },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this Band');
    }

    const signatureColor = await this.nextColorForBand(band.id);
    const membership = await this.prisma.bandMembership.create({
      data: { userId, bandId: band.id, role: BandMemberRole.MEMBER, signatureColor },
    });

    this.logger.log(`User ${userId} joined Band ${band.name}`);
    return { band, membership };
  }

  /**
   * Regenerate the Band join code (Admin only).
   */
  async regenerateJoinCode(bandId: string, requestingUserId: string) {
    await this.requireAdmin(bandId, requestingUserId);
    const joinCode = generateJoinCode();
    return this.prisma.band.update({
      where: { id: bandId },
      data: { joinCode },
      select: { joinCode: true },
    });
  }

  /**
   * Get Band members.
   */
  async getBandMembers(bandId: string, requestingUserId: string) {
    await this.requireMembership(bandId, requestingUserId);

    await this.ensureSignatureColors(bandId);

    return this.prisma.bandMembership.findMany({
      where: { bandId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  /**
   * Compute the next free signature color for a new member of this Band.
   */
  async nextColorForBand(bandId: string): Promise<string> {
    const members = await this.prisma.bandMembership.findMany({
      where: { bandId },
      select: { signatureColor: true },
    });
    return nextSignatureColor(members.map((m) => m.signatureColor));
  }

  /**
   * Idempotent backfill for legacy memberships: assigns a signature color to
   * any member that does not have one yet, preserving existing colors.
   */
  async ensureSignatureColors(bandId: string) {
    const members = await this.prisma.bandMembership.findMany({
      where: { bandId },
      select: { id: true, signatureColor: true },
      orderBy: { joinedAt: 'asc' },
    });

    const taken = new Set(
      members
        .map((m) => m.signatureColor?.toLowerCase())
        .filter((c): c is string => typeof c === 'string'),
    );

    const updates: Promise<unknown>[] = [];
    for (const member of members) {
      if (!member.signatureColor) {
        const color = nextSignatureColor([...taken]);
        taken.add(color.toLowerCase());
        updates.push(
          this.prisma.bandMembership.update({
            where: { id: member.id },
            data: { signatureColor: color },
          }),
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      this.logger.log(`Assigned ${updates.length} signature color(s) in Band ${bandId}`);
    }
  }

  /**
   * Update a member's signature color. A member may change their own color;
   * Band Admins may change any member's. Colors are unique per Band.
   */
  async updateSignatureColor(
    bandId: string,
    requestingUserId: string,
    targetUserId: string,
    color: string,
  ) {
    const requester = await this.requireMembership(bandId, requestingUserId);
    if (requestingUserId !== targetUserId && requester.role !== BandMemberRole.ADMIN) {
      throw new ForbiddenException('You can only change your own signature color');
    }

    const target = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId: targetUserId, bandId } },
    });
    if (!target) {
      throw new NotFoundException('Member not found in this Band');
    }

    const conflict = await this.prisma.bandMembership.findFirst({
      where: {
        bandId,
        signatureColor: color,
        NOT: { userId: targetUserId },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('That signature color is already taken in this Band');
    }

    return this.prisma.bandMembership.update({
      where: { id: target.id },
      data: { signatureColor: color },
    });
  }

  /**
   * Update a member's role (Admin only).
   */
  async updateMemberRole(
    bandId: string,
    requestingUserId: string,
    targetUserId: string,
    role: BandMemberRole,
  ) {
    await this.requireAdmin(bandId, requestingUserId);

    // Prevent removing the last admin
    if (role !== BandMemberRole.ADMIN) {
      const adminCount = await this.prisma.bandMembership.count({
        where: { bandId, role: BandMemberRole.ADMIN },
      });
      const targetIsAdmin = await this.prisma.bandMembership.findFirst({
        where: { bandId, userId: targetUserId, role: BandMemberRole.ADMIN },
      });
      if (adminCount === 1 && targetIsAdmin) {
        throw new ForbiddenException('Cannot remove the last Band Admin');
      }
    }

    return this.prisma.bandMembership.update({
      where: { userId_bandId: { userId: targetUserId, bandId } },
      data: { role },
    });
  }

  /**
   * Delete a Band and all associated data (Admin only).
   * Note: Friday Core cannot be deleted.
   */
  async deleteBand(bandId: string, requestingUserId: string) {
    const band = await this.prisma.band.findUnique({
      where: { id: bandId },
    });
    if (!band) {
      throw new NotFoundException('Band not found');
    }

    if (band.slug === 'friday-core' || band.name.toLowerCase() === 'friday core') {
      throw new ForbiddenException('Friday Core workspace is protected and cannot be deleted');
    }

    await this.requireAdmin(bandId, requestingUserId);

    return this.prisma.$transaction(async (tx) => {
      // Clean up relations without automatic foreign key CASCADE if any
      await tx.notification.deleteMany({ where: { bandId } });
      await tx.projectRelationship.deleteMany({ where: { bandId } });
      await tx.aiJob.deleteMany({ where: { bandId } });

      return tx.band.delete({
        where: { id: bandId },
      });
    });
  }

  /**
   * Remove a member from a Band (Admin only).
   */
  async removeMember(bandId: string, requestingUserId: string, targetUserId: string) {
    await this.requireAdmin(bandId, requestingUserId);

    if (requestingUserId === targetUserId) {
      throw new ForbiddenException('Use the leave endpoint to leave a Band yourself');
    }

    return this.prisma.bandMembership.delete({
      where: { userId_bandId: { userId: targetUserId, bandId } },
    });
  }

  // ─── Authorization helpers ────────────────────────────────────────────────────

  async requireMembership(bandId: string, userId: string) {
    const membership = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId, bandId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this Band');
    }
    return membership;
  }

  async requireAdmin(bandId: string, userId: string) {
    const membership = await this.requireMembership(bandId, userId);
    if (membership.role !== BandMemberRole.ADMIN) {
      throw new ForbiddenException('Only Band Admins can perform this action');
    }
    return membership;
  }

  async isMember(bandId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId, bandId } },
    });
    return !!membership;
  }

  async isAdmin(bandId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId, bandId } },
    });
    return membership?.role === BandMemberRole.ADMIN;
  }
}
