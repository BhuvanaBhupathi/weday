import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdatePublicationDto {
  @IsString()
  @MaxLength(100)
  publicSlug!: string;

  @IsOptional()
  @IsBoolean()
  isPasswordProtected?: boolean;

  @IsOptional()
  @IsString()
  password?: string;
}

export class PublishVersionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class VerifyPasswordDto {
  @IsString()
  password!: string;
}

export class ClientSubmitCrDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  targetRequirementIdentifier?: string;
}
