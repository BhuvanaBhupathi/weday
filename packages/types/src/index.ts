// ─────────────────────────────────────────────────────────────────────────────
// Friday — Shared Types
// Used by both frontend (Next.js) and backend (NestJS)
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export enum CrewStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED',
}

export enum BandMemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
  CLIENT = 'CLIENT',
}

export enum DiscussionType {
  DISCUSSION = 'DISCUSSION',
  QUESTION = 'QUESTION',
  CONCERN = 'CONCERN',
  BUG = 'BUG',
  SUGGESTION = 'SUGGESTION',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
  IMPORTANT_NOTE = 'IMPORTANT_NOTE',
  CRITICAL_ISSUE = 'CRITICAL_ISSUE',
}

export enum DiscussionStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ConcernStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  VERIFIED = 'VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
}

export enum SuggestedEditStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  MODIFIED = 'MODIFIED',
  REJECTED = 'REJECTED',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum OwnershipType {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  SUGGEST = 'SUGGEST',
  VIEW = 'VIEW',
}

export enum ChatChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
}

export enum PullRequestState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  MERGED = 'MERGED',
}

export enum NotificationType {
  MENTION = 'MENTION',
  DM = 'DM',
  DISCUSSION_REPLY = 'DISCUSSION_REPLY',
  ASSIGNMENT = 'ASSIGNMENT',
  SUGGESTED_EDIT = 'SUGGESTED_EDIT',
  PR_REVIEW_REQUEST = 'PR_REVIEW_REQUEST',
  PR_UPDATE = 'PR_UPDATE',
  PR_APPROVED = 'PR_APPROVED',
  PR_MERGED = 'PR_MERGED',
  CONCERN_ASSIGNED = 'CONCERN_ASSIGNED',
  ARCHITECTURE_WARNING = 'ARCHITECTURE_WARNING',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  BAND_ANNOUNCEMENT = 'BAND_ANNOUNCEMENT',
}

export enum ActivityType {
  BAND_CREATED = 'BAND_CREATED',
  BAND_JOINED = 'BAND_JOINED',
  MEMBER_JOINED = 'MEMBER_JOINED',
  MEMBER_LEFT = 'MEMBER_LEFT',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  PRD_CREATED = 'PRD_CREATED',
  PRD_UPDATED = 'PRD_UPDATED',
  PRD_VERSION_CREATED = 'PRD_VERSION_CREATED',
  STAGE_UPDATED = 'STAGE_UPDATED',
  ARCHITECTURE_UPDATED = 'ARCHITECTURE_UPDATED',
  ARCHITECTURE_VERSION_CREATED = 'ARCHITECTURE_VERSION_CREATED',
  DISCUSSION_CREATED = 'DISCUSSION_CREATED',
  DISCUSSION_REPLIED = 'DISCUSSION_REPLIED',
  CONCERN_CREATED = 'CONCERN_CREATED',
  CONCERN_STATUS_CHANGED = 'CONCERN_STATUS_CHANGED',
  SUGGESTED_EDIT_CREATED = 'SUGGESTED_EDIT_CREATED',
  SUGGESTED_EDIT_REVIEWED = 'SUGGESTED_EDIT_REVIEWED',
  COMMIT_PUSHED = 'COMMIT_PUSHED',
  BRANCH_CREATED = 'BRANCH_CREATED',
  BRANCH_DELETED = 'BRANCH_DELETED',
  PR_CREATED = 'PR_CREATED',
  PR_REVIEWED = 'PR_REVIEWED',
  PR_MERGED = 'PR_MERGED',
  PR_CLOSED = 'PR_CLOSED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_COMPLETED = 'TASK_COMPLETED',
}

