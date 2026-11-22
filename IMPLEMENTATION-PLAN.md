# WEday — Master Implementation Plan

> **Status:** Active Reference Document  
> **Source of Truth:** `prd.md`, `tech-stack.md`, `architecture-principles.md`  
> **Repository:** `https://github.com/BhuvanaBhupathi/weday`  

---

## 1. Current State Audit Summary

### 1.1 What Already Exists & Works
- **Repository Architecture:** Turborepo monorepo with `pnpm` workspaces (`@friday/backend`, `frontend`, `@friday/types`).
- **Backend Framework:** NestJS 11 with TypeScript, global validation pipes (class-validator/class-transformer), global exception filters, logging interceptor, and Swagger API documentation at `/api/docs`.
- **Database & Persistence:** PostgreSQL with Prisma ORM connected to Supabase (`DATABASE_URL` pooler and `DIRECT_URL`), with Upstash Redis configured for BullMQ queues.
- **Authentication:** Dual-mode authentication:
  - GitHub OAuth (Passport strategy with encrypted token storage and HTTP-only JWT cookies).
  - Dev Login endpoint (`POST /api/auth/dev-login`) for rapid local development without GitHub credentials.
- **Band & Project Core:** Bands management (`POST /api/bands`, `GET /api/bands/my`, `POST /api/bands/join`, join code generation, memberships with roles: `ADMIN`, `MEMBER`, `VIEWER`).
- **Initial Feature Modules (Backend):**
  - PRD versions & basic storage (`/api/bands/:bandId/prd`).
  - Architecture versioning, nodes & edges persistence (`/api/bands/:bandId/architecture`).
  - Stage boards persistence with `tlDrawData` JSON storage (`/api/bands/:bandId/stage`).
  - Tasks CRUD with priority & status (`/api/bands/:bandId/tasks`).
  - Discussions with SHA-256 code fingerprint anchoring (`/api/bands/:bandId/discussions`).
  - Concerns workflow with quality-gate status progression (`/api/bands/:bandId/concerns`).
  - Code ownership & suggested edits (`/api/bands/:bandId/code`).
  - GitHub Octokit integration & webhook receiver (`/api/github`).
  - Project Memory traceability relationships (`/api/bands/:bandId/memory`).
  - AI analysis & architecture generation service with intelligent heuristic fallback if `OPENAI_API_KEY` is omitted (`/api/ai`).
- **Frontend Architecture:** Next.js 16 (App Router) + React 19 + Tailwind CSS + Zustand workspace store.
  - Interactive landing page with animated particle drift, theme switcher (dark/light), and dev-login dialog.
  - Multi-tab workspace shell: Overview, PRD, Stage, Architecture, Code, Tasks, Traceability, Left Rail (Bands & Crew), and Right Sidebar.

---

### 1.2 What Is Partially Implemented or Incomplete
- **PRD System:** Currently only stores unstructured markdown in `PRDVersion`. Lacks discrete `Requirement` entities with stable IDs (`FR-001`), acceptance criteria, priority, status, and requirement-level links. Lacks Tiptap rich-text editor (currently a raw `<textarea>`).
- **Stage:** Currently displays simple custom sticky note cards rather than an interactive `@tldraw/tldraw` canvas.
- **Architecture:** Uses `@xyflow/react` (React Flow), but nodes are static/preset rather than dynamically linked to real Friday domain requirements and backend version state.
- **Collaboration & Presence:** Socket.IO and Liveblocks are not yet active in the application shell. No live cursors, user presence badges with stable user colors, or realtime mutation broadcasts.
- **Tasks & Roadmap:** Basic tasks exist, but Milestones, dependency links, roadmap timeline views, and explainable progress calculations are missing.
- **Discussions & Decisions:** Discussions exist, but `Decision`, `Question`, and `Assumption` first-class entities are missing. Discussions cannot yet be promoted into Decisions (`DEC-014`) or Change Requests (`CR-009`).
- **Code & Git Map:** Monaco Editor is integrated for code inspection, but the visual Git Map (branches, commits, PRs linked to planning requirements) is not yet built.
- **Client Experience:** Completely absent. No `ClientPublication` or `ClientPublicationVersion` models, no authorization isolation for external clients, no published immutable snapshots.

