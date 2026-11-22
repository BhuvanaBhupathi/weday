import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { SuggestedEditStatus } from '@prisma/client';
import { CodeService, type AssignOwnershipInput, type CreateSuggestedEditInput } from './code.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bands/:bandId/code')
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Get('ownership')
  async getOwnerships(@Param('bandId') bandId: string) {
    return this.codeService.getOwnerships(bandId);
  }

  @Post('ownership')
  async assignOwnership(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() input: AssignOwnershipInput,
  ) {
    return this.codeService.assignOwnership(bandId, user.id, input);
  }

  @Delete('ownership/:ownershipId')
  async removeOwnership(
    @Param('bandId') bandId: string,
    @Param('ownershipId') ownershipId: string,
  ) {
    return this.codeService.removeOwnership(bandId, ownershipId);
  }

  @Get('suggested-edits')
  async getSuggestedEdits(
    @Param('bandId') bandId: string,
    @Query('filePath') filePath?: string,
  ) {
    return this.codeService.getSuggestedEdits(bandId, filePath);
  }

  @Post('suggested-edits')
  async createSuggestedEdit(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() input: CreateSuggestedEditInput,
  ) {
    return this.codeService.createSuggestedEdit(bandId, user.id, input);
  }

  @Patch('suggested-edits/:editId/review')
  async reviewSuggestedEdit(
    @Param('editId') editId: string,
    @CurrentUser() user: User,
    @Body('status') status: SuggestedEditStatus,
    @Body('reviewNote') reviewNote?: string,
  ) {
    return this.codeService.reviewSuggestedEdit(editId, user.id, status, reviewNote);
  }
}
