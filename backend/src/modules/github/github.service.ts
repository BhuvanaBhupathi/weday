import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { PrismaService } from '../../database/prisma.service';
import type { ConnectRepositoryDto } from './dto/connect-repository.dto';

/**
 * GithubService — All GitHub API calls centralized here.
 * Uses GitHub App installation tokens (not personal tokens) for repository access.
 * Personal GitHub OAuth token is used only for user-identity operations.
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly appOctokit: Octokit | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const appId = config.get<string>('GITHUB_APP_ID');
    const privateKey = config.get<string>('GITHUB_PRIVATE_KEY');
    const clientId = config.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = config.get<string>('GITHUB_CLIENT_SECRET');

    if (appId && privateKey) {
      this.appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId,
          privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines in env
          clientId,
          clientSecret,
        },
      });
      this.logger.log('GitHub App initialized');
    } else {
      this.logger.warn('GitHub App credentials not configured — GitHub features will be limited');
    }
  }

  /**
   * Get an installation-scoped Octokit instance for a repository.
   * Uses cached tokens from Redis where possible.
   */
  private async getInstallationOctokit(installationId: number): Promise<Octokit> {
    if (!this.appOctokit) {
      throw new BadRequestException('GitHub App not configured');
    }

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.config.get<string>('GITHUB_APP_ID'),
        privateKey: this.config.get<string>('GITHUB_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
        installationId,
      },
    });
  }

  private async getRepoOctokit(repo: any): Promise<Octokit> {
    if (repo.installationId && this.appOctokit) {
      try {
        return await this.getInstallationOctokit(repo.installationId);
      } catch (e: any) {
        this.logger.warn(`Failed to create installation Octokit: ${e.message}`);
      }
    }
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (token) {
      return new Octokit({ auth: token });
    }
    return new Octokit();
  }

  /**
   * Get an Octokit instance using the user's personal GitHub token.
   * Used for user-identity operations (not repository operations).
   */
  getUserOctokit(githubToken: string): Octokit {
    return new Octokit({ auth: githubToken });
  }

  /**
   * Connect a GitHub repository to a Band.
   * Requires the user to have already installed the GitHub App on the repo.
   */
  async connectRepository(bandId: string, dto: ConnectRepositoryDto) {
    // If the band already has a connected repository, remove it first to allow editing/switching
    const existing = await this.prisma.gitRepository.findUnique({
      where: { bandId },
    });
    if (existing) {
      await this.prisma.gitRepository.delete({
        where: { bandId },
      });
      this.logger.log(`Replaced previous repository ${existing.fullName} for Band ${bandId}`);
    }

    // Auto-detect installationId using GitHub App if not explicitly provided
    let installationId = dto.installationId;
    if (!installationId && this.appOctokit) {
      try {
        const installRes = await this.appOctokit.apps.getRepoInstallation({
          owner: dto.owner,
          repo: dto.repo,
        });
        installationId = installRes.data.id;
      } catch (e: any) {
        this.logger.warn(`Could not auto-detect installation for ${dto.owner}/${dto.repo}: ${e.message}`);
      }
    }

    // Verify the repository exists (using user's personal token or App installation)
    let repoData: {
      id: number;
      owner: { login: string };
      name: string;
      full_name: string;
      default_branch: string;
      private: boolean;
      html_url: string;
    };
    try {
      if (dto.githubToken && dto.githubToken !== 'dev-token-local') {
        const userOctokit = this.getUserOctokit(dto.githubToken);
        const response = await userOctokit.repos.get({
          owner: dto.owner,
          repo: dto.repo,
        });
        repoData = response.data;
      } else if (installationId && this.appOctokit) {
        const instOctokit = await this.getInstallationOctokit(installationId);
        const response = await instOctokit.repos.get({
          owner: dto.owner,
          repo: dto.repo,
        });
        repoData = response.data;
      } else {
        // Public repo fallback check
        const anonOctokit = new Octokit();
        const response = await anonOctokit.repos.get({
          owner: dto.owner,
          repo: dto.repo,
        });
        repoData = response.data;
      }
    } catch (err: any) {
      throw new NotFoundException(
        `GitHub repository ${dto.owner}/${dto.repo} not found or inaccessible: ${err.message}`,
      );
    }

    // Store repository in Friday's DB
    const repository = await this.prisma.gitRepository.create({
      data: {
        bandId,
        githubRepoId: repoData.id,
        owner: repoData.owner.login,
        name: repoData.name,
        fullName: repoData.full_name,
        defaultBranch: repoData.default_branch,
        isPrivate: repoData.private,
        htmlUrl: repoData.html_url,
        installationId: installationId || dto.installationId || null,
        syncedAt: new Date(),
      },
    });

    this.logger.log(`Repository ${repoData.full_name} connected to Band ${bandId}`);

    // Trigger initial sync of branches, commits, and PRs
    this.getBranches(bandId).catch((err) =>
      this.logger.warn(`Initial branch sync failed: ${err.message}`),
    );
    this.getCommits(bandId).catch((err) =>
      this.logger.warn(`Initial commit sync failed: ${err.message}`),
    );
    this.getPullRequests(bandId).catch((err) =>
      this.logger.warn(`Initial PR sync failed: ${err.message}`),
    );

    return repository;
  }

  /**
   * Disconnect a GitHub repository from a Band.
   */
  async disconnectRepository(bandId: string) {
    const existing = await this.prisma.gitRepository.findUnique({
      where: { bandId },
    });
    if (!existing) {
      throw new NotFoundException('No GitHub repository connected to this Band');
    }

    await this.prisma.gitRepository.delete({
      where: { bandId },
    });
    this.logger.log(`Disconnected repository ${existing.fullName} from Band ${bandId}`);
    return { success: true, message: `Disconnected ${existing.fullName}` };
  }

  /**
   * List files/directories at a path in the repository.
   */
  async getRepositoryContents(
    bandId: string,
    path: string = '',
    ref?: string,
  ) {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const response = await octokit.repos.getContent({
      owner: repo.owner,
      repo: repo.name,
      path,
      ref: ref || repo.defaultBranch,
    });

    return response.data;
  }

  /**
   * Get recursive file tree of the connected repository.
   */
  async getRepositoryTree(bandId: string, ref?: string) {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const treeSha = ref || repo.defaultBranch || 'main';
    try {
      const response = await octokit.git.getTree({
        owner: repo.owner,
        repo: repo.name,
        tree_sha: treeSha,
        recursive: 'true',
      });
      return response.data.tree || [];
    } catch (err: any) {
      this.logger.warn(`Failed to fetch git tree for ${repo.fullName}: ${err.message}`);
      return [];
    }
  }

  /**
   * Get file content (raw).
   */
  async getFileContent(bandId: string, filePath: string, ref?: string): Promise<string> {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const cleanPath = filePath.replace(/^\/+/, '');
    const response = await octokit.repos.getContent({
      owner: repo.owner,
      repo: repo.name,
      path: cleanPath,
      ref: ref || repo.defaultBranch,
    });

    const data = response.data as { type: string; content?: string; encoding?: string };
    if (data.type !== 'file' || !data.content) {
      throw new BadRequestException('Not a file');
    }

    return Buffer.from(data.content, (data.encoding as BufferEncoding) || 'base64').toString('utf-8');
  }

  /**
   * List branches for the connected repository.
   */
  async getBranches(bandId: string) {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const response = await octokit.repos.listBranches({
      owner: repo.owner,
      repo: repo.name,
      per_page: 100,
    });

    // Sync to our DB
    await this.prisma.$transaction(
      response.data.map((branch) =>
        this.prisma.gitBranch.upsert({
          where: { repoId_name: { repoId: repo.id, name: branch.name } },
          create: {
            repoId: repo.id,
            name: branch.name,
            sha: branch.commit.sha,
            isDefault: branch.name === repo.defaultBranch,
          },
          update: {
            sha: branch.commit.sha,
          },
        }),
      ),
    );

    return response.data;
  }

  /**
   * List commits for a branch.
   */
  async getCommits(bandId: string, branch?: string, limit = 30) {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const response = await octokit.repos.listCommits({
      owner: repo.owner,
      repo: repo.name,
      sha: branch || repo.defaultBranch,
      per_page: limit,
    });

    return response.data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      authorName: commit.commit.author?.name || 'Unknown',
      authorEmail: commit.commit.author?.email || '',
      committedAt: commit.commit.author?.date || new Date().toISOString(),
      htmlUrl: commit.html_url,
    }));
  }

  /**
   * Get single commit details with file diffs.
   */
  async getCommitDetail(bandId: string, sha: string) {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const response = await octokit.repos.getCommit({
      owner: repo.owner,
      repo: repo.name,
      ref: sha,
    });

    return {
      sha: response.data.sha,
      message: response.data.commit.message,
      authorName: response.data.commit.author?.name || 'Unknown',
      authorEmail: response.data.commit.author?.email || '',
      committedAt: response.data.commit.author?.date || new Date().toISOString(),
      stats: response.data.stats,
      files: (response.data.files || []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
      htmlUrl: response.data.html_url,
    };
  }

  /**
   * List open Pull Requests.
   */
  async getPullRequests(bandId: string, state: 'open' | 'closed' | 'all' = 'open') {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const response = await octokit.pulls.list({
      owner: repo.owner,
      repo: repo.name,
      state,
      per_page: 50,
    });

    return response.data;
  }

  /**
   * Get single pull request details with file diffs.
   */
  async getPullRequestDetail(bandId: string, prNumber: number) {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const [prRes, filesRes] = await Promise.all([
      octokit.pulls.get({
        owner: repo.owner,
        repo: repo.name,
        pull_number: prNumber,
      }),
      octokit.pulls
        .listFiles({
          owner: repo.owner,
          repo: repo.name,
          pull_number: prNumber,
        })
        .catch(() => ({ data: [] })),
    ]);

    return {
      id: prRes.data.id,
      number: prRes.data.number,
      title: prRes.data.title,
      body: prRes.data.body || '',
      state: prRes.data.state,
      merged: (prRes.data as any).merged || false,
      user: prRes.data.user?.login || 'Anonymous',
      head: prRes.data.head?.ref,
      base: prRes.data.base?.ref,
      createdAt: prRes.data.created_at,
      updatedAt: prRes.data.updated_at,
      additions: (prRes.data as any).additions || 0,
      deletions: (prRes.data as any).deletions || 0,
      changedFilesCount: (prRes.data as any).changed_files || filesRes.data.length,
      files: (filesRes.data || []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
      htmlUrl: prRes.data.html_url,
    };
  }

  /**
   * Create a new Pull Request.
   */
  async createPullRequest(
    bandId: string,
    title: string,
    body: string,
    head: string,
    base: string,
  ) {
    const repo = await this.getRepoBand(bandId);
    const octokit = await this.getRepoOctokit(repo);
    const response = await octokit.pulls.create({
      owner: repo.owner,
      repo: repo.name,
      title,
      body,
      head,
      base,
    });

    // Store PR in our DB
    await this.prisma.pullRequest.upsert({
      where: { repoId_githubPrId: { repoId: repo.id, githubPrId: response.data.id } },
      create: {
        repoId: repo.id,
        githubPrId: response.data.id,
        githubPrNumber: response.data.number,
        title: response.data.title,
        body: response.data.body || '',
        state: 'OPEN',
        headBranch: response.data.head.ref,
        baseBranch: response.data.base.ref,
        headSha: response.data.head.sha,
        isDraft: response.data.draft || false,
        htmlUrl: response.data.html_url,
        githubCreatedAt: new Date(response.data.created_at),
      },
      update: {},
    });

    return response.data;
  }

  /**
   * Get the connected repository for a Band.
   */
  async getRepoBand(bandId: string) {
    const repo = await this.prisma.gitRepository.findUnique({ where: { bandId } });
    if (!repo) {
      throw new NotFoundException('No GitHub repository connected to this Band');
    }
    return repo;
  }
}