---

### 1.3 What Is Broken
- **Backend Vitest Config:** `pnpm --filter @friday/backend run test` fails on startup because `vitest.config.ts` imports ESM package `vite-tsconfig-paths` under CJS execution mode. (Fix: rename to `vitest.config.mts` or configure resolution paths).
- **Notifications Service:** `backend/src/modules/notifications/notifications.service.ts` is an empty stub.
- **WebSocket Gateway:** No NestJS WebSocket gateway exists to emit application-level realtime events to connected clients.

---

## 2. Target Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRIDAY CLIENT (Next.js)                       │
│                                                                         │
│   ┌───────────────────────────┐    ┌────────────────────────────────┐   │
│   │    Local UI State         │    │       Server Cache             │   │
│   │       (Zustand)           │    │    (TanStack React Query)      │   │
│   └─────────────┬─────────────┘    └───────────────┬────────────────┘   │
│                 │                                  │                    │
│   ┌─────────────┴─────────────┐    ┌───────────────┴────────────────┐   │
│   │   Collaboration / Canvas  │    │     Rich Text / Requirements   │   │
│   │     tldraw + Liveblocks   │    │             Tiptap             │   │
│   └─────────────┬─────────────┘    └───────────────┬────────────────┘   │
└─────────────────┼──────────────────────────────────┼────────────────────┘
                  │                                  │
     WebSocket    │                                  │ REST APIs
     (Socket.IO & │                                  │ (Bearer/Cookie JWT)
      Liveblocks) │                                  │
                  ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRIDAY BACKEND (NestJS)                         │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Modules:                                                          │  │
│  │ auth | users | bands | prd | requirements | stage | architecture   │  │
│  │ tasks | roadmap | decisions | questions | assumptions | changes    │  │
│  │ discussions | git | github | publication | ai | notifications     │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │                                    │
│             ┌──────────────────────┴──────────────────────┐             │
│             ▼                                             ▼             │
│      PostgreSQL (Prisma)                         Redis + BullMQ         │
│   - Users & Band Memberships                  - Event pub/sub           │
│   - Requirements (FR-001)                     - Async AI analysis       │
│   - Decisions (DEC-014)                       - GitHub webhook queue    │
│   - Stage & Architecture Versions             - Impact analysis jobs    │
│   - Tasks & Milestones                                                  │
│   - Published Client Snapshots                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Evolution

To satisfy `PRD.md`, `TECH-STACK.md`, and `ARCHITECTURE-PRINCIPLES.md`, the Prisma schema must be extended with:

1. **`Requirement` Model:**
   - `id`: CUID (internal PK)
   - `identifier`: String (e.g. `FR-001`, unique per Band)
   - `bandId`: String
   - `prdId`: String
   - `title`: String
   - `description`: String
   - `status`: Enum (`DRAFT`, `REVIEW_REQUIRED`, `APPROVED`, `IMPLEMENTED`, `DEPRECATED`)
   - `priority`: Priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
   - `changeState`: Enum (`NEW`, `MODIFIED`, `REMOVED`, `UNCHANGED`, `AT_RISK`, `BLOCKED`)
   - `acceptanceCriteria`: Json (array of criteria strings/objects)
   - `order`: Int

2. **`Decision` Model:**
   - `id`: CUID
   - `identifier`: String (e.g. `DEC-014`, unique per Band)
   - `bandId`: String
   - `title`: String
   - `rationale`: String
   - `status`: Enum (`PROPOSED`, `ACCEPTED`, `SUPERSEDED`, `REJECTED`)
   - `decidedById`: String (User ID)
   - `sourceDiscussionId`: String? (Discussion ID)
   - `decidedAt`: DateTime

