import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { EventsGateway } from '../notifications/events.gateway';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementStatus, ChangeState, Priority } from '@prisma/client';

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Get all requirements for a Band with optional filtering
   */
  async getBandRequirements(bandId: string, status?: RequirementStatus, search?: string) {
    return this.prisma.requirement.findMany({
      where: {
        bandId,
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { identifier: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: {
          select: { decisions: true, changeRequests: true },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Get single requirement detail including linked decisions & change requests
   */
  async getRequirement(bandId: string, reqId: string) {
    const requirement = await this.prisma.requirement.findFirst({
      where: {
        id: reqId,
        bandId,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        decisions: {
          include: {
            decidedBy: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        changeRequests: {
          include: {
            author: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${reqId} not found in this Band`);
    }

    return requirement;
  }

  /**
   * Create a requirement with automated stable ID generation (e.g. FR-001)
   */
  async createRequirement(bandId: string, userId: string, dto: CreateRequirementDto) {
    // 1. Ensure Band and PRD exist
    let prd = await this.prisma.pRD.findUnique({ where: { bandId } });
    if (!prd) {
      prd = await this.prisma.pRD.create({
        data: { bandId, title: 'Product Requirements Document' },
      });
    }

    // 2. Compute stable identifier
    let identifier = dto.identifier?.trim();
    if (!identifier) {
      const count = await this.prisma.requirement.count({ where: { bandId } });
      identifier = `FR-${String(count + 1).padStart(3, '0')}`;
    }

    // 3. Ensure identifier is unique per Band
    const existing = await this.prisma.requirement.findUnique({
      where: { bandId_identifier: { bandId, identifier } },
    });
    if (existing) {
      throw new ConflictException(`Requirement with identifier ${identifier} already exists in this Band`);
    }

    // 4. Create requirement
    const requirement = await this.prisma.requirement.create({
      data: {
        identifier,
        bandId,
        prdId: prd.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        priority: dto.priority ?? Priority.MEDIUM,
        status: dto.status ?? RequirementStatus.DRAFT,
        changeState: dto.changeState ?? ChangeState.NEW,
        acceptanceCriteria: dto.acceptanceCriteria ?? [],
        order: dto.order ?? 0,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // 5. Audit activity
    await this.activityService.record({
      bandId,
      userId,
      type: 'PRD_UPDATED',
      payload: {
        action: 'REQUIREMENT_CREATED',
        identifier: requirement.identifier,
        title: requirement.title,
      },
      relatedArtifactType: 'REQUIREMENT',
      relatedArtifactId: requirement.id,
    });

    // 6. Broadcast realtime event
    this.eventsGateway.emitToBand(bandId, 'requirement:created', requirement);

    return requirement;
  }

  /**
   * Update an existing requirement
   */
  async updateRequirement(
    bandId: string,
    reqId: string,
    userId: string,
    dto: UpdateRequirementDto,
  ) {
    const existing = await this.prisma.requirement.findFirst({
      where: { id: reqId, bandId },
    });
    if (!existing) {
      throw new NotFoundException(`Requirement ${reqId} not found in this Band`);
    }

    // Detect if content changed to automatically update changeState if not explicitly passed
    let changeState = dto.changeState;
    if (!changeState) {
      const contentChanged =
        (dto.title && dto.title !== existing.title) ||
        (dto.description && dto.description !== existing.description) ||
        (dto.acceptanceCriteria &&
          JSON.stringify(dto.acceptanceCriteria) !== JSON.stringify(existing.acceptanceCriteria));

      if (contentChanged && existing.changeState !== ChangeState.NEW) {
        changeState = ChangeState.MODIFIED;
      }
    }

    const updated = await this.prisma.requirement.update({
      where: { id: reqId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        priority: dto.priority,
        status: dto.status,
        changeState,
        acceptanceCriteria: dto.acceptanceCriteria,
        order: dto.order,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Audit activity
    await this.activityService.record({
      bandId,
      userId,
      type: 'PRD_UPDATED',
      payload: {
        action: 'REQUIREMENT_UPDATED',
        identifier: updated.identifier,
        title: updated.title,
        status: updated.status,
        changeState: updated.changeState,
      },
      relatedArtifactType: 'REQUIREMENT',
      relatedArtifactId: updated.id,
    });

    // Broadcast realtime event
    this.eventsGateway.emitToBand(bandId, 'requirement:updated', updated);

    return updated;
  }

  /**
   * Delete a requirement
   */
  async deleteRequirement(bandId: string, reqId: string, userId: string) {
    const existing = await this.prisma.requirement.findFirst({
      where: { id: reqId, bandId },
    });
    if (!existing) {
      throw new NotFoundException(`Requirement ${reqId} not found in this Band`);
    }

    await this.prisma.requirement.delete({ where: { id: reqId } });

    await this.activityService.record({
      bandId,
      userId,
      type: 'PRD_UPDATED',
      payload: {
        action: 'REQUIREMENT_DELETED',
        identifier: existing.identifier,
        title: existing.title,
      },
      relatedArtifactType: 'REQUIREMENT',
      relatedArtifactId: reqId,
    });

    this.eventsGateway.emitToBand(bandId, 'requirement:deleted', { id: reqId, identifier: existing.identifier });

    return { success: true, identifier: existing.identifier };
  }
}
