import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ActivityType, ArtifactType } from '@prisma/client';
import { bandUserSelect, flattenAuthor } from '../../common/signature-colors';

export interface RecordActivityOptions {
  bandId: string;
  userId: string;
  type: ActivityType;
  payload?: Record<string, unknown>;
  relatedArtifactType?: ArtifactType;
  relatedArtifactId?: string;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an activity event.
   * Called from other services to persist project history.
   */
  async record(options: RecordActivityOptions) {
    return this.prisma.activity.create({
      data: {
        bandId: options.bandId,
        userId: options.userId,
        type: options.type,
        payload: options.payload ? (options.payload as any) : undefined,
        relatedArtifactType: options.relatedArtifactType,
        relatedArtifactId: options.relatedArtifactId,
      },
    });
  }

  /**
   * Get activity feed for a Band (paginated, newest first).
   */
  async getBandActivity(bandId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { bandId },
        include: {
          user: bandUserSelect(bandId),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { bandId } }),
    ]);

    const data = activities.map((a) => ({ ...a, user: flattenAuthor(a.user) }));

    return {
      data,
      total,
      page,
      limit,
      hasNextPage: skip + limit < total,
    };
  }
}
