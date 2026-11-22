import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { GithubService } from './github.service';
import { WebhookService } from './webhook.service';
import { ConnectRepositoryDto } from './dto/connect-repository.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly webhookService: WebhookService,
  ) {}

  /**
   * Connect a GitHub repository to a Band.
   */
  @Post('bands/:bandId/repository')
  connectRepository(
    @Param('bandId') bandId: string,
    @Body() dto: ConnectRepositoryDto,
    @CurrentUser() user: User,
  ) {
    // Inject user's GitHub token for verification
    dto.githubToken = dto.githubToken || user.githubToken || '';
    return this.githubService.connectRepository(bandId, dto);
  }

  /**
   * Update / switch connected GitHub repository for a Band.
   */
  @Patch('bands/:bandId/repository')
  updateRepository(
    @Param('bandId') bandId: string,
    @Body() dto: ConnectRepositoryDto,
    @CurrentUser() user: User,
  ) {
    dto.githubToken = dto.githubToken || user.githubToken || '';
    return this.githubService.connectRepository(bandId, dto);
  }

  /**
   * Disconnect GitHub repository from a Band.
   */
  @Delete('bands/:bandId/repository')
  disconnectRepository(@Param('bandId') bandId: string) {
    return this.githubService.disconnectRepository(bandId);
  }

  /**
   * Get repository info for a Band.
   */
  @Get('bands/:bandId/repository')
  getRepository(@Param('bandId') bandId: string) {
    return this.githubService.getRepoBand(bandId);
  }

  /**
   * Browse repository file tree.
   */
  @Get('bands/:bandId/contents')
  getContents(
    @Param('bandId') bandId: string,
    @Query('path') path: string = '',
    @Query('ref') ref?: string,
  ) {
    return this.githubService.getRepositoryContents(bandId, path, ref);
  }

  /**
   * Get file content.
   */
  @Get('bands/:bandId/file')
  async getFileContent(
    @Param('bandId') bandId: string,
    @Query('path') filePath: string,
    @Query('ref') ref?: string,
  ) {
    const content = await this.githubService.getFileContent(bandId, filePath, ref);
    return { content, path: filePath };
  }

  /**
   * Get branches.
   */
  @Get('bands/:bandId/branches')
  getBranches(@Param('bandId') bandId: string) {
    return this.githubService.getBranches(bandId);
  }

  /**
   * Get commits.
   */
  @Get('bands/:bandId/commits')
  getCommits(
    @Param('bandId') bandId: string,
    @Query('branch') branch?: string,
    @Query('limit') limit: number = 30,
  ) {
    return this.githubService.getCommits(bandId, branch, limit);
  }

  /**
   * Get recursive repository tree.
   */
  @Get('bands/:bandId/tree')
  getTree(
    @Param('bandId') bandId: string,
    @Query('ref') ref?: string,
  ) {
    return this.githubService.getRepositoryTree(bandId, ref);
  }

  /**
   * Get single commit details with file diffs.
   */
  @Get('bands/:bandId/commits/:sha')
  getCommitDetail(
    @Param('bandId') bandId: string,
    @Param('sha') sha: string,
  ) {
    return this.githubService.getCommitDetail(bandId, sha);
  }

  /**
   * Get Pull Requests.
   */
  @Get('bands/:bandId/pulls')
  getPullRequests(
    @Param('bandId') bandId: string,
    @Query('state') state: 'open' | 'closed' | 'all' = 'open',
  ) {
    return this.githubService.getPullRequests(bandId, state);
  }

  /**
   * Get single Pull Request details with file diffs.
   */
  @Get('bands/:bandId/pulls/:prNumber')
  getPullRequestDetail(
    @Param('bandId') bandId: string,
    @Param('prNumber') prNumber: string,
  ) {
    return this.githubService.getPullRequestDetail(bandId, parseInt(prNumber, 10));
  }

  /**
   * GitHub webhook endpoint.
   * MUST be Public (no JWT required — GitHub calls this directly).
   * Validates HMAC signature before processing.
   */
  @Public()
  @Post('webhooks')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.warn('Webhook received without raw body');
      return { status: 'ignored' };
    }

    // 1. Validate signature
    this.webhookService.validateWebhookSignature(rawBody, signature);

    // 2. Idempotency check
    const alreadyProcessed = await this.webhookService.isAlreadyProcessed(deliveryId);
    if (alreadyProcessed) {
      this.logger.debug(`Duplicate webhook delivery: ${deliveryId}`);
      return { status: 'already_processed' };
    }

    // 3. Parse and process
    const payload = JSON.parse(rawBody.toString('utf-8'));
    const action = payload.action as string | undefined;

    try {
      switch (event) {
        case 'push':
          await this.webhookService.handlePushEvent(deliveryId, payload);
          break;
        case 'pull_request':
          await this.webhookService.handlePullRequestEvent(deliveryId, payload);
          break;
        case 'ping':
          this.logger.log('GitHub App ping received');
          break;
        default:
          this.logger.debug(`Unhandled webhook event: ${event}`);
      }

      // 4. Record as processed
      await this.webhookService.recordDelivery(deliveryId, event, action, payload.repository?.full_name);
    } catch (err) {
      this.logger.error(`Error processing webhook ${event}/${deliveryId}:`, err);
      // Return 200 anyway — GitHub will retry on 5xx
    }

    return { status: 'processed' };
  }
}
