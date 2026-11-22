import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DecisionsService } from './decisions.service';
import { DecisionStatus, ChangeRequestStatus, ChangeState } from '@prisma/client';

describe('DecisionsService', () => {
  let service: DecisionsService;
  let mockPrisma: any;
  let mockActivity: any;
  let mockEventsGateway: any;

  beforeEach(() => {
    mockPrisma = {
      decision: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      question: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      assumption: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      changeRequest: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      requirement: {
        update: vi.fn(),
      },
      discussion: {
        findFirst: vi.fn(),
      },
    };
    mockActivity = {
      record: vi.fn(),
    };
    mockEventsGateway = {
      emitToBand: vi.fn(),
    };
    service = new DecisionsService(mockPrisma, mockActivity, mockEventsGateway);
  });

  it('should auto-generate stable ID DEC-001 and emit decision:created', async () => {
    mockPrisma.decision.count.mockResolvedValue(0);
    mockPrisma.decision.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'dec-1', ...data }),
    );

    const res = await service.createDecision('band-1', 'user-1', {
      title: 'Use PostgreSQL and Prisma',
      rationale: 'Mature relational model and strong types',
      status: DecisionStatus.ACCEPTED,
    });

    expect(res.identifier).toBe('DEC-001');
    expect(res.status).toBe(DecisionStatus.ACCEPTED);
    expect(mockEventsGateway.emitToBand).toHaveBeenCalledWith(
      'band-1',
      'decision:created',
      expect.objectContaining({ identifier: 'DEC-001' }),
    );
  });

  it('should generate stable ID CR-001 for change request and mark requirement MODIFIED when approved', async () => {
    mockPrisma.changeRequest.count.mockResolvedValue(0);
    mockPrisma.changeRequest.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'cr-1', ...data }),
    );

    const cr = await service.createChangeRequest('band-1', 'user-1', {
      title: 'Switch to passwordless login',
      description: 'Customer requested magic link authentication',
      targetRequirementId: 'req-1',
    });

    expect(cr.identifier).toBe('CR-001');

    mockPrisma.changeRequest.findUnique.mockResolvedValue({
      id: 'cr-1',
      bandId: 'band-1',
      targetRequirementId: 'req-1',
    });
    mockPrisma.changeRequest.update.mockResolvedValue({
      id: 'cr-1',
      status: ChangeRequestStatus.APPROVED,
    });

    await service.reviewChangeRequest('band-1', 'cr-1', 'user-2', {
      status: ChangeRequestStatus.APPROVED,
      reviewNotes: 'Approved for Sprint 2',
    });

    expect(mockPrisma.requirement.update).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { changeState: ChangeState.MODIFIED },
    });
  });
});
