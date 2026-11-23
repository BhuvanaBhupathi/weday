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
        // Find default WEday Core band or create a default band for the user
        const demoBand = await (this.bandsService as any).prisma.band.findFirst({
          where: { slug: { in: ['weday-core', 'friday-core'] } },
        });
        if (demoBand) {
          const signatureColor = await this.bandsService.nextColorForBand(demoBand.id);
          await (this.bandsService as any).prisma.bandMembership.upsert({
            where: { userId_bandId: { userId: user.id, bandId: demoBand.id } },
            create: { userId: user.id, bandId: demoBand.id, role: 'ADMIN', signatureColor },
            update: {},
          });
          this.logger.log(`Added user ${user.username} to demo band WEday Core`);
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
   * Direct GitHub login: connects directly using GitHub API data or credentials.
   * Eliminates the need for external GitHub OAuth app setup or redirect 404s.
   */
  async directGithubLogin(username = 'BhuvanaBhupathi', token?: string): Promise<{ token: string; user: User }> {
    const cleanUser = (username || 'BhuvanaBhupathi').trim();
    let githubProfile: GitHubProfile = {
      id: `gh-${cleanUser}`,
      username: cleanUser,
      displayName: cleanUser,
      emails: [{ value: `${cleanUser}@users.noreply.github.com` }],
      photos: [{ value: `https://github.com/${cleanUser}.png` }],
      accessToken: token ? token.trim() : 'direct-github-access',
    };

    // If personal token provided, verify against GitHub API
    if (token && token.trim()) {
      try {
        const ghRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            'User-Agent': 'WEday-Collaborative-Workspace',
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (ghRes.ok) {
          const ghUser: any = await ghRes.json();
          githubProfile = {
            id: String(ghUser.id),
            username: ghUser.login || cleanUser,
            displayName: ghUser.name || ghUser.login || cleanUser,
            emails: ghUser.email
              ? [{ value: ghUser.email }]
              : [{ value: `${ghUser.login || cleanUser}@users.noreply.github.com` }],
            photos: ghUser.avatar_url
              ? [{ value: ghUser.avatar_url }]
              : [{ value: `https://github.com/${cleanUser}.png` }],
            accessToken: token.trim(),
          };
        }
      } catch (err: any) {
        this.logger.warn(`GitHub token verification failed: ${err.message}`);
      }
    } else {
      // Fetch public profile from GitHub API
      try {
        const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`, {
          headers: {
            'User-Agent': 'WEday-Collaborative-Workspace',
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (ghRes.ok) {
          const ghUser: any = await ghRes.json();
          githubProfile = {
            id: String(ghUser.id),
            username: ghUser.login || cleanUser,
            displayName: ghUser.name || ghUser.login || cleanUser,
            emails: ghUser.email
              ? [{ value: ghUser.email }]
              : [{ value: `${ghUser.login || cleanUser}@users.noreply.github.com` }],
            photos: ghUser.avatar_url
              ? [{ value: ghUser.avatar_url }]
              : [{ value: `https://github.com/${cleanUser}.png` }],
            accessToken: 'direct-github-access',
          };
        }
      } catch (err: any) {
        this.logger.warn(`Public GitHub fetch failed: ${err.message}`);
      }
    }

    return this.handleGithubCallback(githubProfile);
  }

  /**
   * Dev login for local development and testing without GitHub OAuth.
   */
  async devLogin(username = 'developer'): Promise<{ token: string; user: User }> {
    const user = await this.usersService.upsertFromGitHub({
      githubId: `dev-${username}`,
      username,
      displayName: username === 'developer' ? 'WEday Developer' : username,
      email: `${username}@weday.local`,
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
