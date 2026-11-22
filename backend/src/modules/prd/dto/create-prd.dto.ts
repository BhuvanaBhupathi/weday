import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePrdDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsString()
  uploadedFileUrl?: string;
}
