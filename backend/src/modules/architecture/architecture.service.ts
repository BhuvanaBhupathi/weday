import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { BandMemberRole } from '@prisma/client';
import { PrdInterpreter } from './engine/prd-interpreter';
import { ReasoningEngine } from './engine/reasoning-engine';
import { ValidationEngine } from './engine/validation-engine';
import { VersionDiff } from './engine/version-diff';
import { LlmPrdExtractor } from './engine/llm-prd-extractor';
import { mergeFacts } from './engine/facts-merger';
import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ArchitectureValidationReport,
  ArchitectureDiffResult,
  ArchitectureBoardSummary,
  ArchitectureViewMode,
} from '@friday/types';

export interface ArchitectureGraphInput {
  changeSummary?: string;
  isAiGenerated?: boolean;
  nodes: Array<{
    nodeId: string;
    label: string;
    type?: string;
    description?: string;
    technology?: string;
    positionX: number;
    positionY: number;
    data?: any;
  }>;
  edges: Array<{
    edgeId: string;
    source: string;
    target: string;
    label?: string;
    relationshipType?: string;
    animated?: boolean;
    data?: any;
  }>;
}

export interface SaveBoardDto {
  name: string;
  slug?: string;
  description?: string;
  viewMode?: ArchitectureViewMode;
  visibleNodeIds: string[];
  visibleEdgeIds: string[];
  layoutDirection?: 'TB' | 'LR' | 'BT' | 'RL';
  zoom?: number;
  positionX?: number;
  positionY?: number;
  filterConfig?: any;
}

