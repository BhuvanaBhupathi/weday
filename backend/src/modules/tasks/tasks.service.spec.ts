import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TasksService } from './tasks.service';
import { TaskStatus, Priority, MilestoneStatus } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let mockPrisma: any;
  let mockEventsGateway: any;

  beforeEach(() => {
    mockPrisma = {
      task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      milestone: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      requirement: {
        findMany: vi.fn(),
      },
    };
    mockEventsGateway = {
      emitToBand: vi.fn(),
    };
    service = new TasksService(mockPrisma, mockEventsGateway);
  });

  it('should create a task linked to milestone and emit task:created', async () => {
    const createdTask = {
      id: 'task-1',
      bandId: 'band-1',
      title: 'Build API Gateway',
      priority: Priority.HIGH,
      status: TaskStatus.TODO,
      milestoneId: 'ms-1',
      creatorId: 'user-1',
    };
    mockPrisma.task.create.mockResolvedValue(createdTask);

    const result = await service.createTask('band-1', 'user-1', {
      title: 'Build API Gateway',
      priority: Priority.HIGH,
      milestoneId: 'ms-1',
    });

    expect(result.id).toBe('task-1');
    expect(result.milestoneId).toBe('ms-1');
    expect(mockEventsGateway.emitToBand).toHaveBeenCalledWith(
      'band-1',
      'task:created',
      expect.objectContaining({ title: 'Build API Gateway' }),
    );
  });

  it('should create a milestone and emit milestone:created', async () => {
    const createdMs = {
      id: 'ms-1',
      bandId: 'band-1',
      title: 'Sprint 1 - Foundation',
      status: MilestoneStatus.PLANNED,
      order: 0,
      tasks: [],
    };
    mockPrisma.milestone.create.mockResolvedValue(createdMs);

    const result = await service.createMilestone('band-1', {
      title: 'Sprint 1 - Foundation',
    });

    expect(result.id).toBe('ms-1');
    expect(mockEventsGateway.emitToBand).toHaveBeenCalledWith(
      'band-1',
      'milestone:created',
      expect.objectContaining({ title: 'Sprint 1 - Foundation' }),
    );
  });

  it('should compute alignment metrics correctly for covered and uncovered requirements', async () => {
    mockPrisma.requirement.findMany.mockResolvedValue([
      { id: 'req-1', identifier: 'FR-001', title: 'Auth Flow', status: 'APPROVED' },
      { id: 'req-2', identifier: 'FR-002', title: 'Payment Processing', status: 'DRAFT' },
    ]);
    mockPrisma.task.findMany.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Implement OAuth',
        status: TaskStatus.DONE,
        relatedArtifactId: 'FR-001',
      },
    ]);
    mockPrisma.milestone.findMany.mockResolvedValue([
      {
        id: 'ms-1',
        title: 'Sprint 1',
        tasks: [{ id: 'task-1', status: TaskStatus.DONE }],
      },
    ]);

    const metrics = await service.getAlignmentMetrics('band-1');

    expect(metrics.totalRequirements).toBe(2);
    expect(metrics.coveredRequirementsCount).toBe(1);
    expect(metrics.uncoveredRequirementsCount).toBe(1);
    expect(metrics.coveragePercentage).toBe(50);
    expect(metrics.tasksByStatus.DONE).toBe(1);
    expect(metrics.uncoveredRequirements[0].identifier).toBe('FR-002');
  });
});
