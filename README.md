# WEday — Collaborative Software Development Workspace (week end day)

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-ea2845?logo=nestjs)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2d3748?logo=prisma)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

> **WEday** is an open-source, project-centric collaborative software development workspace designed around the core principle:
> 
> $$\text{Requirement} \longrightarrow \text{Architecture} \longrightarrow \text{Code} \longrightarrow \text{Discussions} \longrightarrow \text{Commits}$$
>
> Unlike generic chat tools or disconnected code editors, **WEday** bridges planning, visual architecture design, code review, live canvas collaboration, and GitHub workflows into one unified, persistent development environment.

---

## 📖 Table of Contents

1. [Key Features](#-key-features)
2. [Domain Terms & Concepts Explained](#-domain-terms--concepts-explained)
3. [Architecture & Tech Stack](#-architecture--tech-stack)
4. [Monorepo Structure](#-monorepo-structure)
5. [Getting Started](#-getting-started)
6. [API & Documentation](#-api--documentation)
7. [Contributing](#-contributing)
8. [License](#-license)

---

## 🌟 Key Features

* **Visual Project Planning**: Real-time collaborative whiteboard (Stage) and dynamic node-based architecture diagrams.
* **Persistent Project Memory**: Every commit traces back to an architectural node, and every node traces back to a PRD requirement.
* **Live Code Inspection**: Monaco Editor integration with code fingerprinting (SHA-256) for precise, line-anchored discussions.
* **Dual Authentication**: GitHub OAuth for production and instant zero-config Dev Login for local development.
* **Realtime Mesh**: Socket.IO collaborative presence, multi-user cursor tracking, and instant state synchronization across team members.
* **Client Presentation Portal**: Secure, immutable milestone snapshots allowing external clients to review progress and submit change requests without accessing internal developer discussions.

---

## 📚 Domain Terms & Concepts Explained

To help developers, designers, and managers collaborate seamlessly, **WEday** establishes a rich, domain-driven terminology:

### 1. **Band**
A **Band** is an isolated collaborative workspace or project boundary in WEday (similar to an organization or workspace in Slack/Linear). 
* Each Band possesses its own PRD, Architecture Graph, Stage Whiteboard, Task Board, Code Repositories, and Team Members.
* Bands have roles: `ADMIN`, `MEMBER`, and `VIEWER`.
* Access can be shared via an invitation code (`joinCode`).

### 2. **Crew & Crewmates**
**Crew** represents the developers, architects, and collaborators who are members of a Band.
* Each crewmate is assigned a unique, stable **Signature Color** (e.g., `#00F0FF`, `#A78BFA`) used throughout the workspace for live cursor tracking, avatar rings, discussion badges, and whiteboard annotations.
* Crewmates can connect directly, send Direct Messages, and view teammate activity streams in real time.

### 3. **PRD (Product Requirements Document)**
The **PRD** is the foundational planning artifact for any software built within a Band.
* Rather than a static text file, WEday's PRD is versioned (`PRDVersion`) and contains discrete, addressable **Requirements** (e.g., `FR-001`, `NFR-002`) with priorities, status tracking, and acceptance criteria.
* Requirements directly anchor downstream architectural nodes and GitHub pull requests.

### 4. **Stage**
The **Stage** is an infinite visual canvas and whiteboard powered by `@tldraw/tldraw`.
* Serves as the brainstorming and wireframing environment where team members draw user flows, sketch UI layouts, create sticky notes, and plan early concepts.
* Multi-user cursor tracking allows team members to co-design synchronously.

### 5. **Architecture Graph (Nodes & Edges)**
The visual, interactive system architecture map powered by `@xyflow/react` (React Flow).
* **Nodes**: Represent individual architectural entities such as microservices, databases, third-party APIs, frontend clients, or message queues.
* **Edges**: Represent communication protocols, data flows, and dependencies between nodes (e.g., `gRPC`, `REST`, `WebSocket`, `PubSub`).
* Nodes can be linked directly to PRD Requirements to ensure architectural coverage.

### 6. **Project Memory & Traceability Matrix**
The core engine that eliminates "knowledge drift" in software engineering.
* Creates mathematical relational links across the product lifecycle:
  $$\text{PRD Requirement} \longleftrightarrow \text{Architecture Node} \longleftrightarrow \text{Task} \longleftrightarrow \text{Code File} \longleftrightarrow \text{GitHub Commit / PR}$$
* Answers critical questions like: *"Why does this code exist?"*, *"Which requirements are impacted by modifying this service?"*, and *"Has this PRD requirement been implemented and merged?"*.

### 7. **Concerns & Quality Gates**
* A **Concern** is a formal risk, architectural objection, security vulnerability, or blocker flagged by a team member against a requirement or architecture version.
* Operates under a strict quality-gate lifecycle: `REPORTED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED`.
* An architecture version or milestone cannot be approved while open `CRITICAL` concerns remain unresolved.

### 8. **Discussions & Code Fingerprinting (SHA-256)**
* Discussions allow contextual conversations directly anchored to code lines, PRD sections, or architecture nodes.
* **Code Fingerprint**: When a discussion is opened on a code snippet, a SHA-256 hash of the exact lines is computed. Even if files are later edited or lines shift, WEday maintains the historic discussion anchor without losing context.

### 9. **Tasks & Milestones**
* **Tasks**: Actionable work units categorized by priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and status (`TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`).
* Tasks can be assigned to Crewmates, scheduled with deadlines, and grouped under high-level **Milestones** (e.g., `v0.1.0 MVP`).

### 10. **Client Publication (Client Portal)**
* A dedicated, external-facing snapshot URL (`/client/:slug`) designed for non-technical stakeholders and clients.
* Provides a clean summary of approved milestones, delivery status, and release notes without exposing internal git chatter or unresolved developer concerns.
* Supports optional password protection and allows clients to submit structured **Change Requests**.

### 11. **Dev Login**
* A built-in developer convenience endpoint (`POST /api/auth/dev-login`) for rapid local development without requiring GitHub OAuth credentials or Internet connectivity.

### 12. **Realtime Mesh**
* An event-driven WebSocket layer powered by Socket.IO (`@nestjs/platform-socket.io`) that orchestrates room joining (`join:band`), live cursor positions (`canvas:cursor`), lock acquisitions (`canvas:node-lock`), and instant update toasts.

---

## 🛠 Architecture & Tech Stack

```
                          ┌────────────────────────┐
                          │   Next.js 16 Client    │
                          │ React 19 + Tailwind v4 │
                          └───────────┬────────────┘
                                      │ HTTP / WS
                                      ▼
                          ┌────────────────────────┐
                          │    NestJS 11 Backend   │
                          │   Express + Socket.io  │
                          └───────────┬────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
      ┌──────────────────────┐                  ┌──────────────────────┐
      │   PostgreSQL 16/18   │                  │     Redis 7 / Bull   │
      │     (Prisma ORM)     │                  │  (Background Queues) │
      └──────────────────────┘                  └──────────────────────┘
```

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Zustand, `@xyflow/react`, `@monaco-editor/react`, `@tldraw/tldraw`, Lucide Icons |
| **Backend** | NestJS 11, TypeScript, Express, Socket.IO, BullMQ, Helmet, Pino, Passport.js |
| **Persistence** | PostgreSQL (local embedded / Supabase), Prisma ORM 6.x |
| **Caching & Queues** | Redis 7, BullMQ, Upstash Redis |
| **Monorepo Tools** | Turborepo, pnpm workspaces, tsup |

---

## 📂 Monorepo Structure

```text
friday-main/
├── backend/                  # NestJS 11 Backend application
│   ├── prisma/               # Prisma schema & seed scripts
│   ├── src/
│   │   ├── common/           # Guards, interceptors, filters, decorators
│   │   ├── config/           # Zod environment validation
│   │   ├── database/         # PrismaService and database module
│   │   └── modules/          # Auth, Bands, PRD, Stage, Architecture, Tasks, etc.
│   └── package.json
├── frontend/                 # Next.js 16 App Router frontend
│   ├── app/                  # Pages: / (Landing), /workspace, /client/[slug]
│   ├── components/           # UI components, canvas nodes, file trees, views
│   ├── lib/                  # Zustand store, API client, Socket.io hooks
│   └── package.json
├── packages/
│   └── types/                # Shared TypeScript models and WebSocket event contracts
├── scripts/                  # Embedded DB boot and demo seed scripts
├── docker-compose.yml        # Docker composition for PostgreSQL, Redis, and MinIO
├── package.json              # Monorepo root configuration
├── pnpm-workspace.yaml       # pnpm workspace definition
└── turbo.json                # Turborepo task pipeline configuration
```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: `v20.0.0` or higher (recommended: `v22.x`)
* **pnpm**: `v9.0.0` or higher (`npm install -g pnpm`)
* **Git**: Installed and configured

### 1. Clone the Repository

```bash
git clone https://github.com/BhuvanaBhupathi/weday.git
cd weday
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build Shared Types

```bash
pnpm --filter @friday/types build
```

### 4. Setup Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
cp .env.example backend/.env
```

Ensure `DATABASE_URL` and `DIRECT_URL` are set:
```env
DATABASE_URL="postgresql://friday:friday_dev_password@localhost:5432/friday_dev?schema=public"
DIRECT_URL="postgresql://friday:friday_dev_password@localhost:5432/friday_dev?schema=public"
JWT_SECRET="weday_development_jwt_secret_key_minimum_32_characters_long"
```

### 5. Start Database & Push Schema

You can run the embedded database without needing external Docker setup:

```bash
# Start embedded PostgreSQL server
node scripts/start-db.js

# In another terminal, push Prisma schema:
cd backend
npx prisma db push

# Optional: Seed initial demo data (Friday Core band, tasks, PRD):
pnpm db:seed
```

*(Alternatively, if Docker is installed: `docker compose up -d`)*

### 6. Run the Application

Start both the backend and frontend concurrently using Turbo:

```bash
pnpm dev
```

Or run them individually:
* **Frontend**: `cd frontend && pnpm dev` (Runs on [http://localhost:3000](http://localhost:3000))
* **Backend**: `cd backend && node dist/main.js` (Runs on [http://localhost:4000](http://localhost:4000))

---

## 📚 API & Documentation

* **Web UI**: [http://localhost:3000](http://localhost:3000)
* **Workspace**: [http://localhost:3000/workspace](http://localhost:3000/workspace)
* **Interactive Swagger API Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
* **Backend Health Endpoint**: [http://localhost:4000/health](http://localhost:4000/health)

---

## 🤝 Contributing

Contributions, feedback, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
The daa will tacken by the user to raed a text and develop the modules as they preference to do te task and should be 
in gentel p
