# WEday — Architecture Principles

> **Status:** Locked
> **Purpose:** Defines the architectural rules that every WEday implementation must follow.
> **Priority:** These principles take precedence over individual feature convenience.

---

# 1. Core Principle

> **Friday is a collaborative software planning workspace.**

Planning is the center of the system.

Everything else exists to strengthen:

```text
PLAN
 ↓
VISUALIZE
 ↓
DISCUSS
 ↓
ARCHITECT
 ↓
TRACK
 ↓
IMPLEMENTATION CONTEXT
 ↓
CHANGE
 ↓
RE-PLAN
```

Features that do not strengthen this loop should not become core Friday functionality.

---

# 2. Planning First

Friday must prioritize planning over execution.

The primary objects are:

* PRD
* Requirement
* Decision
* Question
* Assumption
* Stage
* Architecture
* Roadmap
* Milestone
* Task
* Change Request

GitHub and Jira are supporting integrations.

The product must never evolve into a generic task manager or code editor.

---

# 3. Friday Is Not an IDE

Friday provides a code environment for **context and discussion**.

It does not attempt to become VS Code.

The code experience exists to answer:

> What does this implementation do?

and:

> How does this implementation relate to the plan?

Do not build unnecessary IDE functionality.

---

# 4. Friday Is Not Jira

Friday may contain lightweight tasks and Jira integration.

Friday does not attempt to reproduce the entire Jira product.

Jira-specific execution state belongs to Jira.

Friday owns:

* planning context
* relationships
* decisions
* requirements
* project evolution
* collaboration

---

# 5. Friday Is Not GitHub

GitHub remains the source of truth for source control.

Friday should consume and contextualize GitHub information.

Do not duplicate the entire Git hosting model.

---

# 6. Friday Owns the Planning Layer

The architectural boundary is:

```text
GitHub
→ Code + Git

Jira
→ Execution tracking

Friday
→ Planning + Context + Collaboration
```

Friday connects these systems without attempting to replace them.

---

# 7. Project-Centric Architecture

Everything is scoped to a project/Band.

A request must not exist ambiguously outside a project context.

Core hierarchy:

```text
User
 ↓
Band
 ↓
Project
 ↓
Project Artifacts
```

---

# 8. Stable Object Identity

Important project objects must have stable IDs.

Examples:

```text
FR-001
DEC-014
TASK-082
DISC-031
CR-009
```

IDs should survive:

* edits
* version changes
* title changes
* movement
* relationships
* publication

A renamed requirement remains the same requirement.

---

# 9. Version Everything Important

The following must be versioned:

* PRD
* Stage
* Architecture
* major planning artifacts
* client-published artifacts

Published versions are immutable.

Never silently overwrite historical project state.

---

# 10. Drafts vs Published State

Separate:

```text
Draft
```

from:

```text
Published
```

Example:

```text
PRD v7 → PUBLISHED

Team edits
     ↓
PRD v8 → DRAFT
```

The client continues seeing v7 until v8 is explicitly published.

---

# 11. No Destructive History

Historical project state must remain recoverable.

Do not permanently destroy important planning history through ordinary editing.

When content changes:

```text
Previous State
     ↓
Version
     ↓
New State
```

---

# 12. Change Is a First-Class Concept

Friday should treat change as a meaningful project event.

Changes may occur to:

* requirements
* PRD
* Stage
* architecture
* tasks
* decisions
* implementation context

The system should make changes visible.

---

# 13. Visual Change Language

Changes must be visually distinguishable.

Supported states include:

```text
NEW
MODIFIED
REMOVED
BLOCKED
AT RISK
PENDING
APPROVED
REVIEW REQUIRED
```

Do not rely only on color.

Use:

* labels
* icons
* borders
* typography
* motion
* semantic color

---

# 14. Presence Is Different From Status

User colors represent **people**.

System colors/indicators represent **state**.

Never mix these concepts.

Example:

```text
Purple cursor
→ Poulami

Blue cursor
→ Anusha

Red warning
→ Blocked

Yellow indicator
→ Review Required
```

A user's presence color must remain stable within the project.

---

# 15. Real-Time by Default

Collaborative surfaces should support realtime updates.

Users should see:

* cursors
* selections
* active editors
* comments
* object movement
* document changes
* project activity

without manually refreshing.

---

# 16. Collaboration Is Contextual

