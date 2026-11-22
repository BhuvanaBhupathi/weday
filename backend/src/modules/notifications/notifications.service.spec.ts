import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: any;
  let mockEventsGateway: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        findMany: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    mockEventsGateway = {
      emitToUser: vi.fn(),
      emitToBand: vi.fn(),
      broadcast: vi.fn(),
    };
    service = new NotificationsService(mockPrisma, mockEventsGateway);
  });

  it('should create a notification and emit to user via websocket', async () => {
    const fakeNotification = {
      id: 'notif-1',
      userId: 'user-1',
      title: 'New requirement FR-001 added',
      type: NotificationType.ASSIGNMENT,
      readAt: null,
    };
    mockPrisma.notification.create.mockResolvedValue(fakeNotification);

    const result = await service.createNotification({
      userId: 'user-1',
      title: 'New requirement FR-001 added',
      type: NotificationType.ASSIGNMENT,
    });

    expect(result).toEqual(fakeNotification);
    expect(mockPrisma.notification.create).toHaveBeenCalled();
    expect(mockEventsGateway.emitToUser).toHaveBeenCalledWith(
      'user-1',
      'notification:received',
      fakeNotification,
    );
  });

  it('should mark notification as read and emit read event', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      readAt: null,
    });
    mockPrisma.notification.update.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      readAt: new Date(),
    });

    const result = await service.markAsRead('notif-1', 'user-1');
    expect(result.readAt).toBeDefined();
    expect(mockEventsGateway.emitToUser).toHaveBeenCalledWith('user-1', 'notification:read', {
      id: 'notif-1',
    });
  });
});
