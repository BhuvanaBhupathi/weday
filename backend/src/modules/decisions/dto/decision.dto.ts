import { IsString, IsOptional, IsEnum, MaxLength, IsObject } from 'class-validator';
import { DecisionStatus, QuestionStatus, ChangeRequestSource, ChangeRequestStatus } from '@prisma/client';

export class CreateDecisionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  rationale!: string;

  @IsOptional()
  @IsEnum(DecisionStatus)
  status?: DecisionStatus;

  @IsOptional()
  @IsString()
  sourceDiscussionId?: string;

  @IsOptional()
  @IsString()
  requirementId?: string;

  @IsOptional()
  @IsString()
  architectureNodeId?: string;
}

export class UpdateDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  rationale?: string;

  @IsOptional()
  @IsEnum(DecisionStatus)
  status?: DecisionStatus;

  @IsOptional()
  @IsString()
  requirementId?: string;

  @IsOptional()
  @IsString()
  architectureNodeId?: string;
}

export class PromoteDiscussionDto {
  @IsString()
  discussionId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  rationale!: string;

  @IsOptional()
  @IsString()
  requirementId?: string;

  @IsOptional()
  @IsString()
  architectureNodeId?: string;
}

export class CreateQuestionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AnswerQuestionDto {
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @IsOptional()
  @IsString()
  resolvedDecisionId?: string;
}

export class CreateAssumptionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ValidateAssumptionDto {
  isValidated!: boolean;
}

export class CreateChangeRequestDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(ChangeRequestSource)
  source?: ChangeRequestSource;

  @IsOptional()
  @IsString()
  targetRequirementId?: string;

  @IsOptional()
  @IsObject()
  impactSummary?: Record<string, any>;
}

export class ReviewChangeRequestDto {
  @IsEnum(ChangeRequestStatus)
  status!: ChangeRequestStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
