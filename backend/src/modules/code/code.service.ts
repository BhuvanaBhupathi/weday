import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OwnershipType, SuggestedEditStatus } from '@prisma/client';

export interface AssignOwnershipInput {
  path: string;
  isDirectory?: boolean;
  userId: string;
  ownershipType?: OwnershipType;
}

export interface CreateSuggestedEditInput {
  filePath: string;
  branch: string;
  commitSha?: string;
  startLine?: number;
  endLine?: number;
  originalCode: string;
  suggestedCode: string;
  reason?: string;
  discussionId?: string;
}

@Injectable()
export class CodeService {
  private readonly logger = new Logger(CodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOwnerships(bandId: string) {
    return this.prisma.codeOwnership.findMany({
      where: { bandId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { path: 'asc' },
    });
  }

  async assignOwnership(bandId: string, assignedById: string, input: AssignOwnershipInput) {
    return this.prisma.codeOwnership.upsert({
      where: {
        bandId_path_userId: {
          bandId,
          path: input.path,
          userId: input.userId,
        },
      },
      update: {
        ownershipType: input.ownershipType ?? OwnershipType.OWNER,
        isDirectory: input.isDirectory ?? false,
      },
      create: {
        bandId,
        path: input.path,
        isDirectory: input.isDirectory ?? false,
        userId: input.userId,
        ownershipType: input.ownershipType ?? OwnershipType.OWNER,
        assignedById,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async removeOwnership(bandId: string, ownershipId: string) {
    const ownership = await this.prisma.codeOwnership.findUnique({ where: { id: ownershipId } });
    if (!ownership || ownership.bandId !== bandId) {
      throw new NotFoundException('Ownership not found');
    }
    await this.prisma.codeOwnership.delete({ where: { id: ownershipId } });
    return { success: true };
  }

  async getSuggestedEdits(bandId: string, filePath?: string) {
    return this.prisma.suggestedEdit.findMany({
      where: {
        bandId,
        ...(filePath ? { filePath } : {}),
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSuggestedEdit(bandId: string, userId: string, input: CreateSuggestedEditInput) {
    return this.prisma.suggestedEdit.create({
      data: {
        bandId,
        authorId: userId,
        filePath: input.filePath,
        branch: input.branch,
        commitSha: input.commitSha,
        startLine: input.startLine,
        endLine: input.endLine,
        originalCode: input.originalCode,
        suggestedCode: input.suggestedCode,
        reason: input.reason,
        discussionId: input.discussionId,
        status: SuggestedEditStatus.PENDING,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async reviewSuggestedEdit(
    editId: string,
    reviewerId: string,
    status: SuggestedEditStatus,
    reviewNote?: string,
  ) {
    const edit = await this.prisma.suggestedEdit.findUnique({ where: { id: editId } });
    if (!edit) throw new NotFoundException('Suggested edit not found');

    return this.prisma.suggestedEdit.update({
      where: { id: editId },
      data: {
        status,
        reviewedById: reviewerId,
        reviewNote,
        reviewedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }
}
