// ─────────────────────────────────────────────────────────────────────────────
// Canvas snapshot diff engine (pure functions — no DB access)
//
// Compares two CanvasSnapshots (normalized planning state) and classifies
// every difference as ADDED / REMOVED / MODIFIED / MOVED, bucketed into
// content / structure / layout so the UI can offer diff modes.
// ─────────────────────────────────────────────────────────────────────────────

export interface SnapshotPage {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentPageId?: string | null;
  order: number;
}

export interface SnapshotNode {
  id: string;
  pageId: string;
  type: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  data: any;
  sourceRef?: any;
}

export interface SnapshotEdge {
  id: string;
  pageId: string;
  source: string;
  target: string;
  label?: string | null;
  relation?: string | null;
  data: any;
}

export interface CanvasSnapshot {
  pages: SnapshotPage[];
  nodes: SnapshotNode[];
  edges: SnapshotEdge[];
  metadata?: Record<string, any>;
}

export type DiffMode = 'content' | 'structure' | 'layout' | 'all';
export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'MOVED';
export type TargetType = 'NODE' | 'EDGE' | 'PAGE';
export type ChangeBucket = 'content' | 'structure' | 'layout';

export interface DiffItem {
  changeType: ChangeType;
  targetType: TargetType;
  targetId: string;
  targetLabel: string;
  detail?: Record<string, any>;
  /** Which diff mode(s) this item belongs to. */
  bucket: ChangeBucket;
}

export interface CanvasDiff {
  added: DiffItem[];
  removed: DiffItem[];
  modified: DiffItem[];
  moved: DiffItem[];
  /** Every item, most-relevant first (added → removed → modified → moved). */
  items: DiffItem[];
  counts: Record<ChangeType, number>;
}

const EMPTY_DETAIL: Record<string, any> = {};

function stableStringify(value: any): string {
  if (value === undefined || value === null) return '∅';
  try {
    return JSON.stringify(value, (_, v) => (typeof v === 'undefined' ? null : v));
  } catch {
    return String(value);
  }
}

function nodeLabel(node: SnapshotNode): string {
  return node.title?.trim() || node.type;
}

function edgeLabel(edge: SnapshotEdge): string {
  return edge.label?.trim() || 'Connection';
}

interface NodeFieldSpec {
  key: keyof SnapshotNode;
  field: string;
  bucket: ChangeBucket;
}

/** Fields whose change makes a node MODIFIED (vs. MOVED, which is x/y only). */
const NODE_MODIFIED_FIELDS: NodeFieldSpec[] = [
  { key: 'title', field: 'title', bucket: 'content' },
  { key: 'type', field: 'type', bucket: 'content' },
  { key: 'data', field: 'data', bucket: 'content' },
  { key: 'sourceRef', field: 'sourceRef', bucket: 'content' },
  { key: 'width', field: 'width', bucket: 'layout' },
  { key: 'height', field: 'height', bucket: 'layout' },
  { key: 'rotation', field: 'rotation', bucket: 'layout' },
  { key: 'zIndex', field: 'zIndex', bucket: 'layout' },
  { key: 'pageId', field: 'pageId', bucket: 'structure' },
];

/**
 * Deep-compare two snapshots. `base` may be null (first version → everything is ADDED).
 * A node is MOVED when only its x/y changed; any other change makes it MODIFIED
 * (a modified node that also moved reports both via detail.movedFrom/movedTo).
 */
