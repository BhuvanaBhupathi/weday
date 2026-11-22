import { IsString, IsOptional, MinLength, MaxLength, IsUrl } from 'class-validator';

export class CreateBandDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;
}
