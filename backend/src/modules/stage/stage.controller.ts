import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { StageService } from './stage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bands/:bandId/stage')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Get()
  async getStage(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
  ) {
    return this.stageService.getStage(bandId, user.id);
  }

  @Post('boards')
  async createBoard(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.stageService.createBoard(bandId, user.id, name, description);
  }

  @Get('boards/:boardId')
  async getBoard(@Param('boardId') boardId: string) {
    return this.stageService.getBoard(boardId);
  }

  @Patch('boards/:boardId')
  async updateBoard(
    @Param('boardId') boardId: string,
    @Body('tlDrawData') tlDrawData: any,
    @Body('thumbnailUrl') thumbnailUrl?: string,
  ) {
    return this.stageService.updateBoard(boardId, tlDrawData, thumbnailUrl);
  }
}
