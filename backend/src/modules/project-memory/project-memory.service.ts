import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ArtifactType, RelationshipType } from '@prisma/client';

export interface LinkArtifactsInput {
  fromType: ArtifactType;
  fromId: string;
  toType: ArtifactType;
  toId: string;
  relationshipType: RelationshipType;
  metadata?: any;
}

@Injectable()
export class ProjectMemoryService {
  private readonly logger = new Logger(ProjectMemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async linkArtifacts(bandId: string, input: LinkArtifactsInput) {
    return this.prisma.projectRelationship.create({
      data: {
        bandId,
        fromType: input.fromType,
        fromId: input.fromId,
        toType: input.toType,
        toId: input.toId,
        relationshipType: input.relationshipType,
        metadata: input.metadata,
      },
    });
  }

  async getArtifactChain(bandId: string, artifactType: ArtifactType, artifactId: string) {
    const [outgoing, incoming] = await Promise.all([
      this.prisma.projectRelationship.findMany({
        where: { bandId, fromType: artifactType, fromId: artifactId },
      }),
      this.prisma.projectRelationship.findMany({
        where: { bandId, toType: artifactType, toId: artifactId },
      }),
    ]);

    return {
      artifact: { type: artifactType, id: artifactId },
      outgoing,
      incoming,
    };
  }

  async getBandTraceabilitySummary(bandId: string) {
    const [
      prd,
      architecture,
      gitRepo,
      discussionsCount,
      concernsCount,
      tasksCount,
      relationships,
    ] = await Promise.all([
      this.prisma.pRD.findUnique({
        where: { bandId },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      }),
      this.prisma.architecture.findUnique({
        where: { bandId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: { _count: { select: { nodes: true, edges: true } } },
          },
        },
      }),
      this.prisma.gitRepository.findUnique({
        where: { bandId },
        include: { _count: { select: { commits: true, pullRequests: true, branches: true } } },
      }),
      this.prisma.discussion.count({ where: { bandId } }),
      this.prisma.concern.count({ where: { bandId } }),
      this.prisma.task.count({ where: { bandId } }),
      this.prisma.projectRelationship.findMany({
        where: { bandId },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      prd: prd ? { id: prd.id, title: prd.title, latestVersion: prd.versions[0]?.versionNumber ?? 0 } : null,
      architecture: architecture
        ? {
            id: architecture.id,
            isApproved: architecture.isApproved,
            nodeCount: architecture.versions[0]?._count.nodes ?? 0,
            edgeCount: architecture.versions[0]?._count.edges ?? 0,
          }
        : null,
      repository: gitRepo
        ? {
            fullName: gitRepo.fullName,
            commitsCount: gitRepo._count.commits,
            prCount: gitRepo._count.pullRequests,
            branchesCount: gitRepo._count.branches,
          }
        : null,
      metrics: {
        discussions: discussionsCount,
        concerns: concernsCount,
        tasks: tasksCount,
        linkedRelationships: relationships.length,
      },
      relationships,
    };
  }
}
