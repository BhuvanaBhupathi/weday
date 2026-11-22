import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min } from 'class-validator';
import { Priority, RequirementStatus, ChangeState } from '@prisma/client';

export class UpdateRequirementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @IsOptional()
  @IsEnum(ChangeState)
  changeState?: ChangeState;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptanceCriteria?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
