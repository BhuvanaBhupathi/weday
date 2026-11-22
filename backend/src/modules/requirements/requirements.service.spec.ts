import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequirementsService } from './requirements.service';
import { RequirementStatus, Priority, ChangeState } from '@prisma/client';

describe('RequirementsService', () => {
  let service: RequirementsService;
  let mockPrisma: any;
  let mockActivity: any;
  let mockEventsGateway: any;

  beforeEach(() => {
    mockPrisma = {
      pRD: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      requirement: {
        count: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    mockActivity = {
      record: vi.fn(),
    };
    mockEventsGateway = {
      emitToBand: vi.fn(),
    };
    service = new RequirementsService(mockPrisma, mockActivity, mockEventsGateway);
  });

  it('should auto-generate stable ID FR-001 for first requirement in band', async () => {
    mockPrisma.pRD.findUnique.mockResolvedValue({ id: 'prd-1', bandId: 'band-1' });
    mockPrisma.requirement.count.mockResolvedValue(0);
    mockPrisma.requirement.findUnique.mockResolvedValue(null);
    mockPrisma.requirement.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'req-1', ...data }),
    );

    const result = await service.createRequirement('band-1', 'user-1', {
      title: 'Auth Flow',
      description: 'Support GitHub OAuth and session tokens',
    });

    expect(result.identifier).toBe('FR-001');
    expect(result.status).toBe(RequirementStatus.DRAFT);
    expect(result.changeState).toBe(ChangeState.NEW);
    expect(mockEventsGateway.emitToBand).toHaveBeenCalledWith(
      'band-1',
      'requirement:created',
      expect.objectContaining({ identifier: 'FR-001' }),
    );
  });

  it('should auto-generate stable ID FR-008 when 7 requirements exist', async () => {
    mockPrisma.pRD.findUnique.mockResolvedValue({ id: 'prd-1', bandId: 'band-1' });
    mockPrisma.requirement.count.mockResolvedValue(7);
    mockPrisma.requirement.findUnique.mockResolvedValue(null);
    mockPrisma.requirement.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'req-8', ...data }),
    );

    const result = await service.createRequirement('band-1', 'user-1', {
      title: 'Realtime presence',
      description: 'Display avatars and cursors',
    });

    expect(result.identifier).toBe('FR-008');
  });

  it('should update existing requirement and track changeState as MODIFIED', async () => {
    const existing = {
      id: 'req-1',
      bandId: 'band-1',
      identifier: 'FR-001',
      title: 'Original Title',
      description: 'Original Desc',
      changeState: ChangeState.UNCHANGED,
    };
    mockPrisma.requirement.findFirst.mockResolvedValue(existing);
    mockPrisma.requirement.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...existing, ...data }),
    );

    const result = await service.updateRequirement('band-1', 'req-1', 'user-1', {
      title: 'Updated Title',
    });

    expect(result.title).toBe('Updated Title');
    expect(result.changeState).toBe(ChangeState.MODIFIED);
    expect(mockEventsGateway.emitToBand).toHaveBeenCalledWith(
      'band-1',
      'requirement:updated',
      expect.objectContaining({ title: 'Updated Title' }),
    );
  });
});
