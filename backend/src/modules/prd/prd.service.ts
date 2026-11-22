import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';
import type { CreatePrdDto } from './dto/create-prd.dto';
import type { UpdatePrdDto } from './dto/update-prd.dto';

@Injectable()
export class PrdService {
  private readonly logger = new Logger(PrdService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Get the PRD for a Band (creates one if it doesn't exist).
   */
  async getPrd(bandId: string) {
    const prd = await this.prisma.pRD.findUnique({
      where: { bandId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5,
          select: {
            id: true,
            versionNumber: true,
            title: true,
            content: true,
            uploadedFileUrl: true,
            changeSummary: true,
            createdAt: true,
            createdBy: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!prd) {
      throw new NotFoundException('PRD not found for this Band');
    }

    // If there's a current version, get its full content
    if (prd.currentVersionId) {
      const currentVersion = await this.prisma.pRDVersion.findUnique({
        where: { id: prd.currentVersionId },
      });
      return { ...prd, currentVersion };
    }

    return { ...prd, currentVersion: null };
  }

  /**
   * Create or update the PRD content — saves a new version.
   */
  async savePrdVersion(bandId: string, userId: string, dto: UpdatePrdDto) {
    const prd = await this.prisma.pRD.findUnique({ where: { bandId } });
    if (!prd) {
      throw new NotFoundException('PRD not found for this Band');
    }

    // Calculate next version number
    const lastVersion = await this.prisma.pRDVersion.findFirst({
      where: { prdId: prd.id },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // Create new version
    const newVersion = await this.prisma.pRDVersion.create({
      data: {
        prdId: prd.id,
        versionNumber,
        title: dto.title || prd.title,
        content: dto.content,
        changeSummary: dto.changeSummary,
        uploadedFileUrl: dto.uploadedFileUrl,
        createdById: userId,
      },
    });

    // Update the PRD to point to this version
    await this.prisma.pRD.update({
      where: { id: prd.id },
      data: {
        title: dto.title || prd.title,
        currentVersionId: newVersion.id,
      },
    });

    // Record activity
    await this.activityService.record({
      bandId,
      userId,
      type: versionNumber === 1 ? 'PRD_CREATED' : 'PRD_UPDATED',
      payload: { versionNumber, changeSummary: dto.changeSummary },
      relatedArtifactType: 'PRD',
      relatedArtifactId: prd.id,
    });

    this.logger.log(`PRD version ${versionNumber} saved for Band ${bandId}`);
    return newVersion;
  }

  /**
   * Get all versions of the PRD.
   */
  async getPrdVersions(bandId: string) {
    const prd = await this.prisma.pRD.findUnique({ where: { bandId } });
    if (!prd) throw new NotFoundException('PRD not found');

    return this.prisma.pRDVersion.findMany({
      where: { prdId: prd.id },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  /**
   * Get a specific version.
   */
  async getPrdVersion(bandId: string, versionId: string) {
    const prd = await this.prisma.pRD.findUnique({ where: { bandId } });
    if (!prd) throw new NotFoundException('PRD not found');

    return this.prisma.pRDVersion.findFirst({
      where: { id: versionId, prdId: prd.id },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }
}