Communication should attach to project objects wherever possible.

Examples:

```text
PRD
 └── Comment

Requirement
 └── Discussion

Stage Object
 └── Discussion

Architecture Component
 └── Discussion

Code Range
 └── Discussion
```

Generic chat exists only as supporting communication.

---

# 17. Chat Must Not Become the Source of Truth

Important information should be promoted from conversation into structured objects.

Example:

```text
Chat
 ↓
Discussion
 ↓
Decision
```

or:

```text
Chat
 ↓
Task
```

or:

```text
Chat
 ↓
Change Request
```

Do not expect users to reconstruct project decisions from chat history.

---

# 18. Decisions Are First-Class

Decisions are central to Friday.

A decision should capture:

* what was decided
* why
* who decided
* when
* source discussion
* affected requirements
* affected architecture
* affected tasks
* implementation relationship

Example:

```text
Requirement
      ↓
Discussion
      ↓
Decision
      ↓
Architecture
      ↓
Task
```

---

# 19. Questions Are First-Class

Unresolved uncertainty should be explicitly represented.

Do not force unresolved discussions into tasks.

Use:

```text
Question
```

until the team reaches a decision.

---

# 20. Assumptions Are First-Class

Important assumptions should be recorded.

This allows the system to identify:

```text
Assumption
 ↓
Validation
 ↓
Invalidated
 ↓
Impact Analysis
```

---

# 21. Relationships Are First-Class Data

Relationships between objects must be explicit.

Do not rely entirely on textual references.

Example:

```text
Requirement FR-021
        │
        ├── Decision DEC-042
        ├── Stage Object ST-14
        ├── Architecture Component AUTH-01
        ├── Task TASK-83
        └── Discussion DISC-82
```

These relationships power:

* Project Map
* Impact Analysis
* Why?
* Related Items
* progress
* AI context

---

# 22. Project Lineage

Friday should preserve project lineage.

Example:

```text
Client Request
      ↓
Requirement
      ↓
Decision
      ↓
Stage
      ↓
Architecture
      ↓
Task
      ↓
Code Discussion
      ↓
GitHub Commit
      ↓
Pull Request
```

Not every object must connect to every other object.

Relationships must represent meaningful project context.

---

# 23. No Fake Relationships

The system must not create relationships simply because two objects contain similar words.

Relationships should be:

* explicitly created
* derived with explainable logic
* or suggested by AI and confirmed by a user

Never present an uncertain AI inference as established project fact.

---

# 24. Planning Graph as a Core Primitive

Friday's planning system should be graph-oriented.

The graph does not necessarily need to be exposed technically to users at all times.

But internally, relationships should support:

```text
Nodes
→ project objects

Edges
→ meaningful relationships
```

This powers visual navigation.

---

# 25. Every Important Object Should Be Navigable

Users should be able to move through project context.

Example:

```text
Requirement
 ↓
Why?
 ↓
Decision
 ↓
Architecture
 ↓
Task
 ↓
Code
```

No major object should become an isolated island.

---

# 26. "Why?" Is a Core Interaction

Important objects should answer:

> Why does this exist?

The answer should come from project relationships and history.

Example:

```text
Redis
 ↓
DEC-031
 ↓
Real-time presence requirement
```

---

# 27. "What Changed?" Is a Core Interaction

Versioned objects must provide a clear change view.

Users should be able to compare:

```text
v5 → v6
```

and understand:

* added
* modified
* removed
* affected

---

# 28. "What Does This Affect?" Is a Core Interaction

Impact analysis should follow project relationships.

Example:

```text
Requirement changed
        ↓
Stage
        ↓
Architecture
        ↓
Tasks
        ↓
Code context
```

Potential impacts must be clearly distinguished from confirmed impacts.

---

# 29. AI Must Not Become Authority

AI is assistive.

Required model:

```text
AI
 ↓
Analyze
 ↓
Suggest
 ↓
Human Review
 ↓
Human Action
```

AI must not silently:

* modify approved architecture
* publish documents
* change permissions
* close decisions
* merge code
* push code
* approve client requests
* delete history

---

# 30. AI Must Use Project Context

AI should reason primarily over structured Friday data.

Preferred:

```text
Requirement
Decision
Architecture
Task
Discussion
GitHub Context
        ↓
AI Context
```

Not merely:

```text
Conversation transcript
        ↓
AI
```

---

# 31. Visual First

