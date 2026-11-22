import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePrdDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;

  @IsOptional()
  @IsString()
  uploadedFileUrl?: string;
}
