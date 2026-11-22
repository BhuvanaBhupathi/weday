# WEday — Technology Stack & Implementation Standards

> **Status:** Locked
> **Purpose:** Defines the approved technology choices for WEday - Collaborative Software Development Workspace(week end day).
> **Rule:** The implementation should follow this document unless a deliberate architectural decision explicitly changes it.

---

# 1. Product Architecture

Friday is a **collaborative software planning workspace**.

The system is built around:

```text
Planning
    ↓
Visual Design
    ↓
Architecture
    ↓
Execution / Tracking
    ↓
Code Context
    ↓
Collaboration
    ↓
Change
    ↓
Re-planning
```

Planning is the primary domain.

GitHub, Jira, AI and other integrations support the planning workflow rather than defining the product.

---

# 2. Architecture Style

## Modular Monolith

Friday MUST initially use a **modular monolith**.

Do NOT introduce microservices for MVP.

The backend should be logically divided into domain modules while remaining deployable as one application.

```text
                    Friday Backend
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     Planning       Collaboration     Integrations
        │                │                │
   ┌────┼────┐       ┌───┼───┐       ┌───┼────┐
   │    │    │       │   │   │       │   │    │
  PRD Stage Tasks   Presence Chat  GitHub Jira
   │
Architecture
   │
Progress
```

This allows domain boundaries without premature distributed-system complexity.

---

# 3. Frontend

## Framework

**Next.js**

Use the App Router.

Primary responsibilities:

* application routing
* workspace UI
* server/client rendering where appropriate
* authentication UI
* project navigation
* collaborative interfaces
* visual planning interfaces
* client portal

---

## Language

**TypeScript**

TypeScript is mandatory throughout the frontend.

Avoid `any` unless there is a documented technical reason.

---

## UI

### Tailwind CSS

Use Tailwind CSS for layout and styling.

### shadcn/ui

Use shadcn/ui for reusable interface primitives:

* buttons
* dialogs
* dropdowns
* tabs
* menus
* popovers
* command palette
* forms
* tooltips
* cards
* badges

Friday's product-specific visual components should be built on top of these primitives.

---

# 4. State Management

## Zustand

Use Zustand for local/global client state where necessary.

Suitable for:

* workspace state
* active Band
* active Playground artifact
* UI state
* sidebar state
* selection state
* temporary editor state

Do not put all server data into Zustand.

---

## TanStack Query

Use TanStack Query for server state.

Responsible for:

* fetching
* caching
* invalidation
* mutations
* optimistic updates where appropriate
* loading/error states

General rule:

```text
Server Data
    ↓
TanStack Query

Local UI State
    ↓
Zustand

Collaborative State
    ↓
Liveblocks
```

---

# 5. Rich Text / Collaborative Documents

## Tiptap

Use Tiptap for rich-text planning documents.

Primary use:

* PRD
* requirements
* project documentation
* comments where rich text is required
* client-facing documents

Tiptap should support collaborative editing through the selected realtime collaboration layer.

---

# 6. Real-Time Collaboration

## Liveblocks

Liveblocks is a core technology for Friday's collaborative experience.

Use it for:

* user presence
* live cursors
* room membership
* collaborative state
* multiplayer editing
* comments where appropriate
* awareness of active users

Friday should feel like a shared workspace rather than a collection of individually edited pages.

Example:

```text
User A
  ↓
Edits PRD

Liveblocks
  ↓
Realtime synchronization

User B
  ↓
Sees update immediately
```

---

# 7. Visual Planning

## React Flow

Use React Flow for structured interactive graphs.

Primary uses:

* Project Map
* PRD requirement maps
* Architecture diagrams
* dependency graphs
* relationship maps
* impact analysis
* planning lineage
* product maps

React Flow objects should represent actual Friday domain entities wherever practical.

Avoid building disconnected decorative diagrams.

---

# 8. Visual Canvas

## tldraw

Use tldraw for **Stage**.

Stage is Friday's flexible visual product-planning canvas.

Use it for:

* user flows
* product concepts
* screen planning
* feature relationships
* visual brainstorming
* product maps
* collaborative visual planning

Stage is a structured product-planning surface, not a generic whiteboard feature.

---

# 9. Code Viewer

## Monaco Editor

Use Monaco Editor for code inspection.

Friday is NOT a full IDE.

Monaco should primarily provide:

* code viewing
* syntax highlighting
* code selection
* contextual discussions
* code navigation
* implementation context

Do not attempt to recreate:

* VS Code extensions
* terminal
* debugger
* full IDE plugin ecosystem

unless explicitly approved as a future product direction.

---

# 10. Backend

## Node.js

Runtime for the backend.

---

## NestJS

Use NestJS for the backend application.

