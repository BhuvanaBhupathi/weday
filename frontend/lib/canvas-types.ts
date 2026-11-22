// Shared canvas types (mirror of backend canvas module + snapshot shape)

export type CanvasNodeType =
  | 'TEXT'
  | 'CHECKLIST'
  | 'PRD'
  | 'GEMINI'
  | 'IMAGE'
  | 'PAGE_LINK'
  | 'FLOW'
  | 'ARCHITECTURE';

export interface CanvasPageRow {
  id: string;
  bandId: string;
  name: string;
  slug: string;
  description?: string | null;
  parentPageId?: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasNodeRow {
  id: string;
  bandId: string;
  pageId: string;
  type: CanvasNodeType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  data: Record<string, any>;
  sourceRef?: Record<string, any> | null;
}

export interface CanvasEdgeRow {
  id: string;
  bandId: string;
  pageId: string;
  source: string;
  target: string;
  label?: string | null;
  relation?: string | null;
  data: Record<string, any>;
}

export interface CanvasDraftRow {
  id: string;
  bandId: string;
  pageId: string;
  viewport?: { x: number; y: number; zoom: number } | null;
  revision: number;
  savedAt: string;
}

export interface CanvasRepositoryRef {
  id: string;
  fullName: string;
  defaultBranch: string;
}

export interface CanvasStatePayload {
  role: string;
  pages: CanvasPageRow[];
  nodes: CanvasNodeRow[];
  edges: CanvasEdgeRow[];
  drafts: CanvasDraftRow[];
  repository: CanvasRepositoryRef | null;
}

// ── Version snapshots (immutable, reconstructable) ──────────────────────────

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
  data: Record<string, any>;
  sourceRef?: Record<string, any> | null;
}

export interface SnapshotEdge {
  id: string;
  pageId: string;
  source: string;
  target: string;
  label?: string | null;
  relation?: string | null;
  data: Record<string, any>;
}

export interface CanvasSnapshot {
  pages: SnapshotPage[];
  nodes: SnapshotNode[];
  edges: SnapshotEdge[];
  metadata?: Record<string, any>;
}

export type DiffChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'MOVED';
export type DiffTargetType = 'NODE' | 'EDGE' | 'PAGE';
export type DiffMode = 'content' | 'structure' | 'layout' | 'all';

export interface DiffItem {
  changeType: DiffChangeType;
  targetType: DiffTargetType;
  targetId: string;
  targetLabel: string;
  detail?: Record<string, any>;
  bucket: 'content' | 'structure' | 'layout';
}

export interface CanvasDiff {
  added: DiffItem[];
  removed: DiffItem[];
  modified: DiffItem[];
  moved: DiffItem[];
  items: DiffItem[];
  counts: Record<DiffChangeType, number>;
}

export interface CanvasVersionSummary {
  id: string;
  bandId: string;
  versionNumber: number;
  name: string;
  description?: string | null;
  changeSummary?: string | null;
  createdAt: string;
  gitBranch?: string | null;
  gitCommitSha?: string | null;
  creator: { id: string; displayName: string; avatarUrl?: string | null };
  _count?: { changes: number };
}

export interface CanvasVersionDetail extends CanvasVersionSummary {
  parentVersion?: { id: string; name: string; versionNumber: number } | null;
  changes: DiffItem[];
}

export interface VersionCompareResult {
  base: { id: string; label: string; snapshot: CanvasSnapshot };
  next: { id: string; label: string; snapshot: CanvasSnapshot };
  diff: CanvasDiff;
}

export interface PresenceMember {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** Band-scoped signature color (PRD §16). */
  color?: string | null;
}

/** Live cursor position relayed through the `canvas:cursor` socket event. */
export interface CursorInfo {
  bandId: string;
  pageId: string;
  /** Flow coordinates; null when the pointer left the canvas. */
  x: number | null;
  y: number | null;
  userId: string;
  name: string;
  color: string;
  avatarUrl: string | null;
}

/** Full page state broadcast on `canvas:page-state-synced`. */
export interface RemotePageStatePayload {
  pageId: string;
  revision: number;
  updatedBy: string;
  at: string;
  nodes: CanvasNodeRow[];
  edges: CanvasEdgeRow[];
  viewport?: { x: number; y: number; zoom: number } | null;
}

/**
 * Soft node-edit lock (Figma-style): while a member is actively editing a
 * node, other members are read-only on it. Broadcast on `canvas:node-locks`.
 */
export interface NodeLockInfo {
  nodeId: string;
  userId: string;
  name: string;
  color: string;
  avatarUrl: string | null;
}