3. **`Question` & `Assumption` Models:**
   - Planning primitives linkable to requirements, architecture, and discussions.

4. **`ChangeRequest` Model:**
   - `id`: CUID
   - `identifier`: String (e.g. `CR-009`, unique per Band)
   - `bandId`: String
   - `source`: Enum (`INTERNAL`, `CLIENT`)
   - `title`: String
   - `description`: String
   - `status`: Enum (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `APPLIED`)
   - `authorId`: String
   - `impactSummary`: Json?

5. **`Milestone` Model:**
   - `id`: CUID
   - `bandId`: String
   - `title`: String
   - `targetDate`: DateTime?
   - `status`: Enum (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `DELAYED`)

6. **`ClientPublication` & `ClientPublicationVersion` Models:**
   - Immutable snapshot of approved PRD, Site Overview, selected architecture nodes, and milestones for external client viewing.

---

## 4. Phased Implementation Roadmap

### Phase 1 — Foundation & Health Fixes
- Fix backend `vitest.config.mts` so unit and integration tests pass cleanly.
- Implement missing `NotificationsService` and real-time Socket.IO Gateway in NestJS.
- Ensure type-checks and test suites pass across all workspaces.

### Phase 2 — Domain Model & Database Migrations
- Add `Requirement`, `Decision`, `Question`, `Assumption`, `ChangeRequest`, `Milestone`, `ClientPublication` models to `prisma/schema.prisma`.
- Run Prisma migration dev / deploy to update Supabase schema.
- Update `@friday/types` to export shared TypeScript interfaces and enums.

### Phase 3 — Living PRD & Structured Requirements System
- Implement `RequirementsController` & `RequirementsService` in NestJS with stable human-readable IDs (`FR-001`).
- Build interactive PRD Editor with Tiptap rich-text capabilities, requirement callouts, acceptance criteria, and version comparison (Added, Modified, Removed diffs).
- Build the **Visual PRD Map** in frontend using React Flow to visualize Problem → Goals → Users → Features → Requirements → Acceptance Criteria.

### Phase 4 — Interactive Stage (tldraw)
- Integrate `@tldraw/tldraw` canvas into `StageView`.
- Persist canvas document snapshot into `StageBoard.tlDrawData` on change with debouncing.
- Support board creation, switching, and entity linking to requirements.

### Phase 5 — Architecture Visual Planner
- Upgrade `ArchitectureView` with custom React Flow nodes representing Frontend, Backend, Service, Database, Queue, Storage, Auth.
- Link architecture nodes to real Friday `Requirement` entities (`FR-001`).
- Enable node selection to open contextual inspector and show linked requirements.

### Phase 6 — Work, Tasks & Progress
- Introduce Milestones and Roadmap timeline view alongside tasks.
- Calculate explainable project progress derived from real requirement completion and task states.

### Phase 7 — Realtime Presence & Collaboration
- Integrate Liveblocks client / room presence (online members, viewing status, stable user identity colors).
- Connect Socket.IO client for application events (new requirement, decision recorded, task completed, notification).

### Phase 8 — Decisions, Change Management & Impact Analysis
- Implement Decisions and Change Requests UI & APIs.
- Build relationship traversal impact analysis: changing `FR-001` surfaces affected architecture nodes, tasks, and discussions.

### Phase 9 — GitHub Context & Git Map
- Enhance CodeView and build Git Map visualization connecting branches, commits, PRs to planning requirements.

### Phase 10 — Controlled Client Experience
- Implement publication flow: admin publishes an immutable snapshot version.
- Create secure client portal view displaying only published artifacts with change request submission.

---

## 5. Quality Gates
Every phase will satisfy:
1. `tsc --noEmit` passes with 0 errors in backend, frontend, and packages.
2. `vitest run` passes all unit/integration tests.
3. API endpoints return correct HTTP status codes, structured errors, and validated DTOs.
4. UI renders cleanly with zero console errors and accessible controls.