@Injectable()
export class ArchitectureService {
  private readonly logger = new Logger(ArchitectureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Authorization check: Verify user is a member of the Band.
   * The Band's creator always has access — and if their membership row is
   * missing (e.g. bands created before membership rows were written), it is
   * repaired as ADMIN so the creator is never locked out of their own Band.
   */
  async verifyMembership(bandId: string, userId: string) {
    const member = await this.prisma.bandMembership.findUnique({
      where: { userId_bandId: { userId, bandId } },
    });
    if (member) {
      return member;
    }

    const band = await this.prisma.band.findUnique({ where: { id: bandId } });
    if (band && band.creatorId === userId) {
      return this.prisma.bandMembership.upsert({
        where: { userId_bandId: { userId, bandId } },
        update: {},
        create: { userId, bandId, role: BandMemberRole.ADMIN },
      });
    }

    throw new ForbiddenException('You do not have permission to access this Band architecture');
  }

  /**
   * Retrieve full architecture including current version, historical versions list, and boards
   */
  async getArchitecture(bandId: string, userId: string) {
    await this.verifyMembership(bandId, userId);

    let arch = await this.prisma.architecture.findUnique({
      where: { bandId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { nodes: true, edges: true },
          take: 20,
        },
      },
    });

    if (!arch) {
      arch = await this.prisma.architecture.create({
        data: { bandId },
        include: {
          versions: {
            include: { nodes: true, edges: true },
          },
        },
      });
    }

    let currentVersion = null;
    if (arch.currentVersionId) {
      currentVersion = await this.prisma.architectureVersion.findUnique({
        where: { id: arch.currentVersionId },
        include: { nodes: true, edges: true },
      });
    } else if (arch.versions.length > 0) {
      currentVersion = arch.versions[0];
    }

    const boards = await this.prisma.architectureBoard.findMany({
      where: { bandId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...arch,
      currentVersion,
      boards,
    };
  }

  /**
   * Core Engine: Synthesize architecture directly from PRD using Friday's Reasoning Engine.
   * Deterministic, traceable, and rejects unjustified hallucinations.
   */
  async generateArchitectureFromPrd(bandId: string, userId: string, customPrdContent?: string) {
    await this.verifyMembership(bandId, userId);

    const band = await this.prisma.band.findUniqueOrThrow({
      where: { id: bandId },
      include: {
        requirements: { orderBy: { order: 'asc' } },
        prd: {
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const prdText =
      customPrdContent?.trim() ||
      band.prd?.versions?.[0]?.content ||
      `# ${band.name}\n\nSimple web application workflow with client interface and persistent store.`;

    const requirements = band.requirements.map((r) => ({
      identifier: r.identifier,
      title: r.title,
      description: r.description,
    }));

    // STEP 1-9: Interpret the band's PRD into product facts.
    // Baseline: deterministic interpreter (always runs — the safety net).
    const baseFacts = PrdInterpreter.interpret(prdText, requirements);

    // Enrichment: LLM semantic read of the FULL PRD (Gemini = product
    // understanding). It extracts every page/feature/flow/entity and maps
    // features → requirements; it does NOT design the architecture.
    // Friday's Reasoning Engine below makes every architectural decision,
    // and the deterministic baseline is merged in so nothing is lost when
    // no provider is configured or the call fails.
    let facts = baseFacts;
    let interpretationSource: 'deterministic' | 'llm+deterministic' = 'deterministic';
    try {
      const llmFacts = await LlmPrdExtractor.extract(prdText, requirements, {
        geminiApiKey: this.config.get<string>('GEMINI_API') || this.config.get<string>('GEMINI_API_KEY'),
        openaiApiKey: this.config.get<string>('OPENAI_API_KEY'),
        openaiModel: this.config.get<string>('OPENAI_MODEL'),
      });
      if (llmFacts) {
        facts = mergeFacts(baseFacts, llmFacts, requirements);
        interpretationSource = 'llm+deterministic';
        this.logger.log(
          `LLM PRD extraction: ${facts.features.length} features, ${facts.pages.length} pages, ${facts.flows.length} flows, ${facts.dataEntities.length} entities`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`LLM PRD extraction failed; using deterministic interpreter only: ${err.message}`);
    }

    // STEP 10-15: Friday Architectural Reasoning Engine derives the holistic,
    // minimal-yet-complete architecture (pages, modules, entities, boundaries).
    const derived = ReasoningEngine.derive(facts, band.name);

    // STEP 16: Validate graph, including comprehensiveness against the facts
    const validation = ValidationEngine.validate(
      derived.nodes,
      derived.edges,
      requirements.map((r) => r.identifier),
      facts,
    );

    // STEP 17-18: Persist to DB non-destructively as new version
    const savedVersion = await this.saveVersion(bandId, userId, {
      changeSummary: `Reasoned from PRD (Coverage: ${validation.requirementCoveragePercentage}%, Level: ${derived.complexityLevel})`,
      isAiGenerated: true,
      nodes: derived.nodes.map((n) => ({
        nodeId: n.id,
        label: n.label,
        type: n.type,
        description: n.description,
        technology: n.technology,
        positionX: n.x ?? 100,
        positionY: n.y ?? 100,
        data: {
          purpose: n.purpose,
          status: n.status,
          source: n.source,
          sourceRequirements: n.sourceRequirements,
          sourceFeatures: n.sourceFeatures,
          sourcePages: n.sourcePages,
          sourceFlows: n.sourceFlows,
          sourceEntities: n.sourceEntities,
          apis: n.apis,
          data: n.data,
          reason: n.reason,
          evidence: n.evidence,
          confidence: n.confidence,
          assumptions: n.assumptions,
          requirementIdentifier: n.requirementIdentifier || n.sourceRequirements?.[0],
        },
      })),
      edges: derived.edges.map((e) => ({
        edgeId: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        relationshipType: e.relationshipType,
        animated: e.animated ?? false,
        data: {
          evidence: e.evidence,
          dataFlow: e.dataFlow,
        },
      })),
    });

    return {
      version: savedVersion,
      facts,
      validation,
      unresolvedDecisions: derived.unresolvedDecisions,
      assumptions: derived.assumptions,
      complexityLevel: derived.complexityLevel,
      interpretationSource,
    };
  }

  /**
   * Validate current or proposed architecture
   */
  async validateArchitecture(bandId: string, userId: string): Promise<ArchitectureValidationReport> {
    await this.verifyMembership(bandId, userId);

    const arch = await this.getArchitecture(bandId, userId);
    const nodes: ArchitectureNodeData[] = (arch.currentVersion?.nodes || []).map((n) => ({
      id: n.nodeId,
      label: n.label,
      type: n.type,
      description: n.description || '',
      technology: n.technology || '',
      purpose: (n.data as any)?.purpose,
      status: (n.data as any)?.status || 'CONFIRMED',
      reason: (n.data as any)?.reason,
      evidence: (n.data as any)?.evidence,
      sourceRequirements: (n.data as any)?.sourceRequirements,
      requirementIdentifier: (n.data as any)?.requirementIdentifier,
    }));

    const edges: ArchitectureEdgeData[] = (arch.currentVersion?.edges || []).map((e) => ({
      id: e.edgeId,
      source: e.source,
      target: e.target,
      label: e.label || undefined,
      relationshipType: e.relationshipType || undefined,
    }));

    const requirements = await this.prisma.requirement.findMany({
      where: { bandId },
      select: { identifier: true },
    });

    return ValidationEngine.validate(
      nodes,
      edges,
      requirements.map((r) => r.identifier),
    );
  }

  /**
   * Save a new historical version of the architecture
   */
  async saveVersion(bandId: string, userId: string, input: ArchitectureGraphInput) {
    await this.verifyMembership(bandId, userId);

    let arch = await this.prisma.architecture.findUnique({ where: { bandId } });
    if (!arch) {
      arch = await this.prisma.architecture.create({ data: { bandId } });
    }

    const lastVersion = await this.prisma.architectureVersion.findFirst({
      where: { architectureId: arch.id },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await this.prisma.architectureVersion.create({
      data: {
        architectureId: arch.id,
        versionNumber,
        changeSummary: input.changeSummary || 'Architecture snapshot',
        isAiGenerated: input.isAiGenerated ?? false,
        createdById: userId,
        nodes: {
          create: input.nodes.map((n) => ({
            nodeId: n.nodeId,
            label: n.label,
            type: n.type || 'default',
            description: n.description,
            technology: n.technology,
            positionX: n.positionX,
            positionY: n.positionY,
            data: n.data,
          })),
        },
        edges: {
          create: input.edges.map((e) => ({
            edgeId: e.edgeId,
            source: e.source,
            target: e.target,
            label: e.label,
            relationshipType: e.relationshipType,
            animated: e.animated ?? false,
            data: e.data,
          })),
        },
      },
      include: { nodes: true, edges: true },
    });

    await this.prisma.architecture.update({
      where: { id: arch.id },
      data: { currentVersionId: version.id },
    });

    this.logger.log(`Saved Architecture v${versionNumber} for Band ${bandId}`);
    return version;
  }

  /**
   * Non-destructive Version Comparison: Diff vA against vB
   */
  async compareVersions(bandId: string, userId: string, fromVerNum: number, toVerNum: number): Promise<ArchitectureDiffResult> {
    await this.verifyMembership(bandId, userId);

    const arch = await this.prisma.architecture.findUniqueOrThrow({ where: { bandId } });

    const fromVer = await this.prisma.architectureVersion.findUnique({
      where: {
        architectureId_versionNumber: {
          architectureId: arch.id,
          versionNumber: fromVerNum,
        },
      },
      include: { nodes: true },
    });

    const toVer = await this.prisma.architectureVersion.findUnique({
      where: {
        architectureId_versionNumber: {
          architectureId: arch.id,
          versionNumber: toVerNum,
        },
      },
      include: { nodes: true },
    });

    if (!fromVer || !toVer) {
      throw new NotFoundException('Specified architecture versions not found');
    }

    const mapNode = (n: any): ArchitectureNodeData => ({
      id: n.nodeId,
      label: n.label,
      type: n.type,
      description: n.description || '',
      technology: n.technology || '',
      status: n.data?.status || 'CONFIRMED',
      purpose: n.data?.purpose,
      reason: n.data?.reason,
      dependsOn: n.data?.dependsOn || [],
      usedBy: n.data?.usedBy || [],
    });

    return VersionDiff.compare(
      fromVerNum,
      fromVer.nodes.map(mapNode),
      toVerNum,
      toVer.nodes.map(mapNode),
    );
  }

  /**
   * "Why does this exist?" backward trace link
   */
  async getWhyTracing(bandId: string, userId: string, componentNodeId: string) {
    await this.verifyMembership(bandId, userId);

    const arch = await this.getArchitecture(bandId, userId);
    const node = arch.currentVersion?.nodes?.find((n) => n.nodeId === componentNodeId);
    if (!node) {
      throw new NotFoundException(`Architecture node ${componentNodeId} not found`);
    }

    const data = (node.data as any) || {};
    const reqIds: string[] = data.sourceRequirements || (data.requirementIdentifier ? [data.requirementIdentifier] : []);

    const linkedRequirements = await this.prisma.requirement.findMany({
      where: {
        bandId,
        identifier: { in: reqIds },
      },
    });

    return {
      component: {
        nodeId: node.nodeId,
        label: node.label,
        type: node.type,
        technology: node.technology,
        status: data.status || 'CONFIRMED',
      },
      why: {
        purpose: data.purpose || node.description || 'Executes system responsibilities',
        reason: data.reason || 'Derived to satisfy identified user workflow requirements',
        evidence: data.evidence || 'Required by product specification flows',
        confidence: data.confidence || 'HIGH',
      },
      traceChain: {
        userNeed: linkedRequirements[0]?.description || 'User need specified in planning requirements',
        requirements: linkedRequirements.map((r) => ({ identifier: r.identifier, title: r.title })),
        features: data.sourceFeatures || [],
        flows: data.sourceFlows || [],
        pages: data.sourcePages || [],
      },
    };
  }

  /**
   * "Show Impact" analysis forward and backward
   */
  async getImpactAnalysis(bandId: string, userId: string, componentNodeId: string) {
    await this.verifyMembership(bandId, userId);

    const arch = await this.getArchitecture(bandId, userId);
    const nodes = arch.currentVersion?.nodes || [];
    const edges = arch.currentVersion?.edges || [];

    const targetNode = nodes.find((n) => n.nodeId === componentNodeId);
    if (!targetNode) throw new NotFoundException('Component not found');

    // Find directly connected components
    const downstream = edges.filter((e) => e.source === componentNodeId).map((e) => e.target);
    const upstream = edges.filter((e) => e.target === componentNodeId).map((e) => e.source);

    const dependentNodes = nodes.filter((n) => downstream.includes(n.nodeId)).map((n) => ({ nodeId: n.nodeId, label: n.label }));
    const dependencyNodes = nodes.filter((n) => upstream.includes(n.nodeId)).map((n) => ({ nodeId: n.nodeId, label: n.label }));

    const targetData = (targetNode.data as any) || {};
    const reqIds: string[] = targetData.sourceRequirements || (targetData.requirementIdentifier ? [targetData.requirementIdentifier] : []);

    const affectedRequirements = await this.prisma.requirement.findMany({
      where: { bandId, identifier: { in: reqIds } },
      select: { id: true, identifier: true, title: true, priority: true },
    });

    const affectedDecisions = await this.prisma.decision.findMany({
      where: {
        bandId,
        OR: [
          { architectureNodeId: componentNodeId },
          { requirementId: { in: affectedRequirements.map((r) => r.id) } },
        ],
      },
      select: { id: true, identifier: true, title: true, status: true },
    });

    const affectedTasks = await this.prisma.task.findMany({
      where: {
        bandId,
        OR: [
          { relatedArtifactId: componentNodeId },
          { relatedArtifactId: { in: affectedRequirements.map((r) => r.id) } },
        ],
      },
      select: { id: true, title: true, status: true, priority: true },
    });

    return {
      component: {
        nodeId: targetNode.nodeId,
        label: targetNode.label,
        type: targetNode.type,
      },
      impact: {
        dependentComponents: dependentNodes,
        dependencyComponents: dependencyNodes,
        affectedRequirements,
        affectedDecisions,
        affectedTasks,
        affectedFeatures: targetData.sourceFeatures || [],
        affectedPages: targetData.sourcePages || [],
      },
    };
  }

  /**
   * Search across architecture components, APIs, technologies, and linked requirements
   */
  async searchArchitecture(bandId: string, userId: string, query: string) {
    await this.verifyMembership(bandId, userId);

    const q = query.trim().toLowerCase();
    if (!q) return [];

    const arch = await this.getArchitecture(bandId, userId);
    const nodes = arch.currentVersion?.nodes || [];

    const results: any[] = [];

    for (const n of nodes) {
      const data = (n.data as any) || {};
      const apis: string[] = data.apis || [];
      const reqs: string[] = data.sourceRequirements || (data.requirementIdentifier ? [data.requirementIdentifier] : []);

      let matchedField: string | null = null;
      if (n.label.toLowerCase().includes(q)) matchedField = 'Component Label';
      else if (n.technology?.toLowerCase().includes(q)) matchedField = 'Technology Stack';
      else if (n.description?.toLowerCase().includes(q)) matchedField = 'Description';
      else if (apis.some((a) => a.toLowerCase().includes(q))) matchedField = 'API Endpoint';
      else if (reqs.some((r) => r.toLowerCase().includes(q))) matchedField = 'Requirement Identifier';

      if (matchedField) {
        results.push({
          nodeId: n.nodeId,
          label: n.label,
          type: n.type,
          technology: n.technology,
          matchedField,
          description: n.description,
        });
      }
    }

    return results;
  }

  /**
   * Saved Architecture Boards: Create or update a saved board/view
   */
  async saveBoard(bandId: string, userId: string, dto: SaveBoardDto): Promise<ArchitectureBoardSummary> {
    await this.verifyMembership(bandId, userId);

    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const board = await this.prisma.architectureBoard.upsert({
      where: { bandId_slug: { bandId, slug } },
      create: {
        bandId,
        name: dto.name,
        slug,
        description: dto.description,
        viewMode: dto.viewMode || 'system_overview',
        visibleNodeIds: dto.visibleNodeIds,
        visibleEdgeIds: dto.visibleEdgeIds,
        layoutDirection: dto.layoutDirection || 'TB',
        zoom: dto.zoom ?? 1.0,
        positionX: dto.positionX ?? 0.0,
        positionY: dto.positionY ?? 0.0,
        filterConfig: dto.filterConfig,
      },
      update: {
        name: dto.name,
        description: dto.description,
        viewMode: dto.viewMode,
        visibleNodeIds: dto.visibleNodeIds,
        visibleEdgeIds: dto.visibleEdgeIds,
        layoutDirection: dto.layoutDirection,
        zoom: dto.zoom,
        positionX: dto.positionX,
        positionY: dto.positionY,
        filterConfig: dto.filterConfig,
      },
    });

    return {
      id: board.id,
      bandId: board.bandId,
      name: board.name,
      slug: board.slug,
      description: board.description || undefined,
      viewMode: board.viewMode as ArchitectureViewMode,
      visibleNodeIds: board.visibleNodeIds,
      visibleEdgeIds: board.visibleEdgeIds,
      layoutDirection: board.layoutDirection as any,
      zoom: board.zoom,
      positionX: board.positionX,
      positionY: board.positionY,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    };
  }

  /**
   * Get all saved Boards for a Band
   */
  async getBoards(bandId: string, userId: string) {
    await this.verifyMembership(bandId, userId);
    return this.prisma.architectureBoard.findMany({
      where: { bandId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a saved Board. A Board is a saved view/filter — deleting it never
   * touches the canonical architecture model or its versions.
   */
  async deleteBoard(bandId: string, userId: string, boardId: string) {
    await this.verifyMembership(bandId, userId);

    const board = await this.prisma.architectureBoard.findFirst({
      where: { id: boardId, bandId },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.prisma.architectureBoard.delete({ where: { id: boardId } });
    return { success: true, id: boardId };
  }

  /**
   * Approve current architecture
   */
  async approveArchitecture(bandId: string, userId: string) {
    await this.verifyMembership(bandId, userId);

    const arch = await this.prisma.architecture.findUnique({ where: { bandId } });
    if (!arch) throw new NotFoundException('Architecture not found');

    return this.prisma.architecture.update({
      where: { id: arch.id },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedById: userId,
      },
    });
  }
}