If information can be meaningfully represented visually, provide a visual representation.

Important visualizations:

* Project Map
* PRD Map
* User Flow
* Stage
* Architecture Map
* Dependency Graph
* Roadmap
* Progress
* Git Map
* Change Diff
* Project Story

---

# 32. Visuals Must Be Interactive

Diagrams are not static images.

Users should be able to:

* click
* select
* expand
* collapse
* drag where appropriate
* zoom
* pan
* inspect
* navigate to source objects

---

# 33. Visual Objects Should Represent Real Data

Avoid decorative diagrams that have no connection to project state.

For example:

A React Flow node representing:

```text
Authentication
```

should link to actual project entities where applicable.

Visual planning should be a different representation of the underlying project model, not a separate database of disconnected shapes.

---

# 34. One Object, Multiple Views

A project object may appear in multiple interfaces.

Example:

```text
FR-027
```

may appear in:

* PRD
* Project Map
* Stage
* Architecture relationship
* roadmap
* task
* client view
* impact analysis

These should refer to the same underlying entity.

---

# 35. Separation of Representation and Data

The same project data may be rendered as:

```text
Document
Graph
Timeline
Card
Table
Panel
Client View
```

Do not duplicate the underlying entity merely because it appears in multiple UI representations.

---

# 36. Playground Architecture

The central workspace should be a reusable Playground.

```text
Workspace
 ├── Explorer
 ├── Playground
 └── Context Panel
```

The Playground dynamically renders:

```text
PRD
Stage
Architecture
Roadmap
Git Map
Code
Progress
```

The surrounding workspace should remain consistent.

---

# 37. Context Panel

The right-side context panel should provide:

* object details
* relationships
* comments
* activity
* history
* actions

This prevents users from constantly navigating away from their current work.

---

# 38. Progressive Disclosure

Do not show every piece of project metadata at once.

Primary interface:

```text
Core information
```

Secondary:

```text
Related
```

Tertiary:

```text
History / technical details
```

Advanced information should appear when requested.

---

# 39. Planning Before Task Creation

Users should not be forced to create tasks immediately.

A project may move:

```text
Idea
 ↓
Requirement
 ↓
Discussion
 ↓
Decision
 ↓
Design
 ↓
Architecture
 ↓
Task
```

Tasks are downstream planning objects, not the starting point of every workflow.

---

# 40. Lightweight Execution

Friday may track:

* task status
* owner
* milestone
* dependencies
* progress

but should avoid becoming a heavyweight execution-management platform.

---

# 41. External System Boundaries

Maintain clear ownership.

```text
Friday
Planning + Context

GitHub
Code + Git

Jira
Jira Execution

Friday Client View
Published Project Information
```

Avoid duplicating external systems unnecessarily.

---

# 42. Integration Data Should Be Minimal

When integrating GitHub or Jira, store only the data necessary for:

* relationships
* context
* synchronization
* display
* project intelligence

Do not duplicate entire external databases unless there is a strong technical requirement.

---

# 43. External Systems Are Untrusted Boundaries

Validate all external data.

External systems include:

* GitHub
* Jira
* OAuth providers
* webhooks
* AI providers
* object storage

Never assume external data is valid.

---

# 44. Webhooks Must Be Idempotent

Webhook events may arrive:

* more than once
* out of order
* after delays

Webhook processing must be idempotent.

Example:

```text
GitHub event
 ↓
Event ID
 ↓
Already processed?
 ├── Yes → Ignore
 └── No  → Process
```

---

# 45. Realtime Must Be Resilient

Realtime connectivity can fail.

The UI must clearly distinguish:

```text
Connected
Connecting
Disconnected
Reconnecting
```

Never represent unsaved state as permanently saved.

---

# 46. Collaborative Data vs Server Data

Maintain a clear boundary.

```text
Liveblocks
→ collaborative awareness/state

Backend
→ persistent project truth
```

Realtime collaboration does not eliminate server-side persistence.

---

# 47. Persistence Is the Source of Truth

The durable project state lives in PostgreSQL and the appropriate external systems.

Realtime systems are not the permanent source of truth.

---

# 48. Server-Side Authorization Is Mandatory

Never rely on:

* hidden buttons
* frontend routes
* disabled UI controls

to enforce security.

Every protected backend operation must validate permissions.

---

# 49. Client Isolation

Clients must receive only explicitly published information.

