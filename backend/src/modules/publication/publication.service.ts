import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import {
  UpdatePublicationDto,
  PublishVersionDto,
  ClientSubmitCrDto,
} from './dto/publication.dto';
import { ChangeRequestSource, ChangeRequestStatus, TaskStatus } from '@prisma/client';

@Injectable()
export class PublicationService {
  private readonly logger = new Logger(PublicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─── ADMIN: Manage Publication Settings ─────────────────────────────────────

  async getPublication(bandId: string) {
    let pub = await this.prisma.clientPublication.findUnique({
      where: { bandId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            publishedBy: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!pub) {
      // Auto-initialize publication configuration with default slug
      const band = await this.prisma.band.findUnique({ where: { id: bandId } });
      if (!band) throw new NotFoundException('Band not found');

      pub = await this.prisma.clientPublication.create({
        data: {
          bandId,
          publicSlug: band.slug || `band-${Date.now().toString().slice(-6)}`,
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: {
              publishedBy: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
            },
          },
        },
      });
    }

    return pub;
  }

  async updatePublication(bandId: string, dto: UpdatePublicationDto) {
    const existing = await this.getPublication(bandId);

    // Check slug collision
    if (dto.publicSlug !== existing.publicSlug) {
      const collision = await this.prisma.clientPublication.findUnique({
        where: { publicSlug: dto.publicSlug },
      });
      if (collision && collision.bandId !== bandId) {
        throw new BadRequestException('This public URL slug is already in use');
      }
    }

    let passwordHash = existing.passwordHash;
    if (dto.isPasswordProtected && dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    } else if (dto.isPasswordProtected === false) {
      passwordHash = null;
    }

    return this.prisma.clientPublication.update({
      where: { bandId },
      data: {
        publicSlug: dto.publicSlug,
        isPasswordProtected: dto.isPasswordProtected ?? existing.isPasswordProtected,
        passwordHash,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            publishedBy: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  // ─── ADMIN: Publish Snapshot ───────────────────────────────────────────────

  async publishSnapshot(bandId: string, userId: string, dto: PublishVersionDto) {
    const pub = await this.getPublication(bandId);

    // Collect full current workspace state
    const [band, prd, requirements, milestones, decisions, changeRequests, concerns] =
      await Promise.all([
        this.prisma.band.findUnique({ where: { id: bandId } }),
        this.prisma.pRD.findUnique({
          where: { bandId },
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        }),
        this.prisma.requirement.findMany({
          where: { bandId },
          orderBy: { order: 'asc' },
          select: {
            identifier: true,
            title: true,
            description: true,
            priority: true,
            status: true,
            changeState: true,
            acceptanceCriteria: true,
          },
        }),
        this.prisma.milestone.findMany({
          where: { bandId },
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              select: { id: true, status: true },
            },
          },
        }),
        this.prisma.decision.findMany({
          where: { bandId, status: 'ACCEPTED' },
          orderBy: { createdAt: 'desc' },
          select: {
            identifier: true,
            title: true,
            rationale: true,
            status: true,
            decidedAt: true,
          },
        }),
        this.prisma.changeRequest.findMany({
          where: { bandId },
          orderBy: { createdAt: 'desc' },
          select: {
            identifier: true,
            title: true,
            description: true,
            source: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.concern.findMany({
          where: { bandId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        }),
      ]);

    const mappedMilestones = (milestones as any[]).map((m: any) => {
      const total = m.tasks.length;
      const done = m.tasks.filter((t: any) => t.status === TaskStatus.DONE).length;
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        targetDate: m.targetDate,
        totalTasks: total,
        completedTasks: done,
        progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    const nextVersionNumber = pub.versions.length > 0 ? pub.versions[0].versionNumber + 1 : 1;

    const snapshotData = {
      project: {
        name: band?.name || 'Project',
        slug: band?.slug || '',
        description: band?.description || '',
      },
      publishedAt: new Date().toISOString(),
      versionNumber: nextVersionNumber,
      title: dto.title,
      summary: dto.summary || '',
      prd: {
        title: prd?.title || 'Software PRD',
        content: prd?.versions?.[0]?.content || '',
      },
      requirements,
      milestones: mappedMilestones,
      decisions,
      changeRequests,
      concerns,
    };

    const newVersion = await this.prisma.clientPublicationVersion.create({
      data: {
        publicationId: pub.id,
        versionNumber: nextVersionNumber,
        title: dto.title,
        summary: dto.summary,
        snapshotData,
        publishedById: userId,
      },
      include: {
        publishedBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    await this.prisma.clientPublication.update({
      where: { id: pub.id },
      data: { currentVersionId: newVersion.id },
    });

    this.eventsGateway.emitToBand(bandId, 'publication:published', newVersion);
    return newVersion;
  }

  // ─── PUBLIC: Client Portal Access ──────────────────────────────────────────

  async getPublicSnapshot(slug: string) {
    const pub = await this.prisma.clientPublication.findUnique({
      where: { publicSlug: slug },
      include: {
        band: { select: { id: true, name: true, slug: true, description: true } },
      },
    });

    if (!pub) throw new NotFoundException('Client publication not found');

    if (pub.isPasswordProtected) {
      return {
        isPasswordProtected: true,
        bandName: pub.band.name,
        slug: pub.publicSlug,
      };
    }

    return this.resolveCurrentSnapshot(pub.id, pub.band);
  }

  async verifyPassword(slug: string, passwordAttempt: string) {
    const pub = await this.prisma.clientPublication.findUnique({
      where: { publicSlug: slug },
      include: {
        band: { select: { id: true, name: true, slug: true, description: true } },
      },
    });

    if (!pub) throw new NotFoundException('Client publication not found');

    if (!pub.passwordHash || !(await bcrypt.compare(passwordAttempt, pub.passwordHash))) {
      throw new UnauthorizedException('Incorrect publication password');
    }

    return this.resolveCurrentSnapshot(pub.id, pub.band);
  }

  private async resolveCurrentSnapshot(publicationId: string, band: any) {
    const version = await this.prisma.clientPublicationVersion.findFirst({
      where: { publicationId },
      orderBy: { versionNumber: 'desc' },
      include: {
        publishedBy: {
          select: { displayName: true },
        },
      },
    });

    if (!version) {
      return {
        isPasswordProtected: false,
        bandName: band.name,
        hasPublishedVersion: false,
        message: 'No published version available yet. The engineering team is preparing the initial projection.',
      };
    }

    return {
      isPasswordProtected: false,
      hasPublishedVersion: true,
      bandName: band.name,
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt,
      publishedBy: version.publishedBy?.displayName || 'Engineering Lead',
      snapshot: version.snapshotData,
    };
  }

  // ─── PUBLIC: Client Submit Change Request ──────────────────────────────────

  async submitClientChangeRequest(slug: string, dto: ClientSubmitCrDto) {
    const pub = await this.prisma.clientPublication.findUnique({
      where: { publicSlug: slug },
      include: { band: true },
    });
    if (!pub) throw new NotFoundException('Publication not found');

    // Find author to associate (band creator or first member)
    const band = pub.band;
    const authorId = band.creatorId;

    // Find target requirement if identifier provided
    let targetRequirementId: string | null = null;
    if (dto.targetRequirementIdentifier) {
      const req = await this.prisma.requirement.findFirst({
        where: { bandId: band.id, identifier: dto.targetRequirementIdentifier },
      });
      if (req) targetRequirementId = req.id;
    }

    const count = await this.prisma.changeRequest.count({ where: { bandId: band.id } });
    const identifier = `CR-${String(count + 1).padStart(3, '0')}`;

    const cr = await this.prisma.changeRequest.create({
      data: {
        identifier,
        bandId: band.id,
        authorId,
        source: ChangeRequestSource.CLIENT,
        title: dto.title,
        description: dto.description,
        targetRequirementId,
        status: ChangeRequestStatus.PENDING,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        targetRequirement: {
          select: { id: true, identifier: true, title: true },
        },
      },
    });

    this.eventsGateway.emitToBand(band.id, 'change_request:created', cr);
    return {
      success: true,
      message: 'Change request submitted for review by the engineering crew',
      identifier: cr.identifier,
    };
  }
}
