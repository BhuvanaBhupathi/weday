import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { EventsGateway } from '../notifications/events.gateway';
import {
  CreateDecisionDto,
  UpdateDecisionDto,
  PromoteDiscussionDto,
  CreateQuestionDto,
  AnswerQuestionDto,
  CreateAssumptionDto,
  ValidateAssumptionDto,
  CreateChangeRequestDto,
  ReviewChangeRequestDto,
} from './dto/decision.dto';
import {
  DecisionStatus,
  ChangeRequestStatus,
  ChangeState,
  ActivityType,
} from '@prisma/client';

@Injectable()
export class DecisionsService {
  private readonly logger = new Logger(DecisionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─── DECISIONS ─────────────────────────────────────────────────────────────

  async getBandDecisions(bandId: string, status?: DecisionStatus) {
    return this.prisma.decision.findMany({
      where: {
        bandId,
        ...(status ? { status } : {}),
      },
      include: {
        decidedBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        requirement: {
          select: { id: true, identifier: true, title: true, status: true },
        },
        sourceDiscussion: {
          select: { id: true, title: true, filePath: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDecision(bandId: string, userId: string, dto: CreateDecisionDto) {
    const count = await this.prisma.decision.count({ where: { bandId } });
    const identifier = `DEC-${String(count + 1).padStart(3, '0')}`;

    const decision = await this.prisma.decision.create({
      data: {
        identifier,
        bandId,
        title: dto.title,
        rationale: dto.rationale,
        status: dto.status || DecisionStatus.PROPOSED,
        decidedById: userId,
        sourceDiscussionId: dto.sourceDiscussionId,
        requirementId: dto.requirementId,
        architectureNodeId: dto.architectureNodeId,
        decidedAt: dto.status === DecisionStatus.ACCEPTED ? new Date() : null,
      },
      include: {
        decidedBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        requirement: {
          select: { id: true, identifier: true, title: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'decision:created', decision);

    await this.activity.record({
      bandId,
      userId,
      type: ActivityType.PRD_UPDATED,
      payload: {
        title: `Decision ${identifier} recorded`,
        description: `[${identifier}] ${decision.title} (${decision.status})`,
        identifier,
        decisionId: decision.id,
      },
    });

    return decision;
  }

  async updateDecision(bandId: string, decisionId: string, userId: string, dto: UpdateDecisionDto) {
    const decision = await this.prisma.decision.findUnique({ where: { id: decisionId } });
    if (!decision || decision.bandId !== bandId) throw new NotFoundException('Decision not found');

    const isNowAccepted = dto.status === DecisionStatus.ACCEPTED && decision.status !== DecisionStatus.ACCEPTED;

    const updated = await this.prisma.decision.update({
      where: { id: decisionId },
      data: {
        title: dto.title,
        rationale: dto.rationale,
        status: dto.status,
        requirementId: dto.requirementId,
        architectureNodeId: dto.architectureNodeId,
        decidedAt: isNowAccepted ? new Date() : decision.decidedAt,
      },
      include: {
        decidedBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        requirement: {
          select: { id: true, identifier: true, title: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'decision:updated', updated);
    return updated;
  }

  async promoteDiscussion(bandId: string, userId: string, dto: PromoteDiscussionDto) {
    const discussion = await this.prisma.discussion.findFirst({
      where: { id: dto.discussionId, bandId },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const count = await this.prisma.decision.count({ where: { bandId } });
    const identifier = `DEC-${String(count + 1).padStart(3, '0')}`;

    const decision = await this.prisma.decision.create({
      data: {
        identifier,
        bandId,
        title: dto.title,
        rationale: dto.rationale,
        status: DecisionStatus.ACCEPTED,
        decidedById: userId,
        sourceDiscussionId: dto.discussionId,
        requirementId: dto.requirementId,
        architectureNodeId: dto.architectureNodeId,
        decidedAt: new Date(),
      },
      include: {
        decidedBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        requirement: {
          select: { id: true, identifier: true, title: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'decision:created', decision);
    return decision;
  }

  // ─── QUESTIONS ─────────────────────────────────────────────────────────────

  async getBandQuestions(bandId: string) {
    return this.prisma.question.findMany({
      where: { bandId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuestion(bandId: string, userId: string, dto: CreateQuestionDto) {
    const question = await this.prisma.question.create({
      data: {
        bandId,
        authorId: userId,
        title: dto.title,
        description: dto.description,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'question:created', question);
    return question;
  }

  async answerQuestion(bandId: string, questionId: string, dto: AnswerQuestionDto) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question || question.bandId !== bandId) throw new NotFoundException('Question not found');

    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: {
        status: dto.status,
        resolvedDecisionId: dto.resolvedDecisionId,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'question:updated', updated);
    return updated;
  }

  // ─── ASSUMPTIONS ───────────────────────────────────────────────────────────

  async getBandAssumptions(bandId: string) {
    return this.prisma.assumption.findMany({
      where: { bandId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAssumption(bandId: string, userId: string, dto: CreateAssumptionDto) {
    const assumption = await this.prisma.assumption.create({
      data: {
        bandId,
        authorId: userId,
        title: dto.title,
        description: dto.description,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'assumption:created', assumption);
    return assumption;
  }

  async validateAssumption(bandId: string, assumptionId: string, dto: ValidateAssumptionDto) {
    const assumption = await this.prisma.assumption.findUnique({ where: { id: assumptionId } });
    if (!assumption || assumption.bandId !== bandId) throw new NotFoundException('Assumption not found');

    const updated = await this.prisma.assumption.update({
      where: { id: assumptionId },
      data: { isValidated: dto.isValidated },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'assumption:updated', updated);
    return updated;
  }

  // ─── CHANGE REQUESTS ───────────────────────────────────────────────────────

  async getBandChangeRequests(bandId: string) {
    return this.prisma.changeRequest.findMany({
      where: { bandId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        reviewedBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        targetRequirement: {
          select: { id: true, identifier: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createChangeRequest(bandId: string, userId: string, dto: CreateChangeRequestDto) {
    const count = await this.prisma.changeRequest.count({ where: { bandId } });
    const identifier = `CR-${String(count + 1).padStart(3, '0')}`;

    const cr = await this.prisma.changeRequest.create({
      data: {
        identifier,
        bandId,
        authorId: userId,
        title: dto.title,
        description: dto.description,
        source: dto.source,
        targetRequirementId: dto.targetRequirementId,
        impactSummary: dto.impactSummary,
        status: ChangeRequestStatus.PENDING,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        targetRequirement: {
          select: { id: true, identifier: true, title: true },
        },
      },
    });

    this.eventsGateway.emitToBand(bandId, 'change_request:created', cr);
    return cr;
  }

  async reviewChangeRequest(bandId: string, crId: string, userId: string, dto: ReviewChangeRequestDto) {
    const cr = await this.prisma.changeRequest.findUnique({ where: { id: crId } });
    if (!cr || cr.bandId !== bandId) throw new NotFoundException('Change request not found');

    const updated = await this.prisma.changeRequest.update({
      where: { id: crId },
      data: {
        status: dto.status,
        reviewedById: userId,
        reviewNotes: dto.reviewNotes,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        reviewedBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        targetRequirement: {
          select: { id: true, identifier: true, title: true },
        },
      },
    });

    // If change request is approved or applied and links to a requirement, mark requirement changeState
    if (
      (dto.status === ChangeRequestStatus.APPROVED || dto.status === ChangeRequestStatus.APPLIED) &&
      cr.targetRequirementId
    ) {
      await this.prisma.requirement.update({
        where: { id: cr.targetRequirementId },
        data: { changeState: ChangeState.MODIFIED },
      });
      this.eventsGateway.emitToBand(bandId, 'requirement:updated', {
        id: cr.targetRequirementId,
        changeState: ChangeState.MODIFIED,
      });
    }

    this.eventsGateway.emitToBand(bandId, 'change_request:updated', updated);
    return updated;
  }
}
