import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { UsersService } from '../users/users.service';

import { BandsService } from '../bands/bands.service';

export interface GitHubProfile {
  id: string;
  username: string;
  displayName: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  accessToken: string;
}

export interface JwtPayload {
  sub: string; // Friday user ID
  username: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly bandsService: BandsService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Called by GitHub OAuth callback.
   * Upserts the user and returns a signed JWT.
   */
  async handleGithubCallback(profile: GitHubProfile): Promise<{ token: string; user: User }> {
    const user = await this.usersService.upsertFromGitHub({
      githubId: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      email: profile.emails?.[0]?.value ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      githubToken: profile.accessToken,
    });

    // Ensure the user has at least one band membership so their workspace loads immediately
    try {
      const existingBands = await this.bandsService.getUserBands(user.id);
      if (existingBands.length === 0) {
        // Find default Friday Core band or create a default band for the user
        const demoBand = await (this.bandsService as any).prisma.band.findFirst({
          where: { slug: 'friday-core' },
        });
        if (demoBand) {
          const signatureColor = await this.bandsService.nextColorForBand(demoBand.id);
          await (this.bandsService as any).prisma.bandMembership.upsert({
            where: { userId_bandId: { userId: user.id, bandId: demoBand.id } },
            create: { userId: user.id, bandId: demoBand.id, role: 'MEMBER', signatureColor },
            update: {},
          });
          this.logger.log(`Added user ${user.username} to demo band Friday Core`);
        }
      }
    } catch (bandErr: any) {
      this.logger.warn(`Could not verify default band for ${user.username}: ${bandErr.message}`);
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    };

    const token = this.jwtService.sign(payload);
    this.logger.log(`User ${user.username} authenticated via GitHub`);

    return { token, user };
  }

  /**
   * Dev login for local development and testing without GitHub OAuth.
   */
  async devLogin(username = 'developer'): Promise<{ token: string; user: User }> {
    const user = await this.usersService.upsertFromGitHub({
      githubId: `dev-${username}`,
      username,
      displayName: username === 'developer' ? 'Friday Developer' : username,
      email: `${username}@friday.local`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      githubToken: 'dev-token-local',
    });

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    };

    const token = this.jwtService.sign(payload);
    this.logger.log(`Dev user ${user.username} logged in`);

    return { token, user };
  }

  /**
   * Validates a JWT payload and returns the user.
   * Used by JwtStrategy.
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub);
  }
}
