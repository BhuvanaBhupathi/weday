import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StageService {
  private readonly logger = new Logger(StageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStage(bandId: string, userId: string) {
    let stage = await this.prisma.stage.findUnique({
      where: { bandId },
      include: {
        boards: { orderBy: { order: 'asc' } },
      },
    });

    if (!stage) {
      stage = await this.prisma.stage.create({
        data: {
          bandId,
          creatorId: userId,
          boards: {
            create: {
              name: 'Main Board',
              slug: 'main-board',
              description: 'Primary visual workspace',
              order: 0,
            },
          },
        },
        include: {
          boards: { orderBy: { order: 'asc' } },
        },
      });
    } else if (stage.boards.length === 0) {
      const defaultBoard = await this.prisma.stageBoard.create({
        data: {
          stageId: stage.id,
          name: 'Main Board',
          slug: 'main-board',
          description: 'Primary visual workspace',
          order: 0,
        },
      });
      stage.boards = [defaultBoard];
    }

    return stage;
  }

  async createBoard(bandId: string, userId: string, name: string, description?: string) {
    const stage = await this.getStage(bandId, userId);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.prisma.stageBoard.findUnique({
      where: { stageId_slug: { stageId: stage.id, slug } },
    });
    if (existing) {
      throw new BadRequestException(`Board ${name} already exists`);
    }

    const maxOrder = stage.boards.reduce((max, b) => Math.max(max, b.order), 0);

    return this.prisma.stageBoard.create({
      data: {
        stageId: stage.id,
        name,
        slug,
        description,
        order: maxOrder + 1,
      },
    });
  }

  async getBoard(boardId: string) {
    const board = await this.prisma.stageBoard.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException('Stage board not found');
    return board;
  }

  async updateBoard(boardId: string, tlDrawData: any, thumbnailUrl?: string) {
    return this.prisma.stageBoard.update({
      where: { id: boardId },
      data: {
        tlDrawData,
        thumbnailUrl,
        updatedAt: new Date(),
      },
    });
  }
}
