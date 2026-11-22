import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { DiscussionStatus } from '@prisma/client';
import { DiscussionsService } from './discussions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDiscussionDto, AddReplyDto, UpdateDiscussionStatusDto } from './dto/discussion.dto';

@Controller('bands/:bandId/discussions')
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Get()
  async getDiscussions(
    @Param('bandId') bandId: string,
    @Query('filePath') filePath?: string,
    @Query('status') status?: DiscussionStatus,
    @Query('search') search?: string,
  ) {
    return this.discussionsService.getBandDiscussions(bandId, filePath, status, search);
  }

  @Get(':discussionId')
  async getDiscussion(
    @Param('bandId') bandId: string,
    @Param('discussionId') discussionId: string,
  ) {
    return this.discussionsService.getDiscussion(bandId, discussionId);
  }

  @Post()
  async createDiscussion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateDiscussionDto,
  ) {
    return this.discussionsService.createDiscussion(bandId, user.id, dto);
  }

  @Post(':discussionId/replies')
  async addReply(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: AddReplyDto,
  ) {
    return this.discussionsService.addReply(discussionId, user.id, dto);
  }

  @Patch(':discussionId/status')
  async updateStatus(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateDiscussionStatusDto,
  ) {
    return this.discussionsService.updateStatus(discussionId, user.id, dto);
  }

  /** Delete an anchored discussion (Band creator / Crew Lead only). */
  @Delete(':discussionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDiscussion(
    @Param('bandId') bandId: string,
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
  ) {
    return this.discussionsService.deleteDiscussion(bandId, user.id, discussionId);
  }
}
