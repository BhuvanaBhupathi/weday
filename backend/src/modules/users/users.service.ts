import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

export interface UpsertFromGitHubData {
  githubId: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  githubToken: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts a user record from GitHub OAuth data.
   * Creates user if not found, updates if exists.
   * Guarantees that the username matches GitHub username, disambiguating if collided.
   */
  async upsertFromGitHub(data: UpsertFromGitHubData): Promise<User> {
    // 1. Check if user already exists by githubId
    const existingByGithub = await this.prisma.user.findUnique({
      where: { githubId: data.githubId },
    });

    if (existingByGithub) {
      return this.prisma.user.update({
        where: { id: existingByGithub.id },
        data: {
          username: data.username,
          displayName: data.displayName || data.username,
          email: data.email,
          avatarUrl: data.avatarUrl,
          githubToken: data.githubToken,
        },
      });
    }

    // 2. Check if username is already taken by someone else
    let finalUsername = data.username;
    const existingByUsername = await this.prisma.user.findUnique({
      where: { username: finalUsername },
    });

    if (existingByUsername && existingByUsername.githubId !== data.githubId) {
      // Username exists for a different user (e.g. seeded dev user), suffix it
      finalUsername = `${data.username}-${data.githubId.slice(-4)}`;
    }

    return this.prisma.user.create({
      data: {
        githubId: data.githubId,
        username: finalUsername,
        displayName: data.displayName || data.username,
        email: data.email,
        avatarUrl: data.avatarUrl,
        githubToken: data.githubToken,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { githubId } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check username uniqueness if changing
    if (dto.username && dto.username !== user.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existing) {
        throw new ConflictException('Username already taken');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        bio: dto.bio,
        username: dto.username,
      },
    });
  }

  /**
   * Search users by username or display name (for crew/DM features).
   */
  async searchUsers(query: string, excludeUserId?: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        AND: [
          excludeUserId ? { id: { not: excludeUserId } } : {},
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 20,
      orderBy: { username: 'asc' },
    });
  }
}