export enum AiJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum RelationshipType {
  REQUIREMENT_TO_ARCHITECTURE = 'REQUIREMENT_TO_ARCHITECTURE',
  ARCHITECTURE_TO_CODE = 'ARCHITECTURE_TO_CODE',
  CODE_TO_DISCUSSION = 'CODE_TO_DISCUSSION',
  DISCUSSION_TO_SUGGESTED_EDIT = 'DISCUSSION_TO_SUGGESTED_EDIT',
  SUGGESTED_EDIT_TO_COMMIT = 'SUGGESTED_EDIT_TO_COMMIT',
  COMMIT_TO_PR = 'COMMIT_TO_PR',
  PR_TO_MERGE = 'PR_TO_MERGE',
  CONCERN_TO_COMMIT = 'CONCERN_TO_COMMIT',
  TASK_TO_ARTIFACT = 'TASK_TO_ARTIFACT',
  DERIVED_FROM = 'DERIVED_FROM',
  CAUSED_BY = 'CAUSED_BY',
  IMPLEMENTS = 'IMPLEMENTS',
  AFFECTS = 'AFFECTS',
  DISCUSSES = 'DISCUSSES',
  CHALLENGES = 'CHALLENGES',
  RESOLVED_BY = 'RESOLVED_BY',
  CHANGED_BY = 'CHANGED_BY',
  VERIFIED_BY = 'VERIFIED_BY',
}

export enum ArtifactType {
  PRD = 'PRD',
  PRD_VERSION = 'PRD_VERSION',
  REQUIREMENT = 'REQUIREMENT',
  STAGE_BOARD = 'STAGE_BOARD',
  ARCHITECTURE = 'ARCHITECTURE',
  ARCHITECTURE_VERSION = 'ARCHITECTURE_VERSION',
  DISCUSSION = 'DISCUSSION',
  CONCERN = 'CONCERN',
  SUGGESTED_EDIT = 'SUGGESTED_EDIT',
  COMMIT = 'COMMIT',
  PULL_REQUEST = 'PULL_REQUEST',
  TASK = 'TASK',
  DECISION = 'DECISION',
  QUESTION = 'QUESTION',
  ASSUMPTION = 'ASSUMPTION',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
  MILESTONE = 'MILESTONE',
  CLIENT_PUBLICATION = 'CLIENT_PUBLICATION',
}

export enum RequirementStatus {
  DRAFT = 'DRAFT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  APPROVED = 'APPROVED',
  IMPLEMENTED = 'IMPLEMENTED',
  DEPRECATED = 'DEPRECATED',
}

export enum ChangeState {
  NEW = 'NEW',
  MODIFIED = 'MODIFIED',
  REMOVED = 'REMOVED',
  UNCHANGED = 'UNCHANGED',
  AT_RISK = 'AT_RISK',
  BLOCKED = 'BLOCKED',
}

export enum DecisionStatus {
  PROPOSED = 'PROPOSED',
  ACCEPTED = 'ACCEPTED',
  SUPERSEDED = 'SUPERSEDED',
  REJECTED = 'REJECTED',
}

export enum QuestionStatus {
  UNANSWERED = 'UNANSWERED',
  ANSWERED = 'ANSWERED',
  CONVERTED_TO_DECISION = 'CONVERTED_TO_DECISION',
}

export enum ChangeRequestSource {
  INTERNAL = 'INTERNAL',
  CLIENT = 'CLIENT',
}

export enum ChangeRequestStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  APPLIED = 'APPLIED',
}

export enum MilestoneStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

// ── Signature Colors (band-scoped user identity colors) ───────────────────────
// Each Band member (crewmate) receives a stable visual identity color within
// that Band (PRD §16 — Presence System). Every action a user takes in a Band
// (discussions, replies, chat, activity, concerns) is rendered in their
// signature color. Assignment is server-side: the first free palette color in
// join order; beyond the palette, hues are generated via the golden angle.

export const SIGNATURE_COLOR_PALETTE: string[] = [
  '#9775fa', // violet
  '#4dabf7', // blue
  '#51cf66', // green
  '#ffa94d', // orange
  '#22b8cf', // cyan
  '#f783ac', // pink
  '#ffd43b', // yellow
  '#ff6b6b', // red
  '#38d9a9', // teal
  '#748ffc', // indigo
  '#a9e34b', // lime
  '#da77f2', // magenta
  '#63e6be', // turquoise
  '#e8590c', // dark orange
  '#b197fc', // lavender
  '#66d9e8', // light cyan
];

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = ln - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * Returns the next free signature color for a Band given the colors already
 * taken by its members. Deterministic: palette order first, then golden-angle
 * HSL generation, so the same membership sequence always yields the same colors.
 */
