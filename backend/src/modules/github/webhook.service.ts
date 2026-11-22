import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import type { ActivityService } from '../activity/activity.service';

interface PushEvent {
  ref: string;
  repository: { id: number; full_name: string };
  commits: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;
  }>;
  pusher: { name: string; email: string };
  head_commit: { id: string } | null;
}

interface PullRequestEvent {
  action: string;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    draft: boolean;
    head: { ref: string; sha: string };
    base: { ref: string };
    html_url: string;
    created_at: string;
    merged_at: string | null;
    closed_at: string | null;
    user: { login: string };
  };
  repository: { id: number; full_name: string };
}

/**
 * WebhookService — Processes GitHub webhook events.
 * All processing is idempotent (checked by X-GitHub-Delivery header).
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Validates GitHub webhook HMAC-SHA256 signature.
   * MUST be called before processing any webhook payload.
   */
  validateWebhookSignature(payload: Buffer, signature: string): void {
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('GITHUB_WEBHOOK_SECRET not configured — webhook validation skipped');
      return;
    }

    const expectedSig = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

    if (signature.length !== expectedSig.length) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  /**
   * Check if we've already processed this webhook delivery (idempotency).
   * Returns true if already processed.
   */
  async isAlreadyProcessed(deliveryId: string): Promise<boolean> {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { deliveryId },
    });
    return !!existing;
  }

  /**
   * Record a webhook delivery as processed.
   */
  async recordDelivery(deliveryId: string, event: string, action?: string, repoFullName?: string) {
    await this.prisma.webhookEvent.create({
      data: { deliveryId, event, action, repoFullName },
    });
  }

  /**
   * Handle a 'push' event from GitHub.
   */
  async handlePushEvent(deliveryId: string, payload: PushEvent): Promise<void> {
    const repo = await this.prisma.gitRepository.findFirst({
      where: { fullName: payload.repository.full_name },
    });

    if (!repo) {
      this.logger.warn(`No Band found for repo: ${payload.repository.full_name}`);
      return;
    }

    const branchName = payload.ref.replace('refs/heads/', '');

    // Persist commits (idempotent via sha unique constraint)
    for (const commit of payload.commits) {
      await this.prisma.gitCommit.upsert({
        where: { sha: commit.id },
        create: {
          repoId: repo.id,
          sha: commit.id,
          message: commit.message,
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          branchName,
          parentShas: [],
          committedAt: new Date(commit.timestamp),
          pushedAt: new Date(),
        },
        update: {
          branchName,
          pushedAt: new Date(),
        },
      });
    }

    // Update branch SHA
    if (payload.head_commit) {
      await this.prisma.gitBranch.upsert({
        where: { repoId_name: { repoId: repo.id, name: branchName } },
        create: {
          repoId: repo.id,
          name: branchName,
          sha: payload.head_commit.id,
          isDefault: branchName === repo.defaultBranch,
        },
        update: { sha: payload.head_commit.id },
      });
    }

    this.logger.log(
      `Push event processed: ${payload.commits.length} commits to ${branchName} in ${repo.fullName}`,
    );
  }

  /**
   * Handle a 'pull_request' event from GitHub.
   */
  async handlePullRequestEvent(deliveryId: string, payload: PullRequestEvent): Promise<void> {
    const repo = await this.prisma.gitRepository.findFirst({
      where: { fullName: payload.repository.full_name },
    });

    if (!repo) {
      this.logger.warn(`No Band found for repo: ${payload.repository.full_name}`);
      return;
    }

    const pr = payload.pull_request;
    const state =
      pr.state === 'closed' && pr.merged_at
        ? 'MERGED'
        : pr.state === 'closed'
          ? 'CLOSED'
          : 'OPEN';

    await this.prisma.pullRequest.upsert({
      where: { repoId_githubPrId: { repoId: repo.id, githubPrId: pr.id } },
      create: {
        repoId: repo.id,
        githubPrId: pr.id,
        githubPrNumber: pr.number,
        title: pr.title,
        body: pr.body || '',
        state,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        headSha: pr.head.sha,
        isDraft: pr.draft,
        htmlUrl: pr.html_url,
        githubCreatedAt: new Date(pr.created_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      },
      update: {
        title: pr.title,
        body: pr.body || '',
        state,
        headSha: pr.head.sha,
        isDraft: pr.draft,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      },
    });

    this.logger.log(
      `PR event: ${payload.action} PR #${pr.number} in ${repo.fullName}`,
    );
  }
}
