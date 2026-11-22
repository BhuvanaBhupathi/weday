import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [GithubController],
  providers: [GithubService, WebhookService],
  exports: [GithubService],
})
export class GithubModule {}
