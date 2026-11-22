import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('bands/:bandId/chat/channels')
  async getChannels(@Param('bandId') bandId: string) {
    return this.chatService.getChannels(bandId);
  }

  @Post('bands/:bandId/chat/channels')
  async createChannel(
    @Param('bandId') bandId: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.chatService.createChannel(bandId, name, description);
  }

  @Get('chat/channels/:channelId/messages')
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getChannelMessages(channelId, limit ? Number(limit) : 50);
  }

  @Post('chat/channels/:channelId/messages')
  async sendChannelMessage(
    @Param('channelId') channelId: string,
    @CurrentUser() user: User,
    @Body('content') content: string,
    @Body('threadParentId') threadParentId?: string,
  ) {
    return this.chatService.sendChannelMessage(channelId, user.id, content, threadParentId);
  }

  @Get('chat/dms/:targetUserId')
  async getDirectMessages(
    @CurrentUser() user: User,
    @Param('targetUserId') targetUserId: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getDirectMessages(user.id, targetUserId, limit ? Number(limit) : 50);
  }

  @Post('chat/dms/:targetUserId')
  async sendDirectMessage(
    @CurrentUser() user: User,
    @Param('targetUserId') targetUserId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.sendDirectMessage(user.id, targetUserId, content);
  }
}
