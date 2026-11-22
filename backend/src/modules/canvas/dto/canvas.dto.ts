import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CanvasNodeInputDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  height?: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsInt()
  zIndex?: number;

  @IsOptional()
  data?: Record<string, any>;

  @IsOptional()
  sourceRef?: Record<string, any>;
}

export class CanvasEdgeInputDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  source!: string;

  @IsString()
  target!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  relation?: string | null;

  @IsOptional()
  data?: Record<string, any>;
}

export class CanvasViewportDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  x?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  y?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  zoom?: number;
}

export class SyncPageStateDto {
  @IsArray()
  nodes!: CanvasNodeInputDto[];

  @IsArray()
  edges!: CanvasEdgeInputDto[];

  @IsOptional()
  viewport?: CanvasViewportDto;
}

export class CreatePageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  parentPageId?: string;
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  parentPageId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

export class SaveVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gitBranch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  gitCommitSha?: string;
}

export class RenameVersionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
