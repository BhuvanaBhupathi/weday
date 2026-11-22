import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { TaskStatus, ArtifactType, MilestoneStatus } from '@prisma/client';
import { EventsGateway } from '../notifications/events.gateway';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getBandTasks(bandId: string, status?: TaskStatus, milestoneId?: string) {
    return this.prisma.task.findMany({
      where: {
        bandId,
        ...(status ? { status } : {}),
        ...(milestoneId ? { milestoneId } : {}),
      },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        milestone: {
          select: { id: true, title: true, status: true, targetDate: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        milestone: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: [{ deadline: 'asc' }, { priority: 'desc' }],
    });
  }

  async createTask(bandId: string, userId: string, dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        bandId,
        creatorId: userId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        assigneeId: dto.assigneeId,
        relatedArtifactType: dto.relatedArtifactType,
        relatedArtifactId: dto.relatedArtifactId,
        milestoneId: dto.milestoneId,
      },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        milestone: {
          select: { id: true, title: true, status: true, targetDate: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'task:created', task);
    return task;
  }

  async updateTask(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const completedAt =
      dto.status === TaskStatus.DONE && task.status !== TaskStatus.DONE
        ? new Date()
        : dto.status && dto.status !== TaskStatus.DONE
        ? null
        : task.completedAt;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        assigneeId: dto.assigneeId,
        relatedArtifactType: dto.relatedArtifactType,
        relatedArtifactId: dto.relatedArtifactId,
        milestoneId: dto.milestoneId,
        completedAt,
      },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        milestone: {
          select: { id: true, title: true, status: true, targetDate: true },
        },
      },
    });

    this.eventsGateway.emitToBand(task.bandId, 'task:updated', updated);
    return updated;
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.task.delete({ where: { id: taskId } });
    this.eventsGateway.emitToBand(task.bandId, 'task:deleted', { taskId });
    return { success: true };
  }

  // ─── Milestones ─────────────────────────────────────────────────────────────

  async getBandMilestones(bandId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { bandId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            relatedArtifactId: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { targetDate: 'asc' }],
    });

    return milestones.map((m) => {
      const totalTasks = m.tasks.length;
      const completedTasks = m.tasks.filter((t) => t.status === TaskStatus.DONE).length;
      const inProgressTasks = m.tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...m,
        metrics: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          progressPercent,
        },
      };
    });
  }

  async createMilestone(bandId: string, dto: CreateMilestoneDto) {
    const milestone = await this.prisma.milestone.create({
      data: {
        bandId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        status: dto.status || MilestoneStatus.PLANNED,
        order: dto.order ?? 0,
      },
      include: {
        tasks: true,
      },
    });

    this.eventsGateway.emitToBand(bandId, 'milestone:created', milestone);
    return milestone;
  }

  async updateMilestone(milestoneId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status,
        order: dto.order,
      },
      include: {
        tasks: true,
      },
    });

    this.eventsGateway.emitToBand(milestone.bandId, 'milestone:updated', updated);
    return updated;
  }

  async deleteMilestone(milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    await this.prisma.milestone.delete({ where: { id: milestoneId } });
    this.eventsGateway.emitToBand(milestone.bandId, 'milestone:deleted', { milestoneId });
    return { success: true };
  }

  // ─── Execution Alignment Metrics ─────────────────────────────────────────────

  async getAlignmentMetrics(bandId: string) {
    const [requirements, tasks, milestones] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { bandId },
        select: { id: true, identifier: true, title: true, status: true, priority: true },
      }),
      this.prisma.task.findMany({
        where: { bandId },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          relatedArtifactType: true,
          relatedArtifactId: true,
          milestoneId: true,
        },
      }),
      this.getBandMilestones(bandId),
    ]);

    // Map tasks to requirements
    const requirementTaskMap = new Map<string, typeof tasks>();
    requirements.forEach((req) => {
      const linked = tasks.filter(
        (t) =>
          t.relatedArtifactId === req.identifier ||
          t.relatedArtifactId === req.id,
      );
      requirementTaskMap.set(req.identifier, linked);
    });

    const coveredRequirements = requirements.filter(
      (r) => (requirementTaskMap.get(r.identifier)?.length || 0) > 0,
    );
    const uncoveredRequirements = requirements.filter(
      (r) => (requirementTaskMap.get(r.identifier)?.length || 0) === 0,
    );

    const tasksByStatus = {
      TODO: tasks.filter((t) => t.status === TaskStatus.TODO).length,
      IN_PROGRESS: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      DONE: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      CANCELLED: tasks.filter((t) => t.status === TaskStatus.CANCELLED).length,
    };

    const coveragePercentage =
      requirements.length > 0
        ? Math.round((coveredRequirements.length / requirements.length) * 100)
        : 0;

    return {
      totalRequirements: requirements.length,
      coveredRequirementsCount: coveredRequirements.length,
      uncoveredRequirementsCount: uncoveredRequirements.length,
      coveragePercentage,
      tasksByStatus,
      totalTasks: tasks.length,
      uncoveredRequirements,
      milestones,
    };
  }
}

