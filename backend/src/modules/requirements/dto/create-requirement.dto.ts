import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsInt, Min } from 'class-validator';
import { Priority, RequirementStatus, ChangeState } from '@prisma/client';

export class CreateRequirementDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

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
