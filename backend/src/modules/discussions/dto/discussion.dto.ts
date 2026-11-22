import { IsString, IsOptional, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { DiscussionType, DiscussionStatus, Priority } from '@prisma/client';

export class CreateDiscussionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DiscussionType)
  type?: DiscussionType;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsNumber()
  startLine?: number;

  @IsOptional()
  @IsNumber()
  endLine?: number;

  @IsOptional()
  @IsString()
  codeContext?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  commitSha?: string;
}

export class AddReplyDto {
  @IsString()
  content!: string;
}

export class UpdateDiscussionStatusDto {
  @IsEnum(DiscussionStatus)
  status!: DiscussionStatus;
}
