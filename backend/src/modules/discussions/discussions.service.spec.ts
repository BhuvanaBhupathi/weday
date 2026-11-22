import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { DiscussionStatus, BandMemberRole } from '@prisma/client';

describe('DiscussionsService', () => {
  let service: DiscussionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      discussion: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      discussionReply: {
        create: vi.fn(),
      },
      bandMembership: {
        findUnique: vi.fn(),
      },
    };
    service = new DiscussionsService(mockPrisma);
  });

  it('builds a case-insensitive chat search across title, description, code and replies', async () => {
    mockPrisma.discussion.findMany.mockResolvedValue([]);

    await service.getBandDiscussions('band-1', undefined, undefined, '  redis pool  ');

    expect(mockPrisma.discussion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bandId: 'band-1',
          OR: [
            { title: { contains: 'redis pool', mode: 'insensitive' } },
            { description: { contains: 'redis pool', mode: 'insensitive' } },
            { codeContext: { contains: 'redis pool', mode: 'insensitive' } },
            { replies: { some: { content: { contains: 'redis pool', mode: 'insensitive' } } } },
          ],
        }),
      }),
    );
  });

  it('omits the search filter when search is blank or absent', async () => {
    mockPrisma.discussion.findMany.mockResolvedValue([]);

    await service.getBandDiscussions('band-1', 'src/a.ts', DiscussionStatus.OPEN, '   ');

    const where = mockPrisma.discussion.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
    expect(where.filePath).toBe('src/a.ts');
    expect(where.status).toBe(DiscussionStatus.OPEN);
  });

  describe('deleteDiscussion', () => {
    beforeEach(() => {
      mockPrisma.discussion.findFirst.mockResolvedValue({
        id: 'disc-1',
        bandId: 'band-1',
      });
    });

    it('lets a Band Admin (creator/lead) delete the discussion', async () => {
      mockPrisma.bandMembership.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: BandMemberRole.ADMIN,
      });
      mockPrisma.discussion.delete.mockResolvedValue({ id: 'disc-1' });

      const res = await service.deleteDiscussion('band-1', 'admin-1', 'disc-1');

      expect(mockPrisma.discussion.delete).toHaveBeenCalledWith({ where: { id: 'disc-1' } });
      expect(res.id).toBe('disc-1');
    });

    it('forbids a regular MEMBER from deleting', async () => {
      mockPrisma.bandMembership.findUnique.mockResolvedValue({
        id: 'mem-2',
        role: BandMemberRole.MEMBER,
      });

      await expect(
        service.deleteDiscussion('band-1', 'member-1', 'disc-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.discussion.delete).not.toHaveBeenCalled();
    });

    it('forbids a non-member from deleting', async () => {
      mockPrisma.bandMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteDiscussion('band-1', 'outsider-1', 'disc-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 for a discussion in another band or that does not exist', async () => {
      mockPrisma.discussion.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteDiscussion('band-1', 'admin-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
