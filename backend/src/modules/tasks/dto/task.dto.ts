import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { Priority, TaskStatus, ArtifactType } from '@prisma/client';

export class CreateTaskDto {
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
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(ArtifactType)
  relatedArtifactType?: ArtifactType;

  @IsOptional()
  @IsString()
  relatedArtifactId?: string;

  @IsOptional()
  @IsString()
  milestoneId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(ArtifactType)
  relatedArtifactType?: ArtifactType;

  @IsOptional()
  @IsString()
  relatedArtifactId?: string;

  @IsOptional()
  @IsString()
  milestoneId?: string;
}