export function nextSignatureColor(taken: Array<string | null | undefined>): string {
  const used = new Set(
    taken.filter((c): c is string => typeof c === 'string' && c.length > 0).map((c) => c.toLowerCase()),
  );
  for (const color of SIGNATURE_COLOR_PALETTE) {
    if (!used.has(color.toLowerCase())) return color;
  }
  let i = used.size;
  for (;;) {
    const hex = hslToHex((i * 137.508) % 360, 72, 64);
    if (!used.has(hex.toLowerCase())) return hex;
    i += 1;
  }
}

/**
 * Stable client-side fallback for a user whose band-scoped color is unknown
 * (e.g. external authors). Derived deterministically from the seed string.
 */
export function fallbackSignatureColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  return hslToHex(h, 72, 64);
}

// ── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  correlationId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

// ── User Types ────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  githubId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A user as embedded in band-scoped responses, carrying their signature color. */
export interface UserWithSignatureColor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  signatureColor?: string | null;
}

/** Band membership row as returned by member endpoints. */
export interface BandMember {
  id: string;
  userId: string;
  bandId: string;
  role: BandMemberRole;
  signatureColor: string | null;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    email?: string | null;
  };
}

// ── Band Types ────────────────────────────────────────────────────────────────

export interface BandSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  memberCount: number;
  unreadCount?: number;
  userRole?: BandMemberRole;
}

export interface BandDetail extends BandSummary {
  joinCode: string;
  creatorId: string;
  githubRepository?: GitRepositorySummary;
  createdAt: string;
  updatedAt: string;
}

// ── Git Types ─────────────────────────────────────────────────────────────────

export interface GitRepositorySummary {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
}

// ── WebSocket Event Types ─────────────────────────────────────────────────────

export interface WsEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline' | 'idle';
  activity?: string;
  artifactType?: string;
  artifactId?: string;
}

export interface ChatMessageEvent {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  threadParentId?: string;
  createdAt: string;
}

export interface DirectMessageEvent {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

// ── AI Types ──────────────────────────────────────────────────────────────────

export interface PrdAnalysisResult {
  jobId: string;
  status: AiJobStatus;
  result?: {
    purpose: string;
    users: string[];
    features: string[];
    functionalRequirements: string[];
    nonFunctionalRequirements: string[];
    frontendRequirements: string[];
    backendRequirements: string[];
    databases: string[];
    apis: string[];
    authentication: string[];
    aiComponents: string[];
    externalServices: string[];
    infrastructure: string[];
    dependencies: string[];
    ambiguities: string[];
    missingRequirements: string[];
    contradictions: string[];
    potentialComponents: string[];
  };
  error?: string;
}

export interface ArchitectureGenerationResult {
  jobId: string;
  status: AiJobStatus;
  result?: {
    nodes: ArchitectureNodeData[];
    edges: ArchitectureEdgeData[];
    reasoning: string;
  };
  error?: string;
}

export type ArchitectureComponentStatus =
  | 'CONFIRMED'
  | 'AI_SUGGESTED'
  | 'INFERRED'
  | 'ASSUMPTION'
  | 'UNRESOLVED'
  | 'REVIEW_REQUIRED'
  | 'REMOVED';

export type ArchitectureRelationshipType =
  | 'DEPENDS_ON'
  | 'CALLS'
  | 'USES'
  | 'STORES_IN'
  | 'READS_FROM'
  | 'WRITES_TO'
  | 'SENDS_TO'
  | 'RECEIVES_FROM'
  | 'IMPLEMENTS'
  | 'AFFECTS'
  | 'DERIVED_FROM'
  | 'RELATED_TO';

export type ArchitectureViewMode =
  | 'system_overview'
  | 'application_flow'
  | 'feature_flow'
  | 'data_flow'
  | 'architecture_detail';

export interface ArchitectureNodeData {
  id: string;
  label: string;
  type: string;
  description: string;
  technology: string;
  purpose?: string;
  status?: ArchitectureComponentStatus;
  source?: 'PRD' | 'FLOW' | 'REQUIREMENT' | 'GEMINI_SUGGESTION' | 'USER_MANUAL' | 'ENGINE_INFERRED';
  sourceRequirements?: string[]; // e.g. ["FR-001", "FR-004"]
  sourceFeatures?: string[];
  sourcePages?: string[];
  sourceFlows?: string[];
  sourceEntities?: string[];
  sourceDecisions?: string[];
  dependsOn?: string[];
  usedBy?: string[];
  apis?: string[];
  data?: string[];
  reason?: string;
  evidence?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  assumptions?: string[];
  requirementIdentifier?: string; // legacy convenience link
  x?: number;
  y?: number;
}

export interface ArchitectureEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  relationshipType?: ArchitectureRelationshipType | string;
  evidence?: string;
  dataFlow?: string;
  animated?: boolean;
}

