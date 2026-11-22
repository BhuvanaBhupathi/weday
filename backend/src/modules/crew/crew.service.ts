import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CrewStatus } from '@prisma/client';

@Injectable()
export class CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMyCrew(userId: string) {
    const relationships = await this.prisma.crewRelationship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: CrewStatus.ACCEPTED,
      },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
        },
        addressee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return relationships.map((rel) => {
      const peer = rel.requesterId === userId ? rel.addressee : rel.requester;
      return {
        relationshipId: rel.id,
        user: peer,
        connectedAt: rel.updatedAt,
      };
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.crewRelationship.findMany({
      where: {
        addresseeId: userId,
        status: CrewStatus.PENDING,
      },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
        },
      },
    });
  }

  async sendCrewRequest(requesterId: string, targetUsername: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { username: targetUsername },
    });
    if (!targetUser) throw new NotFoundException('User not found');
    if (targetUser.id === requesterId) {
      throw new BadRequestException('Cannot add yourself to Crew');
    }

    const existing = await this.prisma.crewRelationship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === CrewStatus.ACCEPTED) {
        throw new BadRequestException('Already in your Crew');
      }
      if (existing.status === CrewStatus.PENDING) {
        throw new BadRequestException('Crew request already pending');
      }
      return this.prisma.crewRelationship.update({
        where: { id: existing.id },
        data: { status: CrewStatus.PENDING, requesterId, addresseeId: targetUser.id },
      });
    }

    return this.prisma.crewRelationship.create({
      data: {
        requesterId,
        addresseeId: targetUser.id,
        status: CrewStatus.PENDING,
      },
      include: {
        addressee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async respondToRequest(userId: string, relationshipId: string, accept: boolean) {
    const rel = await this.prisma.crewRelationship.findUnique({
      where: { id: relationshipId },
    });
    if (!rel || rel.addresseeId !== userId) {
      throw new NotFoundException('Crew request not found');
    }

    if (accept) {
      return this.prisma.crewRelationship.update({
        where: { id: relationshipId },
        data: { status: CrewStatus.ACCEPTED },
      });
    } else {
      await this.prisma.crewRelationship.delete({
        where: { id: relationshipId },
      });
      return { rejected: true };
    }
  }
}
