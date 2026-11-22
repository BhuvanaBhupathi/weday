import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CanvasService } from './canvas.service';
import type { CanvasSnapshot } from './engine/canvas-diff';

function makeSnapshot(overrides: Partial<CanvasSnapshot> = {}): CanvasSnapshot {
  return {
    pages: [
      { id: 'page-1', name: 'Overview', slug: 'overview', description: null, parentPageId: null, order: 0 },
    ],
    nodes: [
      {
        id: 'n1', pageId: 'page-1', type: 'TEXT', title: 'Problem', x: 0, y: 0,
        width: 280, height: 160, rotation: 0, zIndex: 0, data: {}, sourceRef: null,
      },
    ],
    edges: [],
    metadata: { savedAt: 't' },
    ...overrides,
  };
}

describe('CanvasService', () => {
  let service: CanvasService;
  let mockPrisma: any;
  let mockEvents: any;

  beforeEach(() => {
    mockPrisma = {
      band: { findUnique: vi.fn() },
      canvasPage: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
        aggregate: vi.fn(),
      },
      canvasNode: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
      canvasEdge: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
      canvasDraft: { findMany: vi.fn(), upsert: vi.fn() },
      canvasVersion: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), updateMany: vi.fn() },
      versionChange: { createMany: vi.fn() },
      gitRepository: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    };
    // Execute the transaction callback against the same mock.
    mockPrisma.$transaction.mockImplementation((cb: (tx: any) => Promise<any>) => cb(mockPrisma));
    mockEvents = { emitToBand: vi.fn() };
    service = new CanvasService(mockPrisma, mockEvents);
  });

  function mockMembership(role: string, creatorId = 'other-user') {
    mockPrisma.band.findUnique.mockResolvedValue({
      id: 'band-1',
      creatorId,
      memberships: [{ role }],
    });
  }

  // ─── Authorization ─────────────────────────────────────────────────────────

  it('rejects users who are not band members', async () => {
    mockPrisma.band.findUnique.mockResolvedValue({ id: 'band-1', creatorId: 'u2', memberships: [] });
    await expect(service.getCanvas('band-1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('lets VIEWER read but not write page state', async () => {
    mockMembership('VIEWER');
    mockPrisma.canvasPage.findMany.mockResolvedValue([
      { id: 'page-1', name: 'Overview', slug: 'overview', parentPageId: null, order: 0, description: null },
    ]);
    mockPrisma.canvasNode.findMany.mockResolvedValue([]);
    mockPrisma.canvasEdge.findMany.mockResolvedValue([]);
    mockPrisma.canvasDraft.findMany.mockResolvedValue([]);
    mockPrisma.gitRepository.findUnique.mockResolvedValue(null);

    await expect(service.getCanvas('band-1', 'u1')).resolves.toMatchObject({ role: 'VIEWER' });

    mockPrisma.canvasPage.findFirst.mockResolvedValue({ id: 'page-1' });
    await expect(
      service.syncPageState('band-1', 'u1', 'page-1', { nodes: [], edges: [] } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks MEMBER from renaming versions (ADMIN only)', async () => {
    mockMembership('MEMBER');
    await expect(
      service.renameVersion('band-1', 'u1', 'v1', { name: 'x' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // ─── Canvas state ──────────────────────────────────────────────────────────

  it('auto-creates the default Overview page on first access', async () => {
    mockMembership('MEMBER');
    mockPrisma.canvasPage.findMany.mockResolvedValue([]);
    mockPrisma.canvasPage.create.mockResolvedValue({ id: 'page-1', name: 'Overview' });
    mockPrisma.canvasNode.findMany.mockResolvedValue([]);
    mockPrisma.canvasEdge.findMany.mockResolvedValue([]);
    mockPrisma.canvasDraft.findMany.mockResolvedValue([]);
    mockPrisma.gitRepository.findUnique.mockResolvedValue(null);

    const state = await service.getCanvas('band-1', 'u1');
    expect(mockPrisma.canvasPage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Overview', slug: 'overview' }) }),
    );
    expect(state.pages).toHaveLength(1);
  });

  it('syncPageState replaces the page state atomically and bumps the draft revision', async () => {
    mockMembership('MEMBER');
    mockPrisma.canvasPage.findFirst.mockResolvedValue({ id: 'page-1' });
    mockPrisma.canvasDraft.upsert.mockResolvedValue({ revision: 4, savedAt: new Date('2026-09-13T00:00:00Z') });

    const result = await service.syncPageState(
      'band-1',
      'u1',
      'page-1',
      {
        nodes: [
          { id: 'n1', type: 'TEXT', title: 'A', x: 1, y: 2, data: { body: 'hi' } },
          { id: 'n2', type: 'CHECKLIST', title: 'B', x: 10, y: 20 },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2', label: null, relation: null, data: {} }],
        viewport: { x: 0, y: 0, zoom: 1 },
      } as any,
    );

    expect(mockPrisma.canvasNode.deleteMany).toHaveBeenCalledWith({ where: { pageId: 'page-1' } });
    expect(mockPrisma.canvasNode.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ id: 'n1', bandId: 'band-1', pageId: 'page-1', title: 'A' }),
        expect.objectContaining({ id: 'n2', bandId: 'band-1', pageId: 'page-1' }),
      ],
    });
    expect(mockPrisma.canvasEdge.createMany).toHaveBeenCalledTimes(1);
    expect(result.revision).toBe(4);
    // The broadcast carries the full page state so other members apply it
    // over the websocket instead of re-fetching.
    expect(mockEvents.emitToBand).toHaveBeenCalledWith(
      'band-1',
      'canvas:page-state-synced',
      expect.objectContaining({
        pageId: 'page-1',
        updatedBy: 'u1',
        nodes: [
          expect.objectContaining({ id: 'n1' }),
          expect.objectContaining({ id: 'n2' }),
        ],
        edges: [expect.objectContaining({ id: 'e1' })],
      }),
    );
  });

  // ─── Versions ──────────────────────────────────────────────────────────────

  it('saveVersion stores an immutable snapshot, computes changes vs the previous version, and numbers sequentially', async () => {
    mockMembership('MEMBER');
    const currentSnapshot = makeSnapshot({
      nodes: [
        {
          id: 'n1', pageId: 'page-1', type: 'TEXT', title: 'Problem', x: 0, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 0, data: {}, sourceRef: null,
        },
        {
          id: 'n2', pageId: 'page-1', type: 'CHECKLIST', title: 'Auth', x: 300, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 1, data: {}, sourceRef: null,
        },
      ],
    });

    mockPrisma.canvasPage.findMany.mockResolvedValue(currentSnapshot.pages);
    mockPrisma.canvasNode.findMany.mockResolvedValue(currentSnapshot.nodes);
    mockPrisma.canvasEdge.findMany.mockResolvedValue(currentSnapshot.edges);

    const prevVersion = {
      id: 'v1',
      versionNumber: 1,
      snapshot: makeSnapshot(), // only "Problem"
    };
    mockPrisma.canvasVersion.findFirst.mockResolvedValue(prevVersion);
    mockPrisma.canvasVersion.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'v2', ...data }),
    );
    mockPrisma.canvasVersion.findFirst
      .mockResolvedValueOnce(prevVersion)
      .mockResolvedValueOnce({
        id: 'v2', versionNumber: 2, name: 'Version 2', description: null,
        snapshot: currentSnapshot, changes: [],
        creator: { id: 'u1', displayName: 'Poulami', avatarUrl: null },
        parent: prevVersion,
      });

    const version = await service.saveVersion('band-1', 'u1', { name: 'v2 test' } as any);

    const createCall = mockPrisma.canvasVersion.create.mock.calls[0][0].data;
    expect(createCall.versionNumber).toBe(2);
    expect(createCall.parentVersionId).toBe('v1');
    expect(createCall.name).toBe('v2 test');
    expect(createCall.snapshot.nodes).toHaveLength(2);
    expect(createCall.changeSummary).toBe('1 item added');
    expect(mockPrisma.versionChange.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ changeType: 'ADDED', targetId: 'n2', targetLabel: 'Auth' })],
    });
    expect(version.versionNumber).toBe(2);
    expect(mockEvents.emitToBand).toHaveBeenCalledWith('band-1', 'canvas:version-saved', expect.objectContaining({ versionNumber: 2 }));
  });

  // ─── Restore safety (the §71 non-negotiable) ──────────────────────────────

  it('restoreVersion preserves the current draft as a pre-restore checkpoint, applies the snapshot, and never mutates history', async () => {
    mockMembership('MEMBER');

    const v2Snapshot = makeSnapshot({
      nodes: [
        {
          id: 'problem', pageId: 'page-1', type: 'TEXT', title: 'Problem', x: 0, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 0, data: {}, sourceRef: null,
        },
        {
          id: 'auth', pageId: 'page-1', type: 'TEXT', title: 'Authentication', x: 300, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 1, data: {}, sourceRef: null,
        },
        {
          id: 'db', pageId: 'page-1', type: 'TEXT', title: 'Database', x: 300, y: 300,
          width: 280, height: 160, rotation: 0, zIndex: 2, data: {}, sourceRef: null,
        },
        {
          id: 'dash', pageId: 'page-1', type: 'TEXT', title: 'Dashboard', x: 600, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 3, data: {}, sourceRef: null,
        },
      ],
    });

    const currentDraft = makeSnapshot({
      nodes: [
        {
          id: 'problem', pageId: 'page-1', type: 'TEXT', title: 'Problem', x: 0, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 0, data: {}, sourceRef: null,
        },
        {
          id: 'auth', pageId: 'page-1', type: 'TEXT', title: 'Authentication', x: 300, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 1, data: { note: 'modified' }, sourceRef: null,
        },
        // Database deleted in draft
        {
          id: 'dash', pageId: 'page-1', type: 'TEXT', title: 'Dashboard', x: 600, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 3, data: {}, sourceRef: null,
        },
        {
          id: 'pay', pageId: 'page-1', type: 'TEXT', title: 'Payments', x: 900, y: 0,
          width: 280, height: 160, rotation: 0, zIndex: 4, data: {}, sourceRef: null,
        },
      ],
    });

    const v2 = { id: 'v2', versionNumber: 2, name: 'MVP Architecture', snapshot: v2Snapshot };
    const v1 = { id: 'v1', versionNumber: 1, snapshot: makeSnapshot() };

    // tx sequence inside restoreVersion:
    //  1. findFirst version by id          → v2
    //  2. buildSnapshot (pages/nodes/edges findMany) → current draft
    //  3. findFirst latest version         → v2
    //  4. canvasVersion.create (checkpoint)
    //  5. canvasPage operations, then node/edge replacement
    mockPrisma.canvasVersion.findFirst
      .mockResolvedValueOnce(v2)
      .mockResolvedValueOnce(v2); // latest version
    mockPrisma.canvasVersion.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'v3-checkpoint', ...data }),
    );
    mockPrisma.canvasPage.findMany.mockResolvedValue(v2Snapshot.pages);
    mockPrisma.canvasNode.findMany.mockResolvedValue(currentDraft.nodes);
    mockPrisma.canvasEdge.findMany.mockResolvedValue(currentDraft.edges);
    mockPrisma.canvasPage.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.canvasPage.findFirst.mockResolvedValue(null);
    mockPrisma.canvasPage.upsert.mockResolvedValue({});
    mockPrisma.canvasNode.deleteMany.mockResolvedValue({ count: 4 });
    mockPrisma.canvasEdge.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.canvasNode.createMany.mockResolvedValue({ count: 4 });
    mockPrisma.canvasEdge.createMany.mockResolvedValue({ count: 0 });

    const frozenV2 = JSON.parse(JSON.stringify(v2Snapshot));

    const result = await service.restoreVersion('band-1', 'u1', 'v2');

    // 1. A pre-restore checkpoint of the current draft was created (v3)
    const checkpoint = mockPrisma.canvasVersion.create.mock.calls[0][0].data;
    expect(checkpoint.versionNumber).toBe(3);
    expect(checkpoint.name).toBe('Pre-restore checkpoint');
    expect(checkpoint.snapshot.nodes.map((n: any) => n.id).sort()).toEqual([
      'auth', 'dash', 'pay', 'problem',
    ]);
    expect(result.preRestoreId).toBe('v3-checkpoint');

    // 2. The live canvas was replaced with the v2 snapshot
    expect(mockPrisma.canvasNode.deleteMany).toHaveBeenCalledWith({ where: { bandId: 'band-1' } });
    const restored = mockPrisma.canvasNode.createMany.mock.calls[0][0].data;
    expect(restored.map((n: any) => n.id).sort()).toEqual(['auth', 'dash', 'db', 'problem']);

    // 3. The historical v2 snapshot was NOT mutated
    expect(v2Snapshot).toEqual(frozenV2);

    // 4. Band clients were notified
    expect(mockEvents.emitToBand).toHaveBeenCalledWith('band-1', 'canvas:restored', expect.objectContaining({ versionId: 'v2' }));
  });

  it('restoreVersion skips the checkpoint when the draft already matches the snapshot', async () => {
    mockMembership('MEMBER');
    const same = makeSnapshot();
    const v1 = { id: 'v1', versionNumber: 1, name: 'Initial', snapshot: same };

    mockPrisma.canvasVersion.findFirst.mockResolvedValue(v1);
    mockPrisma.canvasPage.findMany.mockResolvedValue(same.pages);
    mockPrisma.canvasNode.findMany.mockResolvedValue(same.nodes);
    mockPrisma.canvasEdge.findMany.mockResolvedValue(same.edges);
    mockPrisma.canvasPage.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.canvasPage.findFirst.mockResolvedValue(null);
    mockPrisma.canvasPage.upsert.mockResolvedValue({});
    mockPrisma.canvasNode.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.canvasEdge.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.canvasNode.createMany.mockResolvedValue({ count: 1 });

    const result = await service.restoreVersion('band-1', 'u1', 'v1');
    expect(mockPrisma.canvasVersion.create).not.toHaveBeenCalled();
    expect(result.preRestoreId).toBeNull();
  });

  it('throws when restoring an unknown version', async () => {
    mockMembership('MEMBER');
    mockPrisma.canvasVersion.findFirst.mockResolvedValue(null);
    await expect(service.restoreVersion('band-1', 'u1', 'nope')).rejects.toThrow(NotFoundException);
  });
});
