import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err: any) {
      this.logger.warn(`Database connection failed: ${err.message}. Backend will run with limited functionality until PostgreSQL is available.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Helper for clean test teardown — truncates all tables in correct dependency order.
   * Only callable in test environment.
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase() can only be called in test environment');
    }

    const tables = [
      'webhook_events',
      'ai_jobs',
      'project_relationships',
      'activities',
      'notifications',
      'direct_messages',
      'chat_messages',
      'chat_channels',
      'tasks',
      'code_ownerships',
      'suggested_edits',
      'concerns',
      'discussion_replies',
      'discussions',
      'architecture_edges',
      'architecture_nodes',
      'architecture_versions',
      'architectures',
      'stage_boards',
      'stages',
      'prd_versions',
      'prds',
      'pull_requests',
      'git_commits',
      'git_branches',
      'git_repositories',
      'band_memberships',
      'bands',
      'crew_relationships',
      'users',
    ];

    for (const table of tables) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  }
}