export function diffSnapshots(base: CanvasSnapshot | null, next: CanvasSnapshot): CanvasDiff {
  const added: DiffItem[] = [];
  const removed: DiffItem[] = [];
  const modified: DiffItem[] = [];
  const moved: DiffItem[] = [];

  const basePages = new Map((base?.pages || []).map((p) => [p.id, p]));
  const baseNodes = new Map((base?.nodes || []).map((n) => [n.id, n]));
  const baseEdges = new Map((base?.edges || []).map((e) => [e.id, e]));

  // ── Pages ─────────────────────────────────────────────────────────────────
  for (const page of next.pages || []) {
    const prev = basePages.get(page.id);
    if (!prev) {
      added.push({
        changeType: 'ADDED',
        targetType: 'PAGE',
        targetId: page.id,
        targetLabel: page.name,
        bucket: 'structure',
      });
      continue;
    }
    if (prev.name !== page.name || prev.description !== page.description) {
      modified.push({
        changeType: 'MODIFIED',
        targetType: 'PAGE',
        targetId: page.id,
        targetLabel: page.name,
        detail: {
          fields: ['name', 'description'].filter(
            (f) =>
              (f === 'name' ? prev.name !== page.name : prev.description !== page.description),
          ),
          nameFrom: prev.name,
          nameTo: page.name,
        },
        bucket: 'content',
      });
    }
  }
  for (const page of base?.pages || []) {
    if (!(next.pages || []).some((p) => p.id === page.id)) {
      removed.push({
        changeType: 'REMOVED',
        targetType: 'PAGE',
        targetId: page.id,
        targetLabel: page.name,
        bucket: 'structure',
      });
    }
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────
  for (const node of next.nodes || []) {
    const prev = baseNodes.get(node.id);
    if (!prev) {
      added.push({
        changeType: 'ADDED',
        targetType: 'NODE',
        targetId: node.id,
        targetLabel: nodeLabel(node),
        detail: { type: node.type },
        bucket: 'structure',
      });
      continue;
    }

    const changedFields: string[] = [];
    const fieldFrom: Record<string, any> = {};
    const fieldTo: Record<string, any> = {};
    let layoutChanged = false;
    let contentChanged = false;
    let structureChanged = false;

    for (const spec of NODE_MODIFIED_FIELDS) {
      const a = spec.key === 'data' || spec.key === 'sourceRef' ? stableStringify(prev[spec.key]) : prev[spec.key];
      const b = spec.key === 'data' || spec.key === 'sourceRef' ? stableStringify(node[spec.key]) : node[spec.key];
      if (a !== b) {
        changedFields.push(spec.field);
        fieldFrom[spec.field + 'From'] = spec.key === 'data' || spec.key === 'sourceRef' ? prev[spec.key] : a;
        fieldTo[spec.field + 'To'] = spec.key === 'data' || spec.key === 'sourceRef' ? node[spec.key] : b;
        if (spec.bucket === 'layout') layoutChanged = true;
        if (spec.bucket === 'content') contentChanged = true;
        if (spec.bucket === 'structure') structureChanged = true;
      }
    }

    const positionMoved = prev.x !== node.x || prev.y !== node.y;

    if (contentChanged || layoutChanged || structureChanged) {
      modified.push({
        changeType: 'MODIFIED',
        targetType: 'NODE',
        targetId: node.id,
        targetLabel: nodeLabel(node),
        detail: {
          fields: changedFields,
          ...fieldFrom,
          ...fieldTo,
          ...(positionMoved ? { movedFrom: { x: prev.x, y: prev.y }, movedTo: { x: node.x, y: node.y } } : {}),
        },
        bucket: contentChanged || structureChanged ? 'content' : 'layout',
      });
    } else if (positionMoved) {
      moved.push({
        changeType: 'MOVED',
        targetType: 'NODE',
        targetId: node.id,
        targetLabel: nodeLabel(node),
        detail: { movedFrom: { x: prev.x, y: prev.y }, movedTo: { x: node.x, y: node.y } },
        bucket: 'layout',
      });
    }
  }
  for (const node of base?.nodes || []) {
    if (!(next.nodes || []).some((n) => n.id === node.id)) {
      removed.push({
        changeType: 'REMOVED',
        targetType: 'NODE',
        targetId: node.id,
        targetLabel: nodeLabel(node),
        detail: { type: node.type },
        bucket: 'structure',
      });
    }
  }

  // ── Edges ─────────────────────────────────────────────────────────────────
  for (const edge of next.edges || []) {
    const prev = baseEdges.get(edge.id);
    if (!prev) {
      added.push({
        changeType: 'ADDED',
        targetType: 'EDGE',
        targetId: edge.id,
        targetLabel: edgeLabel(edge),
        detail: { source: edge.source, target: edge.target },
        bucket: 'structure',
      });
      continue;
    }
    const fields = (['source', 'target', 'label', 'relation'] as const).filter(
      (f) => (prev[f] ?? null) !== (edge[f] ?? null),
    );
    if (fields.length > 0 || stableStringify(prev.data) !== stableStringify(edge.data)) {
      modified.push({
        changeType: 'MODIFIED',
        targetType: 'EDGE',
        targetId: edge.id,
        targetLabel: edgeLabel(edge),
        detail: {
          fields: [...fields, ...(stableStringify(prev.data) !== stableStringify(edge.data) ? ['data'] : [])],
          sourceFrom: prev.source,
          sourceTo: edge.source,
          targetFrom: prev.target,
          targetTo: edge.target,
          labelFrom: prev.label ?? null,
          labelTo: edge.label ?? null,
        },
        bucket: 'content',
      });
    }
  }
  for (const edge of base?.edges || []) {
    if (!(next.edges || []).some((e) => e.id === edge.id)) {
      removed.push({
        changeType: 'REMOVED',
        targetType: 'EDGE',
        targetId: edge.id,
        targetLabel: edgeLabel(edge),
        detail: { source: edge.source, target: edge.target },
        bucket: 'structure',
      });
    }
  }

  const counts: Record<ChangeType, number> = {
    ADDED: added.length,
    REMOVED: removed.length,
    MODIFIED: modified.length,
    MOVED: moved.length,
  };

  return { added, removed, modified, moved, items: [...added, ...removed, ...modified, ...moved], counts };
}

/** Filter a diff down to one comparison mode (content / structure / layout / all). */
export function filterDiffByMode(diff: CanvasDiff, mode: DiffMode): DiffItem[] {
  if (mode === 'all') return diff.items;
  return diff.items.filter((item) => item.bucket === mode);
}

/** Human-readable summary, e.g. "3 nodes added, 1 node removed, 2 modified". */
export function summarizeDiff(diff: CanvasDiff): string {
  const parts: string[] = [];
  if (diff.counts.ADDED) parts.push(`${diff.counts.ADDED} item${diff.counts.ADDED === 1 ? '' : 's'} added`);
  if (diff.counts.REMOVED) parts.push(`${diff.counts.REMOVED} item${diff.counts.REMOVED === 1 ? '' : 's'} removed`);
  if (diff.counts.MODIFIED)
    parts.push(`${diff.counts.MODIFIED} item${diff.counts.MODIFIED === 1 ? '' : 's'} modified`);
  if (diff.counts.MOVED) parts.push(`${diff.counts.MOVED} item${diff.counts.MOVED === 1 ? '' : 's'} moved`);
  return parts.length ? parts.join(', ') : 'No changes';
}

/** True when two snapshots are content-identical (ignoring metadata). */
export function snapshotsEqual(a: CanvasSnapshot | null, b: CanvasSnapshot): boolean {
  return diffSnapshots(a, b).items.length === 0;
}