The backend should never simply return the complete project object and hide fields in the frontend.

Correct:

```text
Internal Project Data
        ↓
Authorization
        ↓
Published Client Projection
        ↓
Client
```

---

# 50. Published Client Data Is a Projection

The client view should be considered a controlled projection of the internal project.

Internal:

```text
Requirement
Architecture
Tasks
Code
Discussions
```

Client:

```text
Published Requirement
Feature Progress
Milestone
Approved Information
Comments
```

The client projection should be intentionally smaller.

---

# 51. Client Is Not a Band Member

A client should not automatically inherit Band member permissions.

Client access should be separately authorized.

---

# 52. Internal vs External State

Use explicit visibility.

Example:

```text
INTERNAL
CLIENT_VISIBLE
PUBLISHED
```

Do not infer client visibility simply from an object's existence.

---

# 53. Publication Is Explicit

No internal draft becomes client-visible automatically.

Required:

```text
Draft
 ↓
Review
 ↓
Publish
 ↓
Client
```

---

# 54. Versioned Client Publication

If a client currently sees:

```text
PRD v7
```

and the team edits the PRD:

```text
PRD v8 Draft
```

the client continues seeing v7.

Only after publication does the client see v8.

---

# 55. Data Integrity Over Convenience

When a shortcut risks losing project history, choose data integrity.

Never:

* silently overwrite
* silently delete
* silently merge incompatible versions
* silently move code discussions
* silently alter approved planning

---

# 56. Code Discussion Integrity

Code discussions must be anchored to more than line numbers.

Store enough information to identify the original code:

```text
Repository
Branch
Commit
File
Range
Fingerprint
Context
```

If the code moves, attempt relocation.

If confidence is insufficient:

```text
Anchor Uncertain
 ↓
User Review
```

---

# 57. GitHub Is Implementation Context

The GitHub integration should answer:

> What was implemented?

and:

> How does this implementation relate to the project plan?

It should not turn Friday into another Git client.

---

# 58. Jira Is Execution Context

Jira integration should answer:

> What execution work exists externally?

It should not turn Friday into another Jira clone.

---

# 59. Project Progress Must Be Explainable

Progress should never be a mysterious percentage.

If Friday displays:

```text
68%
```

the user should be able to understand why.

Example:

```text
Requirements: 82%
Milestones: 70%
Tasks: 61%
Blocked Work: -5%
```

Exact calculation may evolve, but the model must remain explainable.

---

# 60. No Fake Progress

Do not manufacture project progress from arbitrary UI interactions.

Progress must derive from meaningful project state.

---

# 61. Attention Is More Important Than Vanity Metrics

Friday should prioritize:

* blockers
* unresolved questions
* pending decisions
* changed requirements
* architecture reviews
* stale work
* client requests

over meaningless productivity scores.

---

# 62. Activity Must Be Meaningful

Activity should represent meaningful project events.

Examples:

```text
Requirement changed
Decision created
Architecture updated
Task blocked
Client request submitted
Discussion resolved
PR opened
```

Do not flood activity with meaningless events.

---

# 63. Audit Important Actions

Important state changes should create audit records.

Examples:

* publication
* permission change
* membership change
* decision approval
* client approval
* artifact changes
* integration changes

---

# 64. Idempotent Mutations

Important mutation endpoints should safely handle retries.

Particularly:

* publication
* Jira ticket creation
* GitHub operations
* webhook processing
* client change requests
* notifications

Avoid duplicate objects caused by network retries.

---

# 65. Explicit State Machines

Where an object has meaningful lifecycle states, model the lifecycle explicitly.

Example:

```text
Change Request

SUBMITTED
    ↓
UNDER_REVIEW
    ↓
ACCEPTED
    ↓
IMPLEMENTED
```

Do not use arbitrary strings scattered throughout the application.

---

# 66. Domain Logic Belongs in the Backend

Business rules should not live exclusively in React components.

Examples:

* versioning
* publication
* permissions
* client visibility
* impact analysis
* relationship creation
* state transitions

These belong in backend/domain services.

---

# 67. Frontend Should Be a Representation Layer

Frontend components should primarily:

* render state
* collect user input
* invoke APIs
* display realtime changes
* provide interaction

They should not become the authoritative implementation of business rules.

---

# 68. Domain Modules Must Be Separated

NestJS modules should reflect product domains.