export interface ArchitectureBoardSummary {
  id: string;
  bandId: string;
  name: string;
  slug: string;
  description?: string;
  viewMode: ArchitectureViewMode;
  visibleNodeIds: string[];
  visibleEdgeIds: string[];
  layoutDirection: 'TB' | 'LR' | 'BT' | 'RL';
  zoom: number;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureValidationReport {
  overallHealth: 'EXCELLENT' | 'GOOD' | 'NEEDS_REVIEW' | 'INCOMPLETE';
  requirementCoveragePercentage: number;
  flowCoveragePercentage: number;
  traceabilityRating: 'HIGH' | 'MEDIUM' | 'LOW';
  totalComponents: number;
  confirmedComponents: number;
  unresolvedComponents: number;
  suggestedComponents: number;
  warnings: Array<{
    code: string;
    componentId?: string;
    message: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
  }>;
}

export interface ArchitectureDiffResult {
  previousVersionNumber: number;
  currentVersionNumber: number;
  newNodes: ArchitectureNodeData[];
  modifiedNodes: Array<{ current: ArchitectureNodeData; previous: ArchitectureNodeData; diffKeys: string[] }>;
  removedNodes: ArchitectureNodeData[];
  affectedNodes: Array<{ node: ArchitectureNodeData; reason: string }>;
}

// ── Planning Domain Interfaces ────────────────────────────────────────────────

export interface RequirementSummary {
  id: string;
  identifier: string; // e.g. "FR-001"
  bandId: string;
  prdId: string;
  title: string;
  priority: Priority;
  status: RequirementStatus;
  changeState: ChangeState;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementDetail extends RequirementSummary {
  description: string;
  acceptanceCriteria: string[];
  createdById: string;
  decisions?: DecisionSummary[];
  changeRequests?: ChangeRequestSummary[];
}

export interface DecisionSummary {
  id: string;
  identifier: string; // e.g. "DEC-014"
  bandId: string;
  title: string;
  status: DecisionStatus;
  decidedById: string;
  decidedAt?: string;
  createdAt: string;
}

export interface DecisionDetail extends DecisionSummary {
  rationale: string;
  sourceDiscussionId?: string;
  requirementId?: string;
  architectureNodeId?: string;
}

export interface ChangeRequestSummary {
  id: string;
  identifier: string; // e.g. "CR-009"
  bandId: string;
  source: ChangeRequestSource;
  title: string;
  status: ChangeRequestStatus;
  authorId: string;
  createdAt: string;
}

export interface MilestoneSummary {
  id: string;
  bandId: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: MilestoneStatus;
  order: number;
}

export interface ClientPublicationSummary {
  id: string;
  bandId: string;
  publicSlug: string;
  isPasswordProtected: boolean;
  currentVersionId?: string;
  latestVersionNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export * from './socket-events';
