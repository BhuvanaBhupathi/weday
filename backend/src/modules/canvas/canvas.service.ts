import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import {
  diffSnapshots,
  snapshotsEqual,
  summarizeDiff,
  type CanvasSnapshot,
} from './engine/canvas-diff';
import {
  CreatePageDto,
  RenameVersionDto,
  SaveVersionDto,
  SyncPageStateDto,
  UpdatePageDto,
} from './dto/canvas.dto';

/** Band role hierarchy — reuses Friday's existing roles (Viewer/Crew/Admin). */
const ROLE_RANK: Record<string, number> = {
  CLIENT: 0,
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48) || 'page';
}

@Injectable()
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─── Authorization ─────────────────────────────────────────────────────────

  /**
   * Verifies the user's Band membership role server-side.
   * Returns the effective role for the caller.
   */
  private async assertAccess(bandId: string, userId: string, minRole: 'VIEWER' | 'MEMBER' | 'ADMIN'): Promise<string> {
    const band = await this.prisma.band.findUnique({
      where: { id: bandId },
      include: { memberships: { where: { userId } } },
    });
    if (!band) throw new NotFoundException('Band not found');

    const membership = band.memberships[0];
    const role = band.creatorId === userId ? 'ADMIN' : (membership?.role ?? null);
    if (!role) throw new ForbiddenException('You are not a member of this Band');
    if ((ROLE_RANK[role] ?? 0) < (ROLE_RANK[minRole] ?? 99)) {
      throw new ForbiddenException(`This action requires the ${minRole} role`);
    }
    return role;
  }

  // ─── Canvas state ──────────────────────────────────────────────────────────

  /**
   * Loads the full canvas state for a Band. Follows the Stage convention:
   * a Band's first canvas access auto-creates the default "Overview" page.
   */
  async getCanvas(bandId: string, userId: string) {
    const role = await this.assertAccess(bandId, userId, 'VIEWER');

    let pages = await this.prisma.canvasPage.findMany({
      where: { bandId },
      orderBy: { order: 'asc' },
    });

    if (pages.length === 0) {
      const overview = await this.prisma.canvasPage.create({
        data: {
          bandId,
          name: 'Overview',
          slug: 'overview',
          description: 'Primary product planning canvas',
          order: 0,
        },
      });
      pages = [overview];
    }

    const [nodes, edges, drafts, repository] = await Promise.all([
      this.prisma.canvasNode.findMany({ where: { bandId }, orderBy: { zIndex: 'asc' } }),
      this.prisma.canvasEdge.findMany({ where: { bandId } }),
      this.prisma.canvasDraft.findMany({ where: { bandId } }),
      this.prisma.gitRepository.findUnique({ where: { bandId } }),
    ]);

    return {
      role,
      pages,
      nodes,
      edges,
      drafts,
      repository: repository
        ? { id: repository.id, fullName: repository.fullName, defaultBranch: repository.defaultBranch }
        : null,
    };
  }

  // ─── Pages ─────────────────────────────────────────────────────────────────

  async createPage(bandId: string, userId: string, dto: CreatePageDto) {
    await this.assertAccess(bandId, userId, 'MEMBER');

    if (dto.parentPageId) {
      const parent = await this.prisma.canvasPage.findFirst({
        where: { id: dto.parentPageId, bandId },
      });
      if (!parent) throw new NotFoundException('Parent page not found in this Band');
    }

    const baseSlug = slugify(dto.name);
    let slug = baseSlug;
    for (let attempt = 1; ; attempt++) {
      const existing = await this.prisma.canvasPage.findUnique({
        where: { bandId_slug: { bandId, slug } },
      });
      if (!existing) break;
      slug = `${baseSlug}-${attempt}`;
    }

    const maxOrder = await this.prisma.canvasPage.aggregate({
      where: { bandId },
      _max: { order: true },
    });

    const page = await this.prisma.canvasPage.create({
      data: {
        bandId,
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        parentPageId: dto.parentPageId || null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    this.eventsGateway.emitToBand(bandId, 'canvas:page-created', {
      pageId: page.id,
      name: page.name,
      createdBy: userId,
    });
    return page;
  }

  async updatePage(bandId: string, userId: string, pageId: string, dto: UpdatePageDto) {
    await this.assertAccess(bandId, userId, 'MEMBER');
    const page = await this.prisma.canvasPage.findFirst({ where: { id: pageId, bandId } });
    if (!page) throw new NotFoundException('Page not found');

    if (dto.parentPageId) {
      if (dto.parentPageId === pageId) {
        throw new NotFoundException('A page cannot be its own parent');
      }
      const parent = await this.prisma.canvasPage.findFirst({
        where: { id: dto.parentPageId, bandId },
      });
      if (!parent) throw new NotFoundException('Parent page not found in this Band');
    }

    const updated = await this.prisma.canvasPage.update({
      where: { id: pageId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.parentPageId !== undefined ? { parentPageId: dto.parentPageId || null } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });

    this.eventsGateway.emitToBand(bandId, 'canvas:page-updated', { pageId, updatedBy: userId });
    return updated;
  }

  async deletePage(bandId: string, userId: string, pageId: string) {
    await this.assertAccess(bandId, userId, 'MEMBER');
    const page = await this.prisma.canvasPage.findFirst({ where: { id: pageId, bandId } });
    if (!page) throw new NotFoundException('Page not found');

    // Child pages become root pages; nodes/edges cascade at the database level.
    await this.prisma.canvasPage.updateMany({
      where: { parentPageId: pageId },
      data: { parentPageId: null },
    });
    await this.prisma.canvasPage.delete({ where: { id: pageId } });

    this.eventsGateway.emitToBand(bandId, 'canvas:page-deleted', { pageId, updatedBy: userId });
    return { success: true };
  }

  // ─── Page state sync (draft autosave) ──────────────────────────────────────

  /**
   * Atomically replaces the normalized node/edge state of one page and bumps
   * the page's draft revision. The client debounces calls, so this is the
   * only write path for draft state — never one request per mouse move.
   */
  async syncPageState(bandId: string, userId: string, pageId: string, dto: SyncPageStateDto) {
    await this.assertAccess(bandId, userId, 'MEMBER');
    const page = await this.prisma.canvasPage.findFirst({ where: { id: pageId, bandId } });
    if (!page) throw new NotFoundException('Page not found');

    const nodes = (dto.nodes || []).map((n) => ({
      id: n.id,
      bandId,
      pageId,
      type: n.type,
      title: n.title ?? '',
      x: n.x,
      y: n.y,
      width: n.width ?? 280,
      height: n.height ?? 160,
      rotation: n.rotation ?? 0,
      zIndex: n.zIndex ?? 0,
      data: (n.data ?? {}) as Prisma.InputJsonValue,
      sourceRef: (n.sourceRef ?? null) as Prisma.InputJsonValue | null,
    }));
    const edges = (dto.edges || []).map((e) => ({
      id: e.id,
      bandId,
      pageId,
      source: e.source,
      target: e.target,
      label: e.label ?? null,
      relation: e.relation ?? null,
      data: (e.data ?? {}) as Prisma.InputJsonValue,
    }));
    const viewport = dto.viewport
      ? ({ x: dto.viewport.x ?? 0, y: dto.viewport.y ?? 0, zoom: dto.viewport.zoom ?? 1 } as Prisma.InputJsonValue)
      : undefined;

    const draft = await this.prisma.$transaction(async (tx) => {
      const draftRow = await tx.canvasDraft.upsert({
        where: { pageId },
        create: { bandId, pageId, viewport: viewport as any, revision: 1 },
        update: {
          ...(viewport ? { viewport: viewport as any } : {}),
          revision: { increment: 1 },
          savedAt: new Date(),
        },
      });
      await tx.canvasNode.deleteMany({ where: { pageId } });
      await tx.canvasEdge.deleteMany({ where: { pageId } });
      if (nodes.length > 0) {
        await tx.canvasNode.createMany({ data: nodes as any });
      }
      if (edges.length > 0) {
        await tx.canvasEdge.createMany({ data: edges as any });
      }
      return draftRow;
    });

    // The full page state is broadcast so other members apply the change
    // directly over the websocket — no REST re-fetch, no page refresh.
    this.eventsGateway.emitToBand(bandId, 'canvas:page-state-synced', {
      pageId,
      revision: draft.revision,
      updatedBy: userId,
      at: new Date().toISOString(),
      nodes,
      edges,
      ...(viewport ? { viewport } : {}),
    });

    return { pageId, revision: draft.revision, savedAt: draft.savedAt };
  }

  // ─── Snapshots & versions ──────────────────────────────────────────────────

  /** Builds an immutable, reconstructable snapshot of the Band's planning state. */
  private async buildSnapshot(
    bandId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<CanvasSnapshot> {
    const [pages, nodes, edges] = await Promise.all([
      tx.canvasPage.findMany({ where: { bandId }, orderBy: { order: 'asc' } }),
      tx.canvasNode.findMany({ where: { bandId }, orderBy: { zIndex: 'asc' } }),
      tx.canvasEdge.findMany({ where: { bandId } }),
    ]);
    return {
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        parentPageId: p.parentPageId,
        order: p.order,
      })),
      nodes: nodes.map((n) => ({
        id: n.id,
        pageId: n.pageId,
        type: n.type,
        title: n.title,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        rotation: n.rotation,
        zIndex: n.zIndex,
        data: n.data,
        sourceRef: n.sourceRef,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        pageId: e.pageId,
        source: e.source,
        target: e.target,
        label: e.label,
        relation: e.relation,
        data: e.data,
      })),
      metadata: { bandId, savedAt: new Date().toISOString() },
    };
  }

  /**
   * Creates an immutable version snapshot of the current planning state.
   * Atomic: snapshot + computed changes are written in one transaction, so a
   * version can never exist with missing or partial content.
   */
  async saveVersion(bandId: string, userId: string, dto: SaveVersionDto) {
    await this.assertAccess(bandId, userId, 'MEMBER');

    const version = await this.prisma.$transaction(async (tx) => {
      const snapshot = await this.buildSnapshot(bandId, tx);
      const prev = await tx.canvasVersion.findFirst({
        where: { bandId },
        orderBy: { versionNumber: 'desc' },
      });

      const diff = diffSnapshots(((prev?.snapshot as unknown) as CanvasSnapshot) ?? null, snapshot);
      const versionNumber = (prev?.versionNumber ?? 0) + 1;

      const created = await tx.canvasVersion.create({
        data: {
          bandId,
          versionNumber,
          name: dto.name?.trim() || `Version ${versionNumber}`,
          description: dto.description?.trim() || null,
          createdBy: userId,
          parentVersionId: prev?.id ?? null,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          changeSummary: summarizeDiff(diff),
          gitBranch: dto.gitBranch || null,
          gitCommitSha: dto.gitCommitSha || null,
        },
      });

      if (diff.items.length > 0) {
        await tx.versionChange.createMany({
          data: diff.items.map((item) => ({
            versionId: created.id,
            changeType: item.changeType,
            targetType: item.targetType,
            targetId: item.targetId,
            targetLabel: item.targetLabel,
            detail: (item.detail ?? {}) as Prisma.InputJsonValue,
          })),
        });
      }

      return created;
    });

    this.eventsGateway.emitToBand(bandId, 'canvas:version-saved', {
      versionId: version.id,
      versionNumber: version.versionNumber,
      name: version.name,
      createdBy: userId,
    });

    return this.getVersion(bandId, userId, version.id);
  }

  async getVersions(bandId: string, userId: string, search?: string) {
    await this.assertAccess(bandId, userId, 'VIEWER');

    const where: Prisma.CanvasVersionWhereInput = { bandId };
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { changeSummary: { contains: q, mode: 'insensitive' } },
        { creator: { displayName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.canvasVersion.findMany({
      where,
      orderBy: { versionNumber: 'desc' },
      take: 200,
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { changes: true } },
      },
    });
  }

  async getVersion(bandId: string, userId: string, versionId: string) {
    await this.assertAccess(bandId, userId, 'VIEWER');
    const version = await this.prisma.canvasVersion.findFirst({
      where: { id: versionId, bandId },
      include: {
        changes: { orderBy: { createdAt: 'asc' } },
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        parentVersion: { select: { id: true, name: true, versionNumber: true } },
      },
    });
    if (!version) throw new NotFoundException('Version not found');
    return version;
  }

  /**
   * Compares one version against another (or against the current draft via
   * 'current'). Returns both snapshots plus the computed visual diff.
   */
  async compareVersion(bandId: string, userId: string, versionId: string, other: string) {
    const version = await this.getVersion(bandId, userId, versionId);

    let otherLabel: string;
    let otherSnapshot: CanvasSnapshot;
    if (other === 'current') {
      otherLabel = 'Current draft';
      otherSnapshot = await this.buildSnapshot(bandId);
    } else {
      const otherVersion = await this.getVersion(bandId, userId, other);
      otherLabel = `Version ${otherVersion.versionNumber} — ${otherVersion.name}`;
      otherSnapshot = otherVersion.snapshot as unknown as CanvasSnapshot;
    }

    const diff = diffSnapshots(version.snapshot as unknown as CanvasSnapshot, otherSnapshot);
    return {
      base: { id: version.id, label: `Version ${version.versionNumber} — ${version.name}`, snapshot: version.snapshot },
      next: { id: other === 'current' ? 'current' : other, label: otherLabel, snapshot: otherSnapshot },
      diff,
    };
  }

  /**
   * Restores a historical version into the live canvas.
   * Safety contract (§32–33, §71):
   *  1. The historical snapshot is NEVER mutated.
   *  2. If the current draft differs from the target, the current draft is
   *     preserved first as an automatic "Pre-restore" checkpoint version, so
   *     no work can be lost.
   *  3. All state replacement happens in a single transaction.
   */
  async restoreVersion(bandId: string, userId: string, versionId: string) {
    await this.assertAccess(bandId, userId, 'MEMBER');

    let restoredSnapshot: CanvasSnapshot | null = null;
    const result = await this.prisma.$transaction(async (tx) => {
      const version = await tx.canvasVersion.findFirst({
        where: { id: versionId, bandId },
      });
      if (!version) throw new NotFoundException('Version not found');
      const snapshot = version.snapshot as unknown as CanvasSnapshot;
      restoredSnapshot = snapshot;

      const current = await this.buildSnapshot(bandId, tx);
      let preRestoreId: string | null = null;

      if (!snapshotsEqual(current, snapshot)) {
        const prev = await tx.canvasVersion.findFirst({
          where: { bandId },
          orderBy: { versionNumber: 'desc' },
        });
        const checkpointDiff = diffSnapshots(
          ((prev?.snapshot as unknown) as CanvasSnapshot) ?? null,
          current,
        );
        const preRestore = await tx.canvasVersion.create({
          data: {
            bandId,
            versionNumber: (prev?.versionNumber ?? 0) + 1,
            name: `Pre-restore checkpoint`,
            description: `Automatic checkpoint of the draft state before restoring "${version.name}" (v${version.versionNumber}).`,
            createdBy: userId,
            parentVersionId: prev?.id ?? null,
            snapshot: current as unknown as Prisma.InputJsonValue,
            changeSummary: summarizeDiff(checkpointDiff),
          },
        });
        if (checkpointDiff.items.length > 0) {
          await tx.versionChange.createMany({
            data: checkpointDiff.items.map((item) => ({
              versionId: preRestore.id,
              changeType: item.changeType,
              targetType: item.targetType,
              targetId: item.targetId,
              targetLabel: item.targetLabel,
              detail: (item.detail ?? {}) as Prisma.InputJsonValue,
            })),
          });
        }
        preRestoreId = preRestore.id;
      }

      // ── Apply the snapshot: pages first (so node/edge FKs resolve) ──
      const snapshotPageIds = (snapshot.pages || []).map((p) => p.id);
      await tx.canvasPage.deleteMany({
        where: { bandId, NOT: { id: { in: snapshotPageIds } } },
      });

      for (const page of snapshot.pages || []) {
        const existing = await tx.canvasPage.findFirst({ where: { bandId, slug: page.slug } });
        await tx.canvasPage.upsert({
          where: { id: page.id },
          create: {
            id: page.id,
            bandId,
            name: page.name,
            slug: existing && existing.id !== page.id ? `${page.slug}-restored` : page.slug,
            description: page.description ?? null,
            parentPageId: page.parentPageId ?? null,
            order: page.order,
          },
          update: {
            name: page.name,
            description: page.description ?? null,
            parentPageId: page.parentPageId ?? null,
            order: page.order,
          },
        });
      }

      await tx.canvasNode.deleteMany({ where: { bandId } });
      await tx.canvasEdge.deleteMany({ where: { bandId } });

      if ((snapshot.nodes || []).length > 0) {
        await tx.canvasNode.createMany({
          data: (snapshot.nodes || []).map((n) => ({
            id: n.id,
            bandId,
            pageId: n.pageId,
            type: n.type,
            title: n.title,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            rotation: n.rotation,
            zIndex: n.zIndex,
            data: n.data as Prisma.InputJsonValue,
            sourceRef: (n.sourceRef ?? null) as Prisma.InputJsonValue | null,
          })) as any,
        });
      }
      if ((snapshot.edges || []).length > 0) {
        await tx.canvasEdge.createMany({
          data: (snapshot.edges || []).map((e) => ({
            id: e.id,
            bandId,
            pageId: e.pageId,
            source: e.source,
            target: e.target,
            label: e.label ?? null,
            relation: e.relation ?? null,
            data: e.data as Prisma.InputJsonValue,
          })) as any,
        });
      }

      return { versionId: version.id, versionNumber: version.versionNumber, name: version.name, preRestoreId };
    });

    // Include the restored snapshot so other members apply it straight from
    // the websocket instead of re-fetching the whole canvas.
    this.eventsGateway.emitToBand(bandId, 'canvas:restored', {
      versionId: result.versionId,
      restoredBy: userId,
      snapshot: restoredSnapshot,
    });

    return result;
  }

  async renameVersion(bandId: string, userId: string, versionId: string, dto: RenameVersionDto) {
    await this.assertAccess(bandId, userId, 'ADMIN');
    const version = await this.prisma.canvasVersion.findFirst({ where: { id: versionId, bandId } });
    if (!version) throw new NotFoundException('Version not found');
    if (!dto.name && !dto.description) {
      throw new NotFoundException('Nothing to update');
    }
    return this.prisma.canvasVersion.update({
      where: { id: versionId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      },
    });
  }

  /**
   * Permanent deletion (ADMIN only). Deleted content remains recoverable
   * through any other version whose snapshot still contains it.
   */
  async deleteVersion(bandId: string, userId: string, versionId: string) {
    await this.assertAccess(bandId, userId, 'ADMIN');
    const version = await this.prisma.canvasVersion.findFirst({ where: { id: versionId, bandId } });
    if (!version) throw new NotFoundException('Version not found');

    await this.prisma.$transaction(async (tx) => {
      // Detach children in the version tree; they remain valid versions.
      await tx.canvasVersion.updateMany({
        where: { parentVersionId: versionId },
        data: { parentVersionId: null },
      });
      await tx.canvasVersion.delete({ where: { id: versionId } });
    });

    this.eventsGateway.emitToBand(bandId, 'canvas:version-deleted', {
      versionId,
      deletedBy: userId,
    });
    return { success: true };
  }
}