NestJS provides:

* modular architecture
* controllers
* services
* dependency injection
* guards
* validation
* WebSocket support
* background-job integration

---

# 11. API

## REST

Use REST APIs for standard application operations.

Example:

```text
GET    /api/bands/:bandId
GET    /api/bands/:bandId/prd
POST   /api/bands/:bandId/requirements
PATCH  /api/bands/:bandId/requirements/:id
POST   /api/bands/:bandId/tasks
POST   /api/bands/:bandId/discussions
```

API routes must enforce authentication and authorization.

---

# 12. Realtime Backend

Use WebSocket-based communication where application-level realtime events are required.

Possible technology:

**Socket.IO**

Use for:

* notifications
* project activity
* synchronization events
* status changes
* server-generated realtime events

Do not duplicate Liveblocks functionality unnecessarily.

General division:

```text
Liveblocks
→ Collaborative editing / presence

Socket.IO
→ Application events / notifications
```

---

# 13. Database

## PostgreSQL

PostgreSQL is the primary persistent database.

It stores:

* users
* Bands
* projects
* requirements
* PRDs
* versions
* Stage metadata
* architecture metadata
* tasks
* milestones
* decisions
* discussions
* comments
* change requests
* relationships
* activity
* integrations
* client access

---

# 14. ORM

## Prisma

Use Prisma as the database ORM.

Prisma schema is the source of truth for Friday's relational data model.

Database changes should go through controlled Prisma migrations.

Do not manually modify production database structure without updating the Prisma schema and migration history.

---

# 15. Redis

## Redis

Redis is used for transient/high-speed application data.

Possible uses:

* caching
* rate limiting
* session-related transient state
* realtime coordination
* job queues
* temporary processing state

Do not use Redis as the permanent source of truth for project data.

---

# 16. Background Jobs

## BullMQ

Use BullMQ with Redis for asynchronous work.

Suitable jobs:

* GitHub synchronization
* webhook processing
* notifications
* indexing
* large impact-analysis operations
* AI processing
* activity aggregation
* client publication processing

Long-running operations should not unnecessarily block API requests.

---

# 17. GitHub Integration

## GitHub App

Use a GitHub App rather than storing user GitHub passwords or unnecessarily broad personal tokens.

GitHub remains the source of truth for:

* repositories
* branches
* commits
* pull requests
* reviews
* Git history

Friday stores the relevant metadata and relationships required for planning context.

---

# 18. GitHub APIs

Use GitHub APIs for:

* repository information
* file contents
* branches
* commits
* pull requests
* reviews
* repository events
* synchronization

Use GitHub webhooks for relevant realtime repository events.

---

# 19. Jira Integration

Jira is an optional integration.

Use:

**Jira Cloud REST API v3**

Authentication:

**OAuth 2.0 Authorization Code / 3LO**

Jira remains the source of truth for Jira-specific:

* issues
* status
* assignee
* priority
* sprint
* workflow

Friday owns the planning context around those issues.

---

# 20. File / Object Storage

Use an **S3-compatible object storage system**.

Suitable for:

* project attachments
* images
* exported documents
* Stage assets
* client-facing assets

Do not store large binary files directly in PostgreSQL.

---

# 21. AI

## OpenAI API

AI functionality should be implemented as an assistive planning layer.

Primary uses:

* planning suggestions
* summaries
* impact analysis
* inconsistency detection
* project explanations
* requirement analysis
* architecture analysis
* change summaries

AI must not become the authority over project state.

---

# 22. AI Model

Friday's AI should operate primarily on structured project context.

```text
PRD
Requirements
Decisions
Stage
Architecture
Tasks
Discussions
GitHub Context
Progress
        ↓
Project Context
        ↓
AI
        ↓
Suggestion / Explanation
```

Do not rely on unstructured conversation history as the project's source of truth.

---

# 23. Authentication

Authentication may use:

* secure session-based authentication
* OAuth providers where appropriate

Authentication and authorization must remain separate concerns.

---

# 24. Authorization

Authorization must be enforced server-side.

Primary scope:

```text
User
 ↓
Band Membership
 ↓
Role
 ↓
Object Permission
 ↓
Action
```

Roles:

```text
BAND_ADMIN
MEMBER
CLIENT
```

Additional roles may be introduced later.

---

# 25. Validation

Use:

**Zod**

for shared/request validation where appropriate.

Validate:

* API input
* forms
* integration configuration
* external webhook payloads
* structured project objects

Never trust frontend validation alone.

---

# 26. Testing

## Unit / Integration

Use:

* Vitest or Jest

Test:

* domain logic
* permissions
* versioning
* relationships
* impact analysis
* API behavior
* integration services

---

## End-to-End

Use:

**Playwright**

