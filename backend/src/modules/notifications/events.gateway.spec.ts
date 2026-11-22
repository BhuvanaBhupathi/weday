import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventsGateway } from './events.gateway';
import { fallbackSignatureColor } from '@friday/types';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let mockPrisma: any;
  let mockServer: any;

  function makeSocket(userId?: string): any {
    return {
      id: `socket-${userId ?? 'anon'}`,
      data: userId ? { userId, username: userId } : {},
      join: vi.fn(),
      leave: vi.fn(),
    };
  }

  function mockMembership(signatureColor: string | null, username = 'ada') {
    mockPrisma.bandMembership.findUnique.mockResolvedValue({
      signatureColor,
      user: { username, displayName: `Display ${username}`, avatarUrl: `https://cdn/${username}.png` },
    });
  }

  beforeEach(() => {
    mockPrisma = {
      bandMembership: { findUnique: vi.fn() },
      band: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
    };
    mockServer = { to: vi.fn(() => ({ emit: vi.fn() })) };
    gateway = new EventsGateway({} as any, { get: () => 'secret' } as any, mockPrisma);
    (gateway as any).server = mockServer;
  });

  function lastBandEmit() {
    const toCall = mockServer.to.mock.calls.at(-1);
    const emitter = mockServer.to.mock.results.at(-1)?.value;
    return { room: toCall?.[0], emit: emitter?.emit };
  }

  // ─── join:band ────────────────────────────────────────────────────────────

  it('rejects unauthenticated sockets', async () => {
    const result = await gateway.handleJoinBand(makeSocket(), { bandId: 'band-1' });
    expect(result.status).toBe('error');
    expect(mockServer.to).not.toHaveBeenCalled();
  });

  it('rejects non-members without joining the room or emitting presence', async () => {
    mockPrisma.bandMembership.findUnique.mockResolvedValue(null);
    mockPrisma.band.findUnique.mockResolvedValue({ id: 'band-1', creatorId: 'someone-else' });

    const client = makeSocket('u1');
    const result = await gateway.handleJoinBand(client, { bandId: 'band-1' });

    expect(result.status).toBe('error');
    expect(client.join).not.toHaveBeenCalled();
    expect(mockServer.to).not.toHaveBeenCalled();
  });

  it('joins members and broadcasts rich presence (name, avatar, signature color)', async () => {
    mockMembership('#4dabf7', 'ada');

    const client = makeSocket('u1');
    const result = await gateway.handleJoinBand(client, { bandId: 'band-1' });

    expect(result.status).toBe('joined');
    expect(client.join).toHaveBeenCalledWith('band:band-1');
    const { room, emit } = lastBandEmit();
    expect(room).toBe('band:band-1');
    expect(emit).toHaveBeenCalledWith('canvas:presence', {
      bandId: 'band-1',
      members: [
        {
          userId: 'u1',
          username: 'ada',
          displayName: 'Display ada',
          avatarUrl: 'https://cdn/ada.png',
          color: '#4dabf7',
        },
      ],
    });
  });

  it('falls back to a deterministic color when no signature color is set', async () => {
    mockMembership(null, 'ada');

    await gateway.handleJoinBand(makeSocket('u1'), { bandId: 'band-1' });

    const { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith(
      'canvas:presence',
      expect.objectContaining({
        members: [expect.objectContaining({ color: fallbackSignatureColor('u1') })],
      }),
    );
  });

  it('treats the band creator as a member even without a membership row', async () => {
    mockPrisma.bandMembership.findUnique.mockResolvedValue(null);
    mockPrisma.band.findUnique.mockResolvedValue({ id: 'band-1', creatorId: 'u1' });
    mockPrisma.user.findUnique.mockResolvedValue({
      username: 'founder',
      displayName: 'Founder',
      avatarUrl: null,
    });

    const result = await gateway.handleJoinBand(makeSocket('u1'), { bandId: 'band-1' });

    expect(result.status).toBe('joined');
  });

  // ─── canvas:cursor ────────────────────────────────────────────────────────

  it('relays member cursors with their verified profile', async () => {
    mockMembership('#51cf66', 'grace');
    await gateway.handleJoinBand(makeSocket('u1'), { bandId: 'band-1' });

    // A second socket of the same (authenticated) user sends coordinates.
    gateway.handleCanvasCursor(makeSocket('u1'), {
      bandId: 'band-1',
      pageId: 'page-1',
      x: 10.4,
      y: -20.6,
    });

    const { room, emit } = lastBandEmit();
    expect(room).toBe('band:band-1');
    expect(emit).toHaveBeenCalledWith('canvas:cursor', {
      bandId: 'band-1',
      pageId: 'page-1',
      x: 10,
      y: -21,
      userId: 'u1',
      name: 'Display grace',
      color: '#51cf66',
      avatarUrl: 'https://cdn/grace.png',
    });
  });

  it('accepts null coordinates (pointer left the canvas)', async () => {
    mockMembership('#51cf66', 'grace');
    await gateway.handleJoinBand(makeSocket('u1'), { bandId: 'band-1' });

    gateway.handleCanvasCursor(makeSocket('u1'), {
      bandId: 'band-1',
      pageId: 'page-1',
      x: null,
      y: null,
    });

    const { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith(
      'canvas:cursor',
      expect.objectContaining({ x: null, y: null }),
    );
  });

  it('ignores cursors from users who never joined the band room', () => {
    const callsBefore = mockServer.to.mock.calls.length;
    gateway.handleCanvasCursor(makeSocket('stranger'), {
      bandId: 'band-1',
      pageId: 'page-1',
      x: 0,
      y: 0,
    });
    expect(mockServer.to.mock.calls.length).toBe(callsBefore);
  });

  // ─── canvas:node-lock ─────────────────────────────────────────────────────

  async function joinBoth() {
    mockMembership('#51cf66', 'grace');
    await gateway.handleJoinBand(makeSocket('u1'), { bandId: 'band-1' });
    // Second member (u2) with a different profile
    mockPrisma.bandMembership.findUnique.mockResolvedValue({
      signatureColor: '#ffa94d',
      user: { username: 'alan', displayName: 'Alan Turing', avatarUrl: null },
    });
    await gateway.handleJoinBand(makeSocket('u2'), { bandId: 'band-1' });
  }

  it('acquires a node lock and broadcasts the lock set with the owner profile', async () => {
    await joinBoth();

    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });

    const { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith('canvas:node-locks', {
      bandId: 'band-1',
      locks: [
        {
          nodeId: 'node-1',
          userId: 'u1',
          name: 'Display grace',
          color: '#51cf66',
          avatarUrl: 'https://cdn/grace.png',
        },
      ],
    });
  });

  it('refuses to let a second member steal an existing lock', async () => {
    await joinBoth();
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });

    gateway.handleNodeLock(makeSocket('u2'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });

    const { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith(
      'canvas:node-locks',
      expect.objectContaining({
        locks: [expect.objectContaining({ nodeId: 'node-1', userId: 'u1' })],
      }),
    );
  });

  it('lets each member lock a different node', async () => {
    await joinBoth();
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });
    gateway.handleNodeLock(makeSocket('u2'), {
      bandId: 'band-1',
      nodeId: 'node-2',
      acquire: true,
    });

    const { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith(
      'canvas:node-locks',
      expect.objectContaining({
        locks: [
          expect.objectContaining({ nodeId: 'node-1', userId: 'u1' }),
          expect.objectContaining({ nodeId: 'node-2', userId: 'u2' }),
        ],
      }),
    );
  });

  it('ignores lock messages without an explicit node id (releases must name the node)', async () => {
    await joinBoth();
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });
    const callsBefore = mockServer.to.mock.calls.length;
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: null,
      acquire: false,
    });
    // No broadcast: a null-id release is rejected so a stale client can't
    // wipe a lock held by another tab of the same user.
    expect(mockServer.to.mock.calls.length).toBe(callsBefore);
  });

  it('releases a lock only for its owner and broadcasts the empty set', async () => {
    await joinBoth();
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });

    // u2 cannot release u1's lock
    gateway.handleNodeLock(makeSocket('u2'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: false,
    });
    let { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith(
      'canvas:node-locks',
      expect.objectContaining({ locks: [expect.objectContaining({ userId: 'u1' })] }),
    );

    // u1 releases it
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: false,
    });
    ({ emit } = lastBandEmit());
    expect(emit).toHaveBeenCalledWith('canvas:node-locks', {
      bandId: 'band-1',
      locks: [],
    });
  });

  it('releases a member locks when their socket disconnects', async () => {
    await joinBoth();
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });

    const client = makeSocket('u1');
    gateway.handleDisconnect(client);

    const { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith('canvas:node-locks', {
      bandId: 'band-1',
      locks: [],
    });
  });

  it('releases a member locks when they leave the band', async () => {
    await joinBoth();
    gateway.handleNodeLock(makeSocket('u1'), {
      bandId: 'band-1',
      nodeId: 'node-1',
      acquire: true,
    });

    const client = makeSocket('u1');
    await gateway.handleLeaveBand(client, { bandId: 'band-1' });

    const { emit } = lastBandEmit();
    expect(emit).toHaveBeenCalledWith('canvas:node-locks', {
      bandId: 'band-1',
      locks: [],
    });
  });
});