Recommended:

```text
auth
bands
projects
planning
prd
requirements
stage
architecture
roadmap
tasks
decisions
questions
change-requests
collaboration
discussions
progress
github
jira
client
notifications
activity
search
ai
```

Avoid one giant service containing all project logic.

---

# 69. Avoid Premature Microservices

Do not split domains into separate deployable services unless there is a demonstrated need.

MVP:

```text
One Backend
Many Modules
```

---

# 70. API Contracts Must Be Explicit

Frontend/backend communication should use typed contracts.

Avoid passing arbitrary unstructured objects between layers.

---

# 71. Database Constraints Matter

Use database constraints for critical invariants.

Examples:

* unique Band identifiers
* unique version numbers within a project
* valid relationships
* unique integration per Band
* unique external IDs

Do not rely entirely on application-level checks.

---

# 72. Concurrency Must Be Considered

Friday is inherently collaborative.

Operations must account for:

* simultaneous edits
* simultaneous publication
* simultaneous status changes
* external updates
* stale clients

Use optimistic concurrency or appropriate transactional protection where required.

---

# 73. No Silent Conflict Resolution for Critical State

If two incompatible changes affect important planning state:

```text
Conflict
 ↓
Detect
 ↓
Surface
 ↓
User resolves
```

Do not silently choose one.

---

# 74. Consistent UX Patterns

The same object interaction model should work throughout Friday.

For example:

```text
Select Object
 ↓
Context Panel
 ↓
Related
 ↓
History
 ↓
Discuss
 ↓
Why?
 ↓
Impact
```

Do not invent completely different interaction models for every module.

---

# 75. Visual Consistency

Friday should use a shared visual language for:

* users
* states
* changes
* relationships
* warnings
* approvals
* activity

Users should learn the language once and understand it everywhere.

---

# 76. Color Is Semantic

Color must have defined meanings.

Separate:

### User identity colors

Used for:

* cursor
* presence
* active selection

### System state colors

Used for:

* warning
* blocked
* success
* review

Never allow arbitrary feature-specific meanings to accumulate.

---

# 77. Accessibility Must Survive Visual Complexity

Visual interfaces must remain usable without color perception.

Use:

* icons
* labels
* patterns
* tooltips
* semantic structure

Do not communicate critical state exclusively through color.

---

# 78. Performance Is a Product Feature

Friday will contain complex visual interfaces.

Optimize:

* graph rendering
* large Stage boards
* large PRDs
* activity feeds
* project search
* realtime updates

Use lazy loading and virtualization where necessary.

---

# 79. Large Projects Must Not Destroy the UI

Avoid loading the entire project graph into the browser unnecessarily.

Use:

* pagination
* filtering
* graph windowing
* lazy loading
* virtualization
* server-side querying

---

# 80. Search Must Be Project-Aware

Search should understand Friday objects.

A search for:

```text
OAuth
```

may return:

```text
Requirement
Decision
Architecture
Discussion
Task
Code
```

not just text documents.

---

# 81. Feature Scope Discipline

Before implementing a feature, ask:

1. Does this improve planning?
2. Does this improve collaboration?
3. Does this improve project understanding?
4. Does this connect planning to implementation?
5. Does this improve change management?
6. Is it necessary for the core workflow?

If the answer is no to all of these, it probably does not belong in Friday.

---

# 82. Do Not Build Feature Parity

Friday should not attempt to match:

* Jira
* Linear
* GitHub
* VS Code
* Figma
* Slack
* Discord
* Notion

feature-for-feature.

The objective is to create a distinct planning experience.

---

# 83. Integrate Instead of Rebuild

When another platform already performs a specialized function well:

```text
Integrate
```

rather than:

```text
Rebuild
```

Examples:

```text
GitHub → Git
Jira → execution
Liveblocks → multiplayer infrastructure
tldraw → canvas
Monaco → code editing
```

---

# 84. Friday's Unique Layer

Friday's proprietary value should accumulate around:

```text
Planning Objects
+
Relationships
+
Versions
+
Decisions
+
Collaboration
+
Project State
+
Client Projections
```

This is the core platform layer.

---

# 85. Project Context Must Accumulate

As a project grows, Friday should become more useful because it understands more of the project's history.

```text
Day 1
Basic Plan

Day 30
Requirements
+
Decisions
+
Architecture
+
Tasks
+
Discussions

Day 180
Full Project Context
```