Test critical workflows:

* Band creation
* PRD creation
* PRD versioning
* collaborative editing
* Stage interaction
* architecture changes
* task creation
* GitHub connection
* client sharing
* client isolation
* change request workflow

---

# 27. Error Monitoring

Use:

**Sentry**

Track:

* frontend exceptions
* backend exceptions
* integration failures
* realtime failures
* synchronization failures

Never expose internal stack traces to end users.

---

# 28. Logging

Use structured logging.

Recommended:

**Pino**

Logs should contain useful contextual identifiers such as:

* request ID
* user ID
* Band ID
* project ID
* integration ID
* operation

Never log:

* passwords
* access tokens
* private keys
* secrets

---

# 29. Deployment

Recommended initial architecture:

```text
Frontend
Next.js
   ↓
Vercel

Backend
NestJS
   ↓
Render / Railway / AWS

Database
PostgreSQL
   ↓
Supabase

Redis
   ↓
Upstash

Object Storage
   ↓
S3-compatible provider
```

Infrastructure may change without changing the application architecture.

---

# 30. CI/CD

Use:

**GitHub Actions**

Pipeline should include:

```text
Push
 ↓
Install
 ↓
Lint
 ↓
Type Check
 ↓
Unit Tests
 ↓
Build
 ↓
E2E Tests
 ↓
Deploy
```

Pull requests should not be merged if mandatory checks fail.

---

# 31. Development Environment

The project should support local development without requiring a complex infrastructure stack where practical.

External managed services may be used for:

* PostgreSQL
* Redis
* object storage

Environment variables must be used for credentials.

---

# 32. Environment Configuration

Use:

```text
.env.local
.env.example
```

`.env.example` contains variable names only.

Secrets must never be committed.

Typical variables:

```env
DATABASE_URL=
DIRECT_URL=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

GITHUB_APP_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
JIRA_REDIRECT_URI=

OPENAI_API_KEY=
OPENAI_MODEL=

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

JWT_SECRET=
SESSION_SECRET=

SENTRY_DSN=
```

---

# 33. Core Technology Map

```text
                         FRIDAY
                           │
             ┌─────────────┴─────────────┐
             │                           │
         FRONTEND                     BACKEND
             │                           │
          Next.js                     NestJS
          React                      TypeScript
          TypeScript                    REST
          Tailwind                    WebSocket
          shadcn/ui                      │
             │                           │
     ┌───────┼────────┐          ┌──────┼──────────┐
     │       │        │          │      │          │
   Tiptap  tldraw  React Flow  Prisma Redis     BullMQ
     │       │        │          │      │
     └───────┼────────┘          └──────┼──────────┘
             │                           │
        Liveblocks                  PostgreSQL
             │
          Monaco
             │
             ↓
          GitHub
             │
             ↓
        Implementation
```

---

# 34. Technology Selection Rule

A new dependency should be introduced only when it provides meaningful value.

Before adding a library, evaluate:

1. Is this functionality already supported?
2. Does the dependency fit the architecture?
3. Does it introduce unnecessary complexity?
4. Does it create vendor lock-in?
5. Does it materially improve the user experience?
6. Can it be maintained by the team?

Avoid dependency proliferation.

---

# 35. Core Stack Summary

| Layer               | Technology               |
| ------------------- | ------------------------ |
| Frontend            | Next.js                  |
| Language            | TypeScript               |
| UI                  | Tailwind CSS             |
| Components          | shadcn/ui                |
| Client State        | Zustand                  |
| Server State        | TanStack Query           |
| Rich Text           | Tiptap                   |
| Collaboration       | Liveblocks               |
| Visual Graphs       | React Flow               |
| Visual Canvas       | tldraw                   |
| Code Viewer         | Monaco Editor            |
| Backend             | NestJS                   |
| API                 | REST                     |
| Realtime Events     | Socket.IO                |
| Database            | PostgreSQL               |
| ORM                 | Prisma                   |
| Cache               | Redis                    |
| Jobs                | BullMQ                   |
| Git                 | GitHub App + GitHub API  |
| Project Tracking    | Jira API                 |
| AI                  | OpenAI API               |
| Storage             | S3-compatible            |
| Testing             | Vitest/Jest + Playwright |
| Logging             | Pino                     |
| Monitoring          | Sentry                   |
| CI/CD               | GitHub Actions           |
| Frontend Deployment | Vercel                   |
| Database Hosting    | Supabase                 |
| Redis Hosting       | Upstash                  |
| Containerization    | Docker where required    |

---

# 36. Final Rule

The technology stack exists to support one product goal:

> **Make software planning collaborative, visual, real-time and continuously connected to implementation.**

Do not allow technology decisions to pull Friday away from this goal.
