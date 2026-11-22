import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { DecisionStatus } from '@prisma/client';
import { DecisionsService } from './decisions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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

@Controller('bands/:bandId')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  // ─── Decisions ─────────────────────────────────────────────────────────────

  @Get('decisions')
  async getDecisions(
    @Param('bandId') bandId: string,
    @Query('status') status?: DecisionStatus,
  ) {
    return this.decisionsService.getBandDecisions(bandId, status);
  }

  @Post('decisions')
  async createDecision(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateDecisionDto,
  ) {
    return this.decisionsService.createDecision(bandId, user.id, dto);
  }

  @Patch('decisions/:decisionId')
  async updateDecision(
    @Param('bandId') bandId: string,
    @Param('decisionId') decisionId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateDecisionDto,
  ) {
    return this.decisionsService.updateDecision(bandId, decisionId, user.id, dto);
  }

  @Post('decisions/promote-discussion')
  async promoteDiscussion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: PromoteDiscussionDto,
  ) {
    return this.decisionsService.promoteDiscussion(bandId, user.id, dto);
  }

  // ─── Questions ─────────────────────────────────────────────────────────────

  @Get('questions')
  async getQuestions(@Param('bandId') bandId: string) {
    return this.decisionsService.getBandQuestions(bandId);
  }

  @Post('questions')
  async createQuestion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.decisionsService.createQuestion(bandId, user.id, dto);
  }

  @Patch('questions/:questionId')
  async answerQuestion(
    @Param('bandId') bandId: string,
    @Param('questionId') questionId: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.decisionsService.answerQuestion(bandId, questionId, dto);
  }

  // ─── Assumptions ───────────────────────────────────────────────────────────

  @Get('assumptions')
  async getAssumptions(@Param('bandId') bandId: string) {
    return this.decisionsService.getBandAssumptions(bandId);
  }

  @Post('assumptions')
  async createAssumption(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateAssumptionDto,
  ) {
    return this.decisionsService.createAssumption(bandId, user.id, dto);
  }

  @Patch('assumptions/:assumptionId')
  async validateAssumption(
    @Param('bandId') bandId: string,
    @Param('assumptionId') assumptionId: string,
    @Body() dto: ValidateAssumptionDto,
  ) {
    return this.decisionsService.validateAssumption(bandId, assumptionId, dto);
  }

  // ─── Change Requests ───────────────────────────────────────────────────────

  @Get('change-requests')
  async getChangeRequests(@Param('bandId') bandId: string) {
    return this.decisionsService.getBandChangeRequests(bandId);
  }

  @Post('change-requests')
  async createChangeRequest(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateChangeRequestDto,
  ) {
    return this.decisionsService.createChangeRequest(bandId, user.id, dto);
  }

  @Patch('change-requests/:crId/review')
  async reviewChangeRequest(
    @Param('bandId') bandId: string,
    @Param('crId') crId: string,
    @CurrentUser() user: User,
    @Body() dto: ReviewChangeRequestDto,
  ) {
    return this.decisionsService.reviewChangeRequest(bandId, crId, user.id, dto);
  }
}
