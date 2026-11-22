import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CrewModule } from './modules/crew/crew.module';
import { BandsModule } from './modules/bands/bands.module';
import { BandMembershipModule } from './modules/band-membership/band-membership.module';
import { PrdModule } from './modules/prd/prd.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { StageModule } from './modules/stage/stage.module';
import { CanvasModule } from './modules/canvas/canvas.module';
import { ArchitectureModule } from './modules/architecture/architecture.module';
import { CodeModule } from './modules/code/code.module';
import { DiscussionsModule } from './modules/discussions/discussions.module';
import { ConcernsModule } from './modules/concerns/concerns.module';
import { GitModule } from './modules/git/git.module';
import { GithubModule } from './modules/github/github.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ProjectMemoryModule } from './modules/project-memory/project-memory.module';
import { ChatModule } from './modules/chat/chat.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { StorageModule } from './modules/storage/storage.module';
import { DecisionsModule } from './modules/decisions/decisions.module';
import { PublicationModule } from './modules/publication/publication.module';
import { envValidation } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    // Config — load & validate env vars
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({
        throttlers: [
          { name: 'short', ttl: 1000, limit: 10 },
          { name: 'long', ttl: 60000, limit: 100 },
        ],
      }),
    }),

    // Cron job scheduling
    ScheduleModule.forRoot(),

    // BullMQ — background job queues via Redis
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const isTls = redisUrl.startsWith('rediss://');
          return {
            redis: isTls
              ? {
                  url: redisUrl,
                  tls: { rejectUnauthorized: false },
                  maxRetriesPerRequest: null,
                }
              : {
                  url: redisUrl,
                  maxRetriesPerRequest: null,
                },
          };
        }
        return {
          redis: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD'),
          },
        };
      },
    }),

    // Infrastructure
    DatabaseModule,
    StorageModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CrewModule,
    BandsModule,
    BandMembershipModule,
    PrdModule,
    RequirementsModule,
    StageModule,
    CanvasModule,
    ArchitectureModule,
    CodeModule,
    DiscussionsModule,
    ConcernsModule,
    GitModule,
    GithubModule,
    AiModule,
    NotificationsModule,
    ActivityModule,
    ProjectMemoryModule,
    ChatModule,
    TasksModule,
    DecisionsModule,
    PublicationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
