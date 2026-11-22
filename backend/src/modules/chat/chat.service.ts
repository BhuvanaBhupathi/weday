import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { bandUserSelect, flattenAuthor } from '../../common/signature-colors';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getChannels(bandId: string) {
    let channels = await this.prisma.chatChannel.findMany({
      where: { bandId },
      orderBy: { order: 'asc' },
    });

    // Auto-create #general if no channels exist yet
    if (channels.length === 0) {
      const general = await this.prisma.chatChannel.create({
        data: {
          bandId,
          name: 'general',
          slug: 'general',
          description: 'General workspace discussion',
          isDefault: true,
          order: 0,
        },
      });
      channels = [general];
    }

    return channels;
  }

  async createChannel(bandId: string, name: string, description?: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.prisma.chatChannel.findUnique({
      where: { bandId_slug: { bandId, slug } },
    });
    if (existing) {
      throw new BadRequestException(`Channel #${slug} already exists in this Band`);
    }

    return this.prisma.chatChannel.create({
      data: {
        bandId,
        name,
        slug,
        description,
      },
    });
  }

  async getChannelMessages(channelId: string, limit = 50) {
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: { id: true, bandId: true },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const messages = await this.prisma.chatMessage.findMany({
      where: { channelId, deletedAt: null },
      include: {
        author: bandUserSelect(channel.bandId),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map((m) => ({ ...m, author: flattenAuthor(m.author) }));
  }

  async sendChannelMessage(channelId: string, authorId: string, content: string, threadParentId?: string) {
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: { id: true, bandId: true },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const message = await this.prisma.chatMessage.create({
      data: {
        channelId,
        authorId,
        content,
        threadParentId,
      },
      include: {
        author: bandUserSelect(channel.bandId),
      },
    });

    return { ...message, author: flattenAuthor(message.author) };
  }

  async getDirectMessages(userId: string, targetUserId: string, limit = 50) {
    return this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
        deletedAt: null,
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async sendDirectMessage(senderId: string, receiverId: string, content: string) {
    return this.prisma.directMessage.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }
}
