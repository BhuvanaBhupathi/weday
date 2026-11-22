import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from './events.gateway';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  bandId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  payload?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getUserNotifications(userId: string, unreadOnly = false, limit = 50) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        band: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async createNotification(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        bandId: input.bandId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload,
      },
      include: {
        band: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Realtime dispatch via WebSocket
    this.eventsGateway.emitToUser(input.userId, 'notification:received', notification);

    return notification;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    this.eventsGateway.emitToUser(userId, 'notification:read', { id: notificationId });
    return updated;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    this.eventsGateway.emitToUser(userId, 'notification:all_read', { count: result.count });
    return { count: result.count };
  }
}
