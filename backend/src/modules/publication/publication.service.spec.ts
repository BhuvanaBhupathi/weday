import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicationService } from './publication.service';

describe('PublicationService', () => {
  let service: PublicationService;
  let mockPrisma: any;
  let mockEventsGateway: any;

  beforeEach(() => {
    mockPrisma = {
      clientPublication: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      clientPublicationVersion: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      band: {
        findUnique: vi.fn(),
      },
      pRD: {
        findUnique: vi.fn(),
      },
      requirement: {
        findMany: vi.fn(),
      },
      milestone: {
        findMany: vi.fn(),
      },
      decision: {
        findMany: vi.fn(),
      },
      changeRequest: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      concern: {
        findMany: vi.fn(),
      },
    };
    mockEventsGateway = {
      emitToBand: vi.fn(),
    };
    service = new PublicationService(mockPrisma, mockEventsGateway);
  });

  it('should auto-initialize publication config if none exists', async () => {
    mockPrisma.clientPublication.findUnique.mockResolvedValueOnce(null);
    mockPrisma.band.findUnique.mockResolvedValue({ id: 'band-1', name: 'Core Team', slug: 'core-team' });
    mockPrisma.clientPublication.create.mockResolvedValue({
      id: 'pub-1',
      bandId: 'band-1',
      publicSlug: 'core-team',
      versions: [],
    });

    const res = await service.getPublication('band-1');
    expect(res.publicSlug).toBe('core-team');
    expect(mockPrisma.clientPublication.create).toHaveBeenCalled();
  });

  it('should publish a snapshot with incremented version number and emit publication:published', async () => {
    mockPrisma.clientPublication.findUnique.mockResolvedValue({
      id: 'pub-1',
      bandId: 'band-1',
      publicSlug: 'core-team',
      versions: [{ versionNumber: 1 }],
    });
    mockPrisma.band.findUnique.mockResolvedValue({ name: 'Friday Core', slug: 'friday-core' });
    mockPrisma.pRD.findUnique.mockResolvedValue({ title: 'PRD', versions: [{ content: '# PRD' }] });
    mockPrisma.requirement.findMany.mockResolvedValue([{ identifier: 'FR-001', title: 'Auth' }]);
    mockPrisma.milestone.findMany.mockResolvedValue([{ id: 'ms-1', title: 'Sprint 1', tasks: [] }]);
    mockPrisma.decision.findMany.mockResolvedValue([]);
    mockPrisma.changeRequest.findMany.mockResolvedValue([]);
    mockPrisma.concern.findMany.mockResolvedValue([]);

    mockPrisma.clientPublicationVersion.create.mockResolvedValue({
      id: 'ver-2',
      versionNumber: 2,
      title: 'Release 2.0 Snapshot',
    });
    mockPrisma.clientPublication.update.mockResolvedValue({});

    const result = await service.publishSnapshot('band-1', 'user-1', {
      title: 'Release 2.0 Snapshot',
    });

    expect(result.versionNumber).toBe(2);
    expect(mockEventsGateway.emitToBand).toHaveBeenCalledWith(
      'band-1',
      'publication:published',
      expect.objectContaining({ versionNumber: 2 }),
    );
  });
});
