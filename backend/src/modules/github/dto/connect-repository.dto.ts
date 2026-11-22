import { IsString, IsNumber, IsOptional } from 'class-validator';

export class ConnectRepositoryDto {
  @IsString()
  owner!: string;

  @IsString()
  repo!: string;

  @IsOptional()
  @IsString()
  githubToken?: string; // User's personal GitHub token (to verify access)

  @IsOptional()
  @IsNumber()
  installationId?: number; // GitHub App installation ID (if already installed)
}
