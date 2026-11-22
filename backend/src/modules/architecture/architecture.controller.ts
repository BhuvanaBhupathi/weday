import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { ArchitectureService, type ArchitectureGraphInput, type SaveBoardDto } from './architecture.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bands/:bandId/architecture')
export class ArchitectureController {
  constructor(private readonly architectureService: ArchitectureService) {}

  @Get()
  async getArchitecture(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
  ) {
    return this.architectureService.getArchitecture(bandId, user.id);
  }

  @Post('generate-from-prd')
  async generateFromPrd(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body('content') content?: string,
  ) {
    return this.architectureService.generateArchitectureFromPrd(bandId, user.id, content);
  }

  @Get('validate')
  async validateArchitecture(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
  ) {
    return this.architectureService.validateArchitecture(bandId, user.id);
  }

  @Post('versions')
  async saveVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() input: ArchitectureGraphInput,
  ) {
    return this.architectureService.saveVersion(bandId, user.id, input);
  }

  @Get('compare')
  async compareVersions(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.architectureService.compareVersions(bandId, user.id, Number(from), Number(to));
  }

  @Get('search')
  async searchArchitecture(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Query('q') q: string,
  ) {
    return this.architectureService.searchArchitecture(bandId, user.id, q || '');
  }

  @Get('nodes/:nodeId/why')
  async getWhyTracing(
    @Param('bandId') bandId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
  ) {
    return this.architectureService.getWhyTracing(bandId, user.id, nodeId);
  }

  @Get('nodes/:nodeId/impact')
  async getImpactAnalysis(
    @Param('bandId') bandId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
  ) {
    return this.architectureService.getImpactAnalysis(bandId, user.id, nodeId);
  }

  @Get('boards')
  async getBoards(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
  ) {
    return this.architectureService.getBoards(bandId, user.id);
  }

  @Post('boards')
  async saveBoard(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: SaveBoardDto,
  ) {
    return this.architectureService.saveBoard(bandId, user.id, dto);
  }

  @Delete('boards/:boardId')
  async deleteBoard(
    @Param('bandId') bandId: string,
    @Param('boardId') boardId: string,
    @CurrentUser() user: User,
  ) {
    return this.architectureService.deleteBoard(bandId, user.id, boardId);
  }

  @Post('approve')
  async approveArchitecture(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
  ) {
    return this.architectureService.approveArchitecture(bandId, user.id);
  }
}