The system should become a living representation of the project.

---

# 86. Friday Should Preserve Why

The most important architectural principle is:

> **Do not only preserve what changed. Preserve why it changed.**

Example:

```text
Requirement Changed
       ↓
Reason
       ↓
Discussion
       ↓
Decision
       ↓
Architecture Change
       ↓
Implementation
```

---

# 87. Project Evolution Must Be Traceable

A user should eventually be able to answer:

> Why is the product designed this way?

> Why does this component exist?

> Why was this requirement added?

> Why did this architecture change?

> Why was this task created?

> What did this client request change?

without searching through unrelated applications manually.

---

# 88. The Plan Is a Living System

The PRD should not be treated as a static document.

It is a living representation of product intent.

```text
PRD
 ↓
Design
 ↓
Architecture
 ↓
Execution
 ↓
Feedback
 ↓
PRD Change
```

Planning continues throughout development.

---

# 89. Changes Must Flow Back Upstream

Traditional development often flows:

```text
Plan → Code
```

Friday must support:

```text
Plan → Code
Code Discovery → Plan
Client Feedback → Plan
Architecture Discovery → Plan
```

Implementation can reveal that the original plan was incomplete.

Friday should make those discoveries visible.

---

# 90. Human Review at Planning Boundaries

When one artifact affects another:

```text
PRD
 ↓
Potential Impact
 ↓
Human Review
 ↓
Architecture
```

Do not silently propagate changes across approved artifacts.

---

# 91. Approved Artifacts Are Protected

Approved/published artifacts should require explicit action to change.

This prevents accidental project drift.

---

# 92. Client Communication Is a Projection

Client communication should expose:

```text
What is being built
What has been agreed
What progress exists
What feedback is needed
```

not:

```text
How the developers internally implemented it
```

---

# 93. Internal Complexity Should Be Maskable

Friday should support transforming:

```text
Internal Technical Reality
```

into:

```text
Client-Understandable Product State
```

without modifying the internal project.

---

# 94. Client Requests Enter the Planning System

Client feedback should follow:

```text
Client
 ↓
Comment
 ↓
Change Request
 ↓
Internal Review
 ↓
Decision
 ↓
Planning Update
```

Never allow external feedback to directly mutate internal planning.

---

# 95. Security Over Convenience

When security conflicts with convenience:

> **Choose security.**

Especially for:

* client isolation
* GitHub credentials
* Jira tokens
* project permissions
* published information
* private discussions

---

# 96. Secrets Never Reach the Client

Never expose:

* OAuth client secrets
* GitHub private keys
* Jira tokens
* API keys
* database credentials
* internal service credentials

to browser code.

---

# 97. Observability Is Mandatory

Every important subsystem should be observable.

Track:

* errors
* integration failures
* synchronization failures
* realtime failures
* job failures
* publication failures

---

# 98. Graceful Failure

External integrations will fail.

If GitHub is unavailable:

```text
GitHub synchronization unavailable.
Your Friday planning data is safe.
```

Friday should not corrupt planning state because an external integration failed.

---

# 99. Integration Failure Isolation

External systems should not become tightly coupled to core planning transactions.

For example:

```text
Create Requirement
       ↓
Friday DB succeeds
       ↓
Jira synchronization fails
       ↓
Requirement remains valid
       ↓
Sync retry
```

Do not make core project creation dependent on a nonessential third-party API succeeding.

---

# 100. Final Architectural Rule

Every major architectural decision should reinforce this model:

```text
                         FRIDAY
                           │
                  COLLABORATIVE PLAN
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
        PRD              STAGE         ARCHITECTURE
          │                │                │
          └────────────────┼────────────────┘
                           ↓
                    TASKS / ROADMAP
                           │
                           ↓
                  IMPLEMENTATION CONTEXT
                           │
                 ┌─────────┴─────────┐
                 ↓                   ↓
              GitHub               Jira
                 │
                 ↓
             Code Changes
                 │
                 ↓
             DISCUSSION
                 │
                 ↓
              DECISION
                 │
                 ↓
               RE-PLAN
```

The system must always preserve the central loop:

> **PLAN → VISUALIZE → DISCUSS → ARCHITECT → TRACK → IMPLEMENTATION CONTEXT → CHANGE → RE-PLAN**

And the core product principle remains:

> **Friday is where software gets planned.**
