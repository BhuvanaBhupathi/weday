import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ConcernStatus, Priority } from '@prisma/client';

export class CreateConcernDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  discussionId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class UpdateConcernStatusDto {
  @IsEnum(ConcernStatus)
  status!: ConcernStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}
