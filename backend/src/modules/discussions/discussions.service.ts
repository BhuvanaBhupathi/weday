import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreateDiscussionDto, AddReplyDto, UpdateDiscussionStatusDto } from './dto/discussion.dto';
import { DiscussionStatus, BandMemberRole } from '@prisma/client';
import { bandUserSelect, flattenAuthor } from '../../common/signature-colors';

@Injectable()
export class DiscussionsService {
  private readonly logger = new Logger(DiscussionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBandDiscussions(bandId: string, filePath?: string, status?: DiscussionStatus, search?: string) {
    const discussions = await this.prisma.discussion.findMany({
      where: {
        bandId,
        ...(filePath ? { filePath } : {}),
        ...(status ? { status } : {}),
        // Chat search: matches discussion text and any reply in the thread.
        ...(search?.trim()
          ? {
              OR: [
                { title: { contains: search.trim(), mode: 'insensitive' } },
                { description: { contains: search.trim(), mode: 'insensitive' } },
                { codeContext: { contains: search.trim(), mode: 'insensitive' } },
                {
                  replies: {
                    some: { content: { contains: search.trim(), mode: 'insensitive' } },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        author: bandUserSelect(bandId),
        _count: {
          select: { replies: true, concerns: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return discussions.map((d) => ({ ...d, author: flattenAuthor(d.author) }));
  }

  async getDiscussion(bandId: string, discussionId: string) {
    const discussion = await this.prisma.discussion.findFirst({
      where: { id: discussionId, bandId },
      include: {
        author: bandUserSelect(bandId),
        replies: {
          include: {
            author: bandUserSelect(bandId),
          },
          orderBy: { createdAt: 'asc' },
        },
        concerns: true,
      },
    });

    if (!discussion) throw new NotFoundException('Discussion not found');

    return {
      ...discussion,
      author: flattenAuthor(discussion.author),
      replies: discussion.replies.map((r) => ({ ...r, author: flattenAuthor(r.author) })),
    };
  }

  async createDiscussion(bandId: string, userId: string, dto: CreateDiscussionDto) {
    let fingerprint: string | null = null;
    if (dto.codeContext) {
      fingerprint = createHash('sha256')
        .update(dto.codeContext.trim().replace(/\r\n/g, '\n'))
        .digest('hex');
    }

    const created = await this.prisma.discussion.create({
      data: {
        bandId,
        authorId: userId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        filePath: dto.filePath,
        startLine: dto.startLine,
        endLine: dto.endLine,
        codeContext: dto.codeContext,
        codeFingerprint: fingerprint,
        anchorConfidence: dto.codeContext ? 1.0 : null,
        branch: dto.branch,
        commitSha: dto.commitSha,
      },
      include: {
        author: bandUserSelect(bandId),
      },
    });

    return { ...created, author: flattenAuthor(created.author) };
  }

  async addReply(discussionId: string, userId: string, dto: AddReplyDto) {
    const discussion = await this.prisma.discussion.findUnique({ where: { id: discussionId } });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const reply = await this.prisma.discussionReply.create({
      data: {
        discussionId,
        authorId: userId,
        content: dto.content,
      },
      include: {
        author: bandUserSelect(discussion.bandId),
      },
    });

    return { ...reply, author: flattenAuthor(reply.author) };
  }

  async updateStatus(discussionId: string, userId: string, dto: UpdateDiscussionStatusDto) {
    const discussion = await this.prisma.discussion.findUnique({ where: { id: discussionId } });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const isResolved = dto.status === DiscussionStatus.RESOLVED;
    return this.prisma.discussion.update({
      where: { id: discussionId },
      data: {
        status: dto.status,
        resolvedAt: isResolved ? new Date() : null,
        resolvedById: isResolved ? userId : null,
      },
    });
  }

  /**
   * Delete a discussion and its replies (cascades). Only the Band creator or
   * a Band Admin (Crew Lead) may delete anchored discussions.
   */
  async deleteDiscussion(bandId: string, requestingUserId: string, discussionId: string) {
    const discussion = await this.prisma.discussion.findFirst({
      where: { id: discussionId, bandId },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const membership = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId: requestingUserId, bandId } },
    });
    if (!membership || membership.role !== BandMemberRole.ADMIN) {
      throw new ForbiddenException('Only the Band creator or a Crew Lead can delete discussions');
    }

    return this.prisma.discussion.delete({ where: { id: discussionId } });
  }
}
