import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateConcernDto, UpdateConcernStatusDto } from './dto/concern.dto';
import { ConcernStatus } from '@prisma/client';
import { bandUserSelect, flattenAuthor } from '../../common/signature-colors';

@Injectable()
export class ConcernsService {
  private readonly logger = new Logger(ConcernsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBandConcerns(bandId: string, status?: ConcernStatus) {
    const concerns = await this.prisma.concern.findMany({
      where: {
        bandId,
        ...(status ? { status } : {}),
      },
      include: {
        reporter: bandUserSelect(bandId),
        assignee: bandUserSelect(bandId),
        discussion: {
          select: { id: true, title: true, filePath: true, startLine: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return concerns.map((c) => ({
      ...c,
      reporter: flattenAuthor(c.reporter),
      assignee: flattenAuthor(c.assignee),
    }));
  }

  async createConcern(bandId: string, userId: string, dto: CreateConcernDto) {
    const concern = await this.prisma.concern.create({
      data: {
        bandId,
        reporterId: userId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        discussionId: dto.discussionId,
        assigneeId: dto.assigneeId,
        status: ConcernStatus.OPEN,
      },
      include: {
        reporter: bandUserSelect(bandId),
        assignee: bandUserSelect(bandId),
      },
    });

    return { ...concern, reporter: flattenAuthor(concern.reporter), assignee: flattenAuthor(concern.assignee) };
  }

  async updateStatus(concernId: string, userId: string, dto: UpdateConcernStatusDto) {
    const concern = await this.prisma.concern.findUnique({ where: { id: concernId } });
    if (!concern) throw new NotFoundException('Concern not found');

    const resolvedAt = dto.status === ConcernStatus.RESOLVED ? new Date() : concern.resolvedAt;
    const verifiedAt = dto.status === ConcernStatus.VERIFIED ? new Date() : concern.verifiedAt;

    return this.prisma.concern.update({
      where: { id: concernId },
      data: {
        status: dto.status,
        assigneeId: dto.assigneeId !== undefined ? dto.assigneeId : concern.assigneeId,
        resolvedAt,
        verifiedAt,
      },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }
}
