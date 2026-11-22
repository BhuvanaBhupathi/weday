import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { BandsService } from './bands.service';
import { SIGNATURE_COLOR_PALETTE } from '../../common/signature-colors';
import { BandMemberRole } from '@prisma/client';

describe('BandsService — signature colors', () => {
  let service: BandsService;
  let mockPrisma: any;

  const member = (over: Record<string, unknown> = {}) => ({
    id: 'mem-1',
    userId: 'user-1',
    bandId: 'band-1',
    role: BandMemberRole.MEMBER,
    signatureColor: null,
    joinedAt: new Date(),
    ...over,
  });

  beforeEach(() => {
    mockPrisma = {
      band: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      bandMembership: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      chatChannel: { createMany: vi.fn() },
      stage: { create: vi.fn() },
      architecture: { create: vi.fn() },
      pRD: { create: vi.fn() },
      notification: { deleteMany: vi.fn() },
      projectRelationship: { deleteMany: vi.fn() },
      aiJob: { deleteMany: vi.fn() },
    };
    service = new BandsService(mockPrisma);
  });

  it('assigns the first palette color to the band creator', async () => {
    const tx = {
      band: { create: vi.fn().mockResolvedValue({ id: 'band-1' }) },
      chatChannel: { createMany: vi.fn().mockResolvedValue({}) },
      stage: { create: vi.fn().mockResolvedValue({}) },
      architecture: { create: vi.fn().mockResolvedValue({}) },
      pRD: { create: vi.fn().mockResolvedValue({}) },
    };
    mockPrisma.$transaction = vi.fn((fn: any) => fn(tx));

    await service.createBand('user-1', { name: 'Test Band' } as any);

    expect(tx.band.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberships: expect.objectContaining({
            create: expect.objectContaining({
              userId: 'user-1',
              role: BandMemberRole.ADMIN,
              signatureColor: SIGNATURE_COLOR_PALETTE[0],
            }),
          }),
        }),
      }),
    );
  });

  it('assigns the next free palette color to a user joining via code', async () => {
    mockPrisma.band.findUnique.mockResolvedValue({ id: 'band-1', name: 'Test Band', joinCode: 'QRT-8X4P' });
    mockPrisma.bandMembership.findUnique.mockResolvedValue(null);
    // Existing members already hold the first two palette colors (one legacy null).
    mockPrisma.bandMembership.findMany.mockResolvedValue([
      { signatureColor: SIGNATURE_COLOR_PALETTE[0] },
      { signatureColor: null },
    ]);
    mockPrisma.bandMembership.create.mockImplementation(({ data }: any) =>
      Promise.resolve(member({ ...data })),
    );

    const { membership } = await service.joinByCode('user-2', 'QRT-8X4P');

    expect(membership.signatureColor).toBe(SIGNATURE_COLOR_PALETTE[1]);
    expect(mockPrisma.bandMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-2',
          signatureColor: SIGNATURE_COLOR_PALETTE[1],
        }),
      }),
    );
  });

  it('backfills missing colors on getBandMembers, preserving existing colors', async () => {
    mockPrisma.bandMembership.findUnique.mockResolvedValue(member({ role: BandMemberRole.MEMBER }));
    // First findMany (backfill scan): two colored, one null.
    // Second findMany (final list): as stored.
    mockPrisma.bandMembership.findMany
      .mockResolvedValueOnce([
        { id: 'm-1', signatureColor: SIGNATURE_COLOR_PALETTE[0] },
        { id: 'm-2', signatureColor: SIGNATURE_COLOR_PALETTE[1] },
        { id: 'm-3', signatureColor: null },
      ])
      .mockResolvedValueOnce([
        member({ id: 'm-1', signatureColor: SIGNATURE_COLOR_PALETTE[0] }),
        member({ id: 'm-2', signatureColor: SIGNATURE_COLOR_PALETTE[1] }),
        member({ id: 'm-3', signatureColor: SIGNATURE_COLOR_PALETTE[2] }),
      ]);
    mockPrisma.bandMembership.update.mockImplementation(({ where, data }: any) =>
      Promise.resolve({ id: where.id, ...data }),
    );

    const members = await service.getBandMembers('band-1', 'user-1');

    expect(mockPrisma.bandMembership.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.bandMembership.update).toHaveBeenCalledWith({
      where: { id: 'm-3' },
      data: { signatureColor: SIGNATURE_COLOR_PALETTE[2] },
    });
    expect(members).toHaveLength(3);
  });

  it('does nothing in backfill when every member already has a color', async () => {
    mockPrisma.bandMembership.findUnique.mockResolvedValue(member());
    mockPrisma.bandMembership.findMany
      .mockResolvedValueOnce([
        { id: 'm-1', signatureColor: SIGNATURE_COLOR_PALETTE[0] },
        { id: 'm-2', signatureColor: SIGNATURE_COLOR_PALETTE[1] },
      ])
      .mockResolvedValueOnce([
        member({ id: 'm-1', signatureColor: SIGNATURE_COLOR_PALETTE[0] }),
        member({ id: 'm-2', signatureColor: SIGNATURE_COLOR_PALETTE[1] }),
      ]);

    await service.getBandMembers('band-1', 'user-1');

    expect(mockPrisma.bandMembership.update).not.toHaveBeenCalled();
  });

  describe('updateSignatureColor', () => {
    beforeEach(() => {
      mockPrisma.bandMembership.findUnique.mockResolvedValue(member());
    });

    it('lets a member change their own color', async () => {
      mockPrisma.bandMembership.findFirst.mockResolvedValue(null);
      mockPrisma.bandMembership.update.mockResolvedValue(member({ signatureColor: '#f783ac' }));

      await service.updateSignatureColor('band-1', 'user-1', 'user-1', '#f783ac');

      expect(mockPrisma.bandMembership.update).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
        data: { signatureColor: '#f783ac' },
      });
    });

    it('forbids non-admins from changing someone else\'s color', async () => {
      await expect(
        service.updateSignatureColor('band-1', 'user-1', 'user-2', '#f783ac'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admins to change any member\'s color', async () => {
      mockPrisma.bandMembership.findUnique.mockResolvedValue(
        member({ role: BandMemberRole.ADMIN }),
      );
      mockPrisma.bandMembership.findFirst.mockResolvedValue(null);
      mockPrisma.bandMembership.update.mockResolvedValue(member({ signatureColor: '#f783ac' }));

      await service.updateSignatureColor('band-1', 'user-1', 'user-2', '#f783ac');

      expect(mockPrisma.bandMembership.update).toHaveBeenCalled();
    });

    it('rejects a color already taken by another member in the band', async () => {
      mockPrisma.bandMembership.findFirst.mockResolvedValue({ id: 'mem-other' });

      await expect(
        service.updateSignatureColor('band-1', 'user-1', 'user-1', '#9775fa'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
