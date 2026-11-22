import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CanvasService } from './canvas.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreatePageDto,
  RenameVersionDto,
  SaveVersionDto,
  SyncPageStateDto,
  UpdatePageDto,
} from './dto/canvas.dto';

@Controller('bands/:bandId/canvas')
export class CanvasController {
  constructor(private readonly canvasService: CanvasService) {}

  // ── Canvas state ──────────────────────────────────────────────────────────

  @Get()
  async getCanvas(@Param('bandId') bandId: string, @CurrentUser() user: User) {
    return this.canvasService.getCanvas(bandId, user.id);
  }

  // ── Pages ────────────────────────────────────────────────────────────────

  @Post('pages')
  async createPage(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreatePageDto,
  ) {
    return this.canvasService.createPage(bandId, user.id, dto);
  }

  @Patch('pages/:pageId')
  async updatePage(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.canvasService.updatePage(bandId, user.id, pageId, dto);
  }

  @Delete('pages/:pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('pageId') pageId: string,
  ) {
    return this.canvasService.deletePage(bandId, user.id, pageId);
  }

  @Put('pages/:pageId/state')
  async syncPageState(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('pageId') pageId: string,
    @Body() dto: SyncPageStateDto,
  ) {
    return this.canvasService.syncPageState(bandId, user.id, pageId, dto);
  }

  // ── Versions ──────────────────────────────────────────────────────────────

  @Get('versions')
  async getVersions(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Query('search') search?: string,
  ) {
    return this.canvasService.getVersions(bandId, user.id, search);
  }

  @Post('versions')
  async saveVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: SaveVersionDto,
  ) {
    return this.canvasService.saveVersion(bandId, user.id, dto);
  }

  @Get('versions/:versionId/compare')
  async compareVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('versionId') versionId: string,
    @Query('other') other = 'current',
  ) {
    return this.canvasService.compareVersion(bandId, user.id, versionId, other);
  }

  @Post('versions/:versionId/restore')
  async restoreVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('versionId') versionId: string,
  ) {
    return this.canvasService.restoreVersion(bandId, user.id, versionId);
  }

  @Get('versions/:versionId')
  async getVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('versionId') versionId: string,
  ) {
    return this.canvasService.getVersion(bandId, user.id, versionId);
  }

  @Patch('versions/:versionId')
  async renameVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('versionId') versionId: string,
    @Body() dto: RenameVersionDto,
  ) {
    return this.canvasService.renameVersion(bandId, user.id, versionId, dto);
  }

  @Delete('versions/:versionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Param('versionId') versionId: string,
  ) {
    return this.canvasService.deleteVersion(bandId, user.id, versionId);
  }
}
