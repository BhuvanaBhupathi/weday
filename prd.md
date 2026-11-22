# WEDAY — COLLABORATIVE SOFTWARE DEVELOPMENT WORKSPACE(WEEK END DAY)

## Product Requirements Document

### Version 1.0 — Locked Product Direction

---

# 1. PRODUCT DEFINITION

## 1.1 Product Name

**WEday**

## 1.2 Product Category

**Collaborative Software Development Workspace(week end day)**

## 1.3 One-Line Definition

> **WEday is a visual, real-time collaborative workspace where software teams plan, design, discuss, track, and evolve an entire product from idea to implementation.**

## 1.4 Core Positioning

> **Friday is where software gets planned.**

Friday takes the collaborative, flexible nature of a tool like Notion and applies it specifically to software development planning.

It combines:

* structured planning
* rich documentation
* interactive visual planning
* product flows
* architecture
* roadmaps
* tasks
* decisions
* real-time collaboration
* contextual discussions
* project progress
* GitHub implementation context
* controlled client sharing

into one connected project environment.

Friday is **not** intended to replace GitHub, Jira, Linear, VS Code, Discord, Figma, or other specialized tools.

Instead:

> **Friday owns the planning layer and the relationships between planning artifacts and implementation.**

External tools remain systems of record where appropriate.

---

# 2. PRODUCT VISION

Software development involves far more than writing code.

Before and during implementation, teams need to:

1. understand the problem
2. define the product
3. establish requirements
4. discuss ideas
5. make decisions
6. design user journeys
7. visualize functionality
8. design architecture
9. break work into tasks
10. assign responsibilities
11. track progress
12. communicate continuously
13. review implementation
14. respond to changes
15. communicate progress to stakeholders
16. continuously update the plan

Today, these activities are fragmented.

A team might use:

* Notion for documentation
* Figma/Miro for visual planning
* Jira/Linear for tasks
* Discord/Slack for communication
* GitHub for code
* Google Docs for client communication

The problem is not simply that there are too many applications.

The deeper problem is:

> **The project plan becomes fragmented across tools, formats, conversations and versions.**

Friday creates one collaborative environment around the **evolution of the software plan**.

---

# 3. CORE PRODUCT THESIS

Friday follows this lifecycle:

```text
IDEA
  ↓
PLAN
  ↓
VISUALIZE
  ↓
ARCHITECT
  ↓
BREAK INTO WORK
  ↓
BUILD
  ↓
TRACK
  ↓
REVIEW
  ↓
CHANGE
  ↓
RE-PLAN
```

The process is continuous.

A project is never simply:

```text
PRD → Code → Done
```

It is:

```text
Plan
 ↓
Discussion
 ↓
Decision
 ↓
Design
 ↓
Architecture
 ↓
Implementation
 ↓
Feedback
 ↓
Change
 ↓
Updated Plan
```

Friday should make this cycle visible and collaborative.

---

# 4. PRIMARY PRODUCT PRINCIPLES

## P1 — Planning First

Planning is the center of Friday.

Every major feature must strengthen the team's ability to:

* understand
* define
* visualize
* organize
* discuss
* change
* track

the project plan.

---

## P2 — Visual First

Friday should communicate project information visually wherever possible.

Use:

* graphs
* flowcharts
* timelines
* maps
* diagrams
* progress visualizations
* dependency graphs
* visual diffs
* activity streams
* presence indicators

Tables and lists remain available where appropriate but should not dominate the experience.

---

## P3 — Real-Time by Default

Friday should feel like a shared workspace.

Users should know:

* who is online
* who is viewing something
* who is editing
* where another user is working
* what has recently changed
* what needs attention

---

## P4 — Contextual Collaboration

Communication should happen around the thing being discussed.

Examples:

* comments on requirements
* discussions on Stage objects
* discussions on architecture components
* questions on tasks
* discussions attached to code ranges
* decisions created from discussions

Friday should not primarily become a generic chat application.

---

## P5 — Everything Important Is Versioned

Important project artifacts must retain their history.

No destructive overwriting of approved versions.

---

## P6 — Planning Is Connected

Requirements, decisions, Stage objects, architecture, tasks, code discussions and GitHub implementation should be linkable.

---

## P7 — Human-Controlled Changes

Friday may identify potential changes and impacts.

It should not silently change approved project artifacts.

The default model is:

```text
Detect
 ↓
Suggest
 ↓
Review
 ↓
Human confirms
 ↓
Apply
```

---

## P8 — External Tools Remain External Systems

GitHub remains the source of truth for Git and source code.

Jira remains the source of truth for Jira work when integrated.

Friday does not recreate entire external products.

---

# 5. TARGET USERS

## Primary Users

### Software development teams

Especially:

* startup teams
* student development teams
* freelance teams
* software agencies
* distributed development teams
* small product teams

---

## Secondary Users

* product managers
* technical leads
* software architects
* designers
* project managers
* clients/stakeholders

---

# 6. PRIMARY USER PROBLEM

Teams currently have difficulty maintaining a shared understanding of:

> **What are we building?**

> **Why are we building it?**

> **How are we building it?**

> **What has changed?**

> **What is currently happening?**

> **What is blocked?**

> **Who is working on what?**

> **How does implementation relate to the plan?**

> **What should stakeholders see?**

Friday should answer these questions from one workspace.

---

# 7. PRODUCT SCOPE

Friday consists of seven major product domains.

```text
FRIDAY
│
├── 1. PROJECT PLANNING
│
├── 2. VISUAL DESIGN
│
├── 3. ARCHITECTURE
│
├── 4. EXECUTION & PROGRESS
│
├── 5. CODE CONTEXT
│
├── 6. REAL-TIME COLLABORATION
│
└── 7. CONTROLLED SHARING
```

Planning remains the dominant domain.

---

# 8. INFORMATION ARCHITECTURE

```text
BAND
│
├── PROJECT HOME
│   ├── Project Map
│   ├── Project Pulse
│   ├── Activity
│   ├── Changes
│   └── Attention
│
├── PLAN
│   ├── PRD
│   ├── Requirements
│   ├── Roadmap
│   ├── Milestones
│   ├── Tasks
│   ├── Decisions
│   ├── Questions
│   ├── Assumptions
│   └── Change Requests
│
├── DESIGN
│   ├── Stage
│   ├── User Flows
│   └── Product Maps
│
├── ARCHITECTURE
│   ├── Architecture Map
│   ├── Components
│   ├── Dependencies
│   ├── Versions
│   └── Impact Analysis
│
├── CODE
│   ├── Repository
│   ├── Files
│   ├── Branches
│   ├── Discussions
│   ├── Concerns
│   ├── Pull Requests
│   └── Git Map
│
├── COLLABORATE
│   ├── Project Chat
│   ├── Comments
│   ├── Mentions
│   ├── Voice
│   ├── Presence
│   └── Activity
│
├── SHARE
│   ├── Client View
│   ├── Published PRD
│   ├── Progress
│   ├── Milestones
│   ├── Comments
│   └── Change Requests
│
└── INTEGRATIONS
    ├── GitHub
    └── Jira
```

---

# 9. BAND MODEL

A **Band** is the collaborative workspace for one software project.

Each Band represents one project/team environment.

A Band contains:

* project planning
* team members
* project artifacts
* collaboration
* connected GitHub repository
* optional Jira integration
* client sharing configuration

---

# 10. BAND CREATION

Any authenticated user can create a Band.

Required:

* Band name
* Band icon
* project description
* GitHub repository setup

Recommended flow:

```text
Create Band
    ↓
Name
    ↓
Icon
    ↓
Description
    ↓
Create / Connect GitHub Repository
    ↓
Optional Project Questionnaire
    ↓
Band Created
```

The creator becomes:

**Band Admin**

---

# 11. PROJECT QUESTIONNAIRE

The questionnaire is optional.

Questions may include:

### Product

* What are you building?
* What problem does it solve?
* Who are the target users?
* What industry/domain is it for?

### Project

* Current project stage
* Expected timeline
* Team size
* Project goals

### Technology

* frontend technology
* backend technology
* database
* authentication
* APIs
* AI
* payments
* realtime
* cloud services
* external integrations

The questionnaire is used to improve planning suggestions and project setup.

It must be skippable.

---

# 12. PROJECT HOME

The Project Home is the default landing experience.

It should provide a visual overview rather than a traditional task dashboard.

Primary components:

1. Project Map
2. Project Pulse
3. Current Activity
4. Recent Changes
5. Needs Attention
6. Active Team Members

---

# 13. PROJECT MAP

The Project Map is a visual representation of the project's planning structure.

Example:

```text
                    PRODUCT
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
         PRD          STAGE     ARCHITECTURE
          │            │            │
          └────────────┼────────────┘
                       ↓
                     TASKS
                       │
                       ↓
                    GITHUB
                       │
                       ↓
                    PROGRESS
```

Requirements:

* zoom
* pan
* click nodes
* hover states
* contextual panels
* filtering
* search
* relationship highlighting
* user presence
* live updates

Clicking a node opens its associated object.

---

# 14. PROJECT PULSE

Project Pulse gives a visual representation of current project status.

Example:

```text
PROJECT PULSE

Overall
██████████████░░░░ 68%

Planning
████████████████░ 82%

Design
███████████████░░ 76%

Architecture
████████████░░░░░ 63%

Development
█████████░░░░░░░░ 48%

Testing
█████░░░░░░░░░░░░ 27%
```

Additional indicators:

* blocked items
* unresolved concerns
* pending decisions
* active discussions
* completed tasks
* recent changes
* requirements without implementation
* implementation without associated planning context

Progress calculations must be transparent and configurable.

---

# 15. PROJECT ACTIVITY

Activity should show meaningful project events.

Examples:

```text
10:42  Poulami edited PRD v8
10:44  Anusha commented on FR-027
10:47  Enakshi updated Architecture v6
10:51  Koel created DEC-031
11:02  Poulami opened auth.service.ts
11:03  Poulami started DISC-082
11:15  Anusha resolved DISC-082
11:21  GitHub PR #142 opened
```

Events should be:

* timestamped
* associated with users
* associated with project objects
* clickable
* real-time

---

# 16. PRESENCE SYSTEM

Presence is a major UX feature.

Each Band member receives a stable visual identity color within that Band.

Example:

```text
Poulami → Purple
Anusha  → Blue
Enakshi → Green
Koel    → Orange
```

Presence color may appear in:

* cursors
* selection outlines
* editing indicators
* active object indicators
* avatar rings
* comments
* Stage
* Architecture
* PRD
* Roadmap

Example:

```text
● Anusha is editing this section
● Poulami is viewing FR-027
● Enakshi is currently on Architecture
```

Presence colors represent **users**, not system state.

System states must use separate semantic indicators.

---

# 17. CHANGE VISUAL LANGUAGE

Friday must visually distinguish:

* New
* Modified
* Removed
* Blocked
* At Risk
* Approved
* Pending
* Review Required

Do not communicate these states using color alone.

Use combinations of:

* icon
* label
* border
* color
* animation
* tooltip
* pattern

Example:

```text
+ NEW

↻ MODIFIED

− REMOVED

⚠ BLOCKED

◌ REVIEW REQUIRED

✓ APPROVED
```

---

# 18. PLAN DOMAIN

The Plan is the core of Friday.

It contains:

* PRD
* requirements
* roadmap
* milestones
* tasks
* decisions
* questions
* assumptions
* change requests
* version history

---

# 19. PRD

The PRD is a living, collaborative planning document.

It supports:

* rich text
* headings
* lists
* tables
* images
* embeds
* requirements
* comments
* mentions
* links
* structured blocks
* versioning

---

# 20. PRD MODES

The PRD should have multiple representations.

### Document Mode

Traditional rich document.

### Map Mode

Interactive requirement/product graph.

### Change Mode

Visual version comparison.

### Discussion Mode

Comments and discussions associated with sections/requirements.

---

# 21. PRD REQUIREMENTS

Requirements receive stable identifiers.

Example:

```text
FR-027
Users can create private workspaces.
```

Each requirement contains:

* ID
* title
* description
* type
* priority
* status
* acceptance criteria
* source
* owner
* created date
* updated date
* related decisions
* related Stage objects
* related architecture
* related tasks
* related code discussions
* related GitHub implementation

---

# 22. PRD FLOW MAP

Friday should automatically generate a visual representation of the product plan.

Example:

```text
PRODUCT
   │
   ├── USERS
   │
   ├── GOALS
   │
   └── FEATURES
          │
          ├── Authentication
          │      ├── FR-01
          │      └── FR-02
          │
          ├── Collaboration
          │      ├── FR-12
          │      └── FR-13
          │
          └── Notifications
                 └── FR-20
```

Users can:

* expand/collapse
* zoom
* select requirements
* filter
* navigate to source
* create relationships

---

# 23. PRD VERSIONING

Every published PRD version is immutable.

Statuses:

```text
DRAFT
IN_REVIEW
PUBLISHED
SUPERSEDED
ARCHIVED
```

Rules:

1. Published versions cannot be overwritten.
2. Editing a published version creates a new draft.
3. Only one published version is current.
4. Every version stores its parent version.
5. Changes are recorded.
6. Version comparison is supported.
7. Published versions can be shared with clients.
8. Internal drafts are never automatically exposed externally.

---

# 24. PRD VERSION DIFF

Example:

```text
PRD v7 → v8

+ 3 requirements
↻ 2 modified
− 1 removed

Affected:

Architecture
  ⚠ 2 components

Stage
  ⚠ 1 flow

Tasks
  ⚠ 4 tasks

Code
  ⚠ 2 code areas
```

Users can click every affected item.

---

# 25. ROADMAP

The roadmap is the team's high-level development plan.

Supported representations:

### Timeline

```text
SEP       OCT       NOV
│─────────│─────────│

Auth      █████
Workspace    ███████
Chat             ███████
Billing                █████
```

### Milestone Map

```text
MVP
 │
 ├── Authentication
 ├── Core Workspace
 ├── Collaboration
 └── Testing
```

### Dependency Map

```text
Authentication
      ↓
Workspace
      ↓
Permissions
      ↓
Collaboration
```

---

# 26. MILESTONES

Milestones represent major project outcomes.

A milestone contains:

* name
* description
* target date
* status
* requirements
* tasks
* dependencies
* owner
* progress
* discussions

Statuses:

```text
PLANNED
ACTIVE
AT_RISK
BLOCKED
COMPLETED
CANCELLED
```

---

# 27. TASKS

Friday includes lightweight task management.

Tasks contain:

* title
* description
* status
* priority
* assignee
* due date
* milestone
* dependencies
* requirement links
* architecture links
* Stage links
* discussions
* GitHub links
* optional Jira link

Statuses:

```text
BACKLOG
PLANNED
IN_PROGRESS
BLOCKED
IN_REVIEW
DONE
CANCELLED
```

Friday should avoid becoming a full Jira replacement.

---

# 28. DECISIONS

Decision is a first-class planning object.

Example:

```text
DEC-031

Decision:
Use OAuth instead of password authentication.

Reason:
Reduce credential management complexity.

Origin:
FR-021

Discussion:
DISC-042

Architecture:
Authentication Service

Status:
APPROVED
```

Decisions can be connected to:

* requirements
* questions
* discussions
* architecture
* tasks
* code

---

# 29. OPEN QUESTIONS

Teams can create unresolved questions.

Example:

```text
Q-018

Should invitation links expire?

Owner:
Anusha

Related:
FR-027

Status:
OPEN
```

Lifecycle:

```text
OPEN
 ↓
DISCUSSING
 ↓
DECIDED
 ↓
RESOLVED
```

A resolved question can produce a Decision.

---

# 30. ASSUMPTIONS

Friday supports an Assumption Register.

Example:

```text
A-03

Assumption:
Most users will access the product
from desktop browsers.

Confidence:
MEDIUM

Status:
VALIDATING
```

Statuses:

* VALIDATING
* VALIDATED
* INVALIDATED
* ARCHIVED

Invalidating an assumption can trigger impact analysis.

---

# 31. CHANGE REQUESTS

Change Requests represent requested modifications to the project plan.

Sources may include:

* team member
* client
* stakeholder
* discussion
* architecture
* implementation discovery

Lifecycle:

```text
SUBMITTED
 ↓
UNDER_REVIEW
 ↓
ACCEPTED / REJECTED
 ↓
IMPLEMENTED
```

Accepted changes may result in:

* PRD draft
* Stage update
* architecture review
* task changes
* GitHub work
* client communication

---

# 32. STAGE

Stage is Friday's interactive visual planning canvas.

It is not merely a whiteboard.

It is a structured visual planning environment.

Stage may contain:

* screens
* users
* actions
* features
* requirements
* APIs
* services
* databases
* tasks
* decisions
* questions
* notes

---

# 33. STAGE INTERACTION

Users can:

* create objects
* move objects
* resize objects
* connect objects
* group objects
* annotate objects
* comment on objects
* link objects to project entities
* collaborate in real time
* see other users' cursors
* see selections
* undo/redo
* zoom/pan

---

# 34. STAGE EXAMPLE

```text
USER
  ↓
Landing Page
  ↓
Sign Up
  ↓
Email Verification
  ↓
Create Workspace
  ├── Invite Team
  ↓
Dashboard
```

Selecting:

**Create Workspace**

shows:

```text
FR-027

Architecture:
Workspace Service

Tasks:
TASK-83
TASK-91

Discussions:
DISC-21

Code:
workspace.controller.ts
```

---

# 35. ARCHITECTURE

Architecture is an interactive planning artifact.

It represents how the product will be technically implemented.

Example:

```text
Frontend
   │
   ↓
API
   ├── Auth
   ├── Projects
   └── Notifications
             │
             ↓
            Redis
```

---

# 36. ARCHITECTURE COMPONENTS

Each architecture component may contain:

* name
* type
* purpose
* technology
* dependencies
* requirements
* Stage relationships
* tasks
* code paths
* discussions
* decisions
* owner
* version history

---

# 37. ARCHITECTURE MODES

### Diagram

Interactive architecture graph.

### Component View

List/grid of components.

### Dependency View

Dependency graph.

### Change View

Version comparison.

### Impact View

Affected components.

---

# 38. ARCHITECTURE VERSIONING

Architecture follows the same version model as PRD.

```text
v1
 ↓
v2
 ↓
v3
 ↓
v4 CURRENT
```

Published/approved versions are immutable.

---

# 39. PLAN → ARCHITECTURE CONNECTION

When a PRD requirement changes:

Friday identifies potentially affected architecture.

Example:

```text
FR-021 changed
      ↓
Authentication
      ↓
Auth Service
      ↓
OAuth Provider
```

Friday marks affected artifacts:

```text
⚠ Architecture Review Required
```

Friday does not automatically modify approved architecture.

---

# 40. PROJECT PROGRESS

Progress should be represented visually.

Friday should support:

* overall progress
* planning progress
* design progress
* architecture progress
* development progress
* testing progress
* milestone progress
* task progress

---

# 41. PROGRESS CALCULATION

Progress must not rely solely on:

```text
completed tasks / total tasks
```

Potential signals:

* completed tasks
* milestone completion
* requirement completion
* implementation status
* blocked work
* review status
* testing status

The system should expose the factors contributing to progress.

---

# 42. PROJECT HEALTH

Friday should identify:

### Planning

* incomplete requirements
* requirements without tasks
* tasks without requirements
* architecture gaps
* unresolved decisions

### Collaboration

* unresolved discussions
* pending decisions
* inactive areas
* unanswered questions

### Development

* blocked tasks
* stale work
* open concerns
* PRs awaiting review

---

# 43. "NEEDS ATTENTION"

Friday should provide a prioritized visual attention center.

Example:

```text
NEEDS ATTENTION

⚠ FR-021 changed
   Architecture needs review.

⚠ TASK-83 blocked
   Waiting for DEC-031.

⚠ DISC-42 unresolved
   Decision required.

⚠ PR #142 changed
   Implementation may differ from Stage.
```

Every item is actionable.

---

# 44. CHANGE CENTER

Change Center provides a project-wide view of recent changes.

Example:

```text
CHANGES SINCE YESTERDAY

PRD
+ 2
↻ 3
− 1

STAGE
↻ 4

ARCHITECTURE
↻ 2

TASKS
+ 5
✓ 7

GITHUB
2 PRs
14 commits
```

Selecting an item opens its detailed change view.

---

# 45. IMPACT ANALYSIS

Impact Analysis is a core planning capability.

If a user changes a requirement:

```text
Requirement
     ↓
Decision
     ↓
Stage
     ↓
Architecture
     ↓
Tasks
     ↓
Code
```

Friday identifies connected objects.

Example:

```text
FR-027 CHANGED

Potential Impact

✓ Stage: Workspace Flow
⚠ Architecture: Workspace Service
⚠ Tasks: 3
⚠ Discussions: 2
⚠ Code: 4 files
```

Impact results should include confidence where appropriate.

---

# 46. "WHY?" INTERACTION

Important project objects should support a **Why?** action.

Example:

```text
Redis

[ WHY? ]
```

Friday displays:

```text
Introduced because:

DEC-031
Real-time presence requires
shared low-latency state.

Origin:
FR-042

Discussion:
DISC-81

Architecture:
v6
```

This should be available for:

* architecture components
* tasks
* requirements
* decisions
* Stage objects
* code relationships

---

# 47. "WHAT CHANGED?" INTERACTION

Any versioned artifact can expose:

> What changed?

Example:

```text
Architecture v6 → v7

+ Notification Service
↻ Auth Service
− Legacy Email Service

Affected:
3 requirements
4 tasks
2 Stage objects
```

---

# 48. "WHAT BREAKS?" INTERACTION

For a selected artifact:

> What could this change affect?

Example:

```text
Remove Authentication Service

Potential Impact

Requirements
FR-01
FR-02
FR-09

Stage
Login Flow

Tasks
8

Code
12 files

GitHub
3 open PRs
```

This is planning assistance, not autonomous modification.

---

# 49. PROJECT STORY

Friday should maintain a visual chronological project history.

Example:

```text
PROJECT STORY

IDEA
 ↓
PRD v1
 ↓
Stage v1
 ↓
Architecture v1
 ↓
Decision #1
 ↓
PRD v2
 ↓
Development Begins
 ↓
PR #12
 ↓
Requirement Change
 ↓
Architecture v3
 ↓
Current State
```

Users can navigate through historical project states.

---

# 50. PROJECT REPLAY

Future feature.

Users can replay project evolution.

The system visualizes:

* plan changes
* design changes
* architecture changes
* decisions
* implementation milestones

as a chronological project evolution.

---

# 51. CODE CONTEXT

GitHub is the source of truth for code.

Friday connects to a GitHub repository.

Friday should support:

* repository browsing
* file browsing
* branch browsing
* commit browsing
* pull request viewing
* code discussions
* code concerns
* relationship to planning artifacts

---

# 52. CODE IS NOT THE PRIMARY WORKSPACE

Friday is not intended to replace VS Code.

The code experience exists to provide:

> **implementation context for the project plan.**

Users should be able to inspect code and understand how it relates to:

* requirements
* architecture
* tasks
* discussions
* decisions

---

# 53. CODE DISCUSSIONS

Users can select code and create contextual discussions.

A discussion stores:

* repository
* branch
* commit
* file
* code range
* code fingerprint/content anchor
* author
* participants
* type
* priority
* status
* replies
* suggested edits
* resolution
* timestamps

---

# 54. CODE ANCHORING

Discussions must not rely only on line numbers.

Store:

* file path
* commit SHA
* original range
* code fingerprint
* surrounding context

If the code changes, Friday attempts to relocate the discussion.

If confidence is low:

> **Code anchor requires review.**

Never silently move an important discussion to unrelated code.

---

# 55. CODE CONCERNS

A Concern identifies something requiring attention.

Examples:

* requirement conflict
* architecture concern
* implementation concern
* potential bug
* missing functionality
* security concern
* unclear behavior

Lifecycle:

```text
OPEN
 ↓
ACKNOWLEDGED
 ↓
IN_PROGRESS
 ↓
RESOLVED
 ↓
VERIFIED
```

---

# 56. CODE → PLANNING

Code discussions can connect back to planning.

Example:

```text
auth.service.ts
     ↓
DISC-82
     ↓
FR-021
     ↓
DEC-042
     ↓
Architecture: Auth Service
```

This makes implementation understandable within project context.

---

# 57. GIT MAP

Git Map is a visual representation of repository development history.

It may show:

* branches
* commits
* pull requests
* merges
* reviews
* requested changes

Example:

```text
main
 ●
 │
 ●──── feature/auth
 │          ●
 │          ●
 │          ●── PR #142
 │                │
 ●────────────────●
```

Users can click commits/PRs to inspect associated planning context.

---

# 58. GITHUB INTEGRATION

Friday uses GitHub as the code source.

Supported capabilities:

* repository connection
* repository browsing
* branches
* commits
* pull requests
* reviews
* synchronization
* webhook updates

Friday should not duplicate the entire GitHub system.

---

# 59. JIRA INTEGRATION

Jira is optional.

It exists to allow teams already using Jira to connect execution to Friday's planning.

Friday should not recreate Jira.

Example:

```text
FR-027
   ↓
Friday Task
   ↓
Jira FRI-142
```

Jira remains the source of truth for Jira-specific execution state.

---

# 60. TASK → JIRA

A task may be exported/linked to Jira.

The Friday task maintains:

* Jira issue ID
* Jira issue key
* Jira URL
* synchronization state

Friday maintains the planning context.

Jira maintains execution details.

---

# 61. REAL-TIME COLLABORATION

Real-time collaboration is a core product pillar.

Users should be able to collaborate simultaneously in:

* PRD
* Stage
* Architecture
* Roadmap
* task views
* discussions
* comments

---

# 62. MULTIPLAYER EXPERIENCE

Users should see:

* live cursors
* active users
* selections
* editing state
* presence
* comments appearing in real time
* updates without refresh

The experience should feel similar to collaborative tools such as Figma/Google Docs, adapted to software planning.

---

# 63. COLLABORATIVE PRD

Multiple users may edit the same PRD simultaneously.

Requirements:

* conflict-safe editing
* live presence
* cursor awareness
* version creation
* comments
* mentions
* change tracking
* undo/redo

---

# 64. COLLABORATIVE STAGE

Stage should provide true multiplayer interaction.

Users see:

```text
● Anusha
● Poulami
● Enakshi
```

with:

* cursors
* selections
* object movement
* object creation
* comments

Updates appear without page refresh.

---

# 65. COLLABORATIVE ARCHITECTURE

Architecture editing should support:

* live cursors
* selected components
* component movement
* relationship editing
* comments
* version creation
* presence

---

# 66. COMMENTS

Comments are contextual.

They may attach to:

* PRD paragraph
* requirement
* Stage object
* architecture node
* task
* milestone
* progress item
* code range

Comments support:

* replies
* mentions
* reactions
* resolution
* timestamps
* user identity

---

# 67. DISCUSSIONS

Discussions are richer than comments.

A Discussion can contain:

* title
* context
* participants
* replies
* status
* priority
* linked requirement
* linked decision
* linked task
* optional Jira issue

Example:

```text
DISC-82

Should OAuth tokens be refreshed
automatically?

Status:
OPEN

Related:
FR-021
Architecture v6
```

---

# 68. DECISION FROM DISCUSSION

A discussion can be converted into a formal Decision.

```text
Discussion
    ↓
Team Agreement
    ↓
Create Decision
```

The decision preserves the discussion as its source.

---

# 69. PROJECT CHAT

Friday may provide project chat.

However, chat is subordinate to planning.

Project chat should support:

* team communication
* mentions
* links to project objects
* notifications
* file attachments
* quick discussion

Important messages should be convertible into:

* task
* question
* decision
* discussion
* change request

---

# 70. VOICE

Optional project voice rooms.

Voice should support:

* joining/leaving
* participant presence
* mute
* active speaker
* room status

Voice conversations may generate manually created project objects.

AI transcription may be considered later.

---

# 71. NOTIFICATIONS

Notifications include:

* mentions
* comment replies
* assignments
* task changes
* discussion activity
* decision requests
* PRD changes
* architecture review requests
* change requests
* client comments
* client approvals
* GitHub events
* Jira synchronization events

---

# 72. CLIENT SHARING

Friday supports controlled external project visibility.

The client does not access the internal Band workspace.

Instead, Friday creates a controlled Client View.

---

# 73. CLIENT CAN SEE

Depending on publishing permissions:

* published PRD
* published Site/Product Overview
* selected project progress
* milestones
* selected feature information
* comments
* change requests
* approval history

---

# 74. CLIENT CANNOT SEE

By default:

* source code
* GitHub
* commits
* branches
* pull requests
* internal discussions
* private tasks
* internal concerns
* architecture
* Stage
* internal decisions
* internal project chat
* internal activity
* unpublished drafts

Authorization must be enforced server-side.

Hiding UI elements is not sufficient.

---

# 75. MASKED CLIENT INFORMATION

Friday should allow teams to publish a controlled representation of internal planning.

Example:

## Internal

```text
Architecture
Auth Service
Redis
PostgreSQL
Internal Security Decision
Developer Task
```

## Client View

```text
Authentication
✓ Planned
✓ Designed
◉ Development
```

The client sees the product-level meaning without internal implementation details.

---

# 76. CLIENT PRD

Clients should see only explicitly published versions.

Example:

Internal:

```text
PRD v8 Draft
PRD v7 Published
```

Client:

```text
PRD v7
```

When v8 is published:

```text
Client → PRD v8
```

---

# 77. CLIENT PROGRESS

Client-facing progress should be deliberately masked.

Example:

```text
PROJECT PROGRESS

Product Planning       ✓
Design                 ✓
Development            72%
Testing                42%

Current Phase:
Development

Next Milestone:
Beta Testing
```

Do not expose internal task-level details unless explicitly published.

---

# 78. CLIENT COMMENTS

Clients can comment on published artifacts.

Example:

```text
Published PRD v7

Feature:
Team Invitations

Client:
"Can invitations also be shared
through a link?"
```

This can become:

```text
Client Comment
      ↓
Change Request
      ↓
Internal Review
      ↓
Accept / Reject
```

---

# 79. CLIENT CHANGE REQUESTS

Clients should not directly manipulate internal tasks or Jira.

Instead:

```text
Client
 ↓
Change Request
 ↓
Team Review
 ↓
Decision
 ↓
PRD Draft
 ↓
Architecture Review
 ↓
Task
 ↓
Implementation
```

---

# 80. CLIENT APPROVAL

Client-facing artifacts can support:

```text
DRAFT
 ↓
READY FOR CLIENT
 ↓
CLIENT REVIEW
 ↓
APPROVED
 ↓
PUBLISHED
```

Client approval should be recorded.

---

# 81. PUBLISHING MODEL

Each major artifact can have:

* internal draft
* internal review
* published version

Publishing creates an explicit visibility boundary.

No accidental exposure of drafts.

---

# 82. SEARCH

Friday should provide universal project search.

Search should cover:

* PRD
* requirements
* Stage
* architecture
* tasks
* decisions
* questions
* assumptions
* discussions
* code
* GitHub metadata
* Jira links
* activity

Example:

Search:

> OAuth

Results:

```text
PRD
FR-021

DECISIONS
DEC-042

ARCHITECTURE
Auth Service

STAGE
Login Flow

TASKS
TASK-81
TASK-83

DISCUSSIONS
DISC-42

CODE
/src/auth/
/src/auth/oauth.service.ts
```

---

# 83. COMMAND PALETTE

`Cmd/Ctrl + K`

Actions:

```text
Search project

Create Requirement
Create Task
Create Decision
Create Question
Create Discussion
Create Milestone
Create Change Request

Open PRD
Open Stage
Open Architecture
Open Roadmap
Open Git Map

Show Project Map
Show Changes
Show Blockers
Show Attention

Share with Client
```

---

# 84. UNIVERSAL OBJECT PANEL

Clicking an object should open a consistent contextual panel.

Example:

```text
FR-027

Users can create private workspaces.

STATUS
Planned

RELATED
Architecture
Stage
Tasks
Discussions
Code

HISTORY
PRD v5
PRD v6
PRD v7
PRD v8

ACTIONS
Discuss
Create Task
View Impact
Why?
View Changes
```

This interaction pattern should remain consistent across Friday.

---

# 85. VISUAL DIFFS

Friday should support visual comparisons for:

* PRD
* Stage
* Architecture
* roadmap
* project state

Examples:

```text
BEFORE                 AFTER

Login                  Login
 ↓                      ↓
Password              OAuth
 ↓                      ↓
Dashboard              Dashboard
```

Changes should be visually highlighted.

---

# 86. PROJECT BASELINE

A Baseline represents a coherent project state.

Example:

```text
PROJECT BASELINE #12

PRD
v8

Stage
v9

Architecture
v6

GitHub
main @ a83fd1

Roadmap
Sprint 4

Created
Sep 12
```

Baselines allow the team to understand what the project looked like at a specific point in time.

---

# 87. PROJECT LINEAGE

Friday internally maintains relationships between project objects.

Example:

```text
Client Request
      ↓
Requirement
      ↓
Discussion
      ↓
Decision
      ↓
Stage
      ↓
Architecture
      ↓
Task
      ↓
Code
      ↓
Commit
      ↓
Pull Request
```

Possible relationship types:

* derived_from
* caused_by
* implements
* affects
* discusses
* challenges
* resolved_by
* changed_by
* verified_by
* related_to

This relationship layer powers visual maps, impact analysis and project intelligence.

---

# 88. PROJECT STATE

Friday should be able to represent:

> **What is the current state of the project?**

Example:

```text
CURRENT PROJECT STATE

Intent
PRD v8

Design
Stage v9

Architecture
v6

Execution
Tasks 71% complete

Implementation
main @ a83fd1

Open Decisions
4

Blockers
2

Active Discussions
8
```

---

# 89. AI — FRIDAY PLANNING INTELLIGENCE

AI is not the primary product.

It is a planning assistant.

The AI should understand the project graph.

It can:

* summarize
* explain
* identify inconsistencies
* detect potential impacts
* suggest relationships
* identify missing planning information
* summarize project changes
* explain architecture
* explain progress
* surface blockers

---

# 90. AI EXAMPLES

### Planning

> "What should we work on next?"

### Changes

> "What changed since yesterday?"

### Impact

> "What will changing FR-027 affect?"

### Architecture

> "Why are we using Redis?"

### Progress

> "What's blocking the project?"

### Consistency

> "Which requirements don't have implementation?"

### Planning gaps

> "Which features have no architecture?"

### Client

> "What changed since the last published version?"

---

# 91. AI SAFETY MODEL

AI follows:

```text
ANALYZE
 ↓
SUGGEST
 ↓
HUMAN REVIEW
 ↓
HUMAN ACTION
```

AI must not autonomously:

* publish client artifacts
* modify approved architecture
* change permissions
* merge GitHub PRs
* push code
* delete history
* create irreversible project changes
* approve client requests
* silently alter project state

---

# 92. DESIGN SYSTEM

Friday's UI should prioritize clarity and visual hierarchy.

Design principles:

### Calm

Avoid dashboard overload.

### Spatial

Use meaningful whitespace.

### Visual

Prefer diagrams, maps and indicators.

### Interactive

Objects should respond to hover, selection and movement.

### Contextual

Details appear when needed.

### Collaborative

Other users are visibly present.

### Distinct

Changes must be immediately recognizable.

---

# 93. USER PRESENCE UX

Presence should be subtle but obvious.

Examples:

```text
● Anusha
   Editing PRD

● Poulami
   Viewing FR-027

● Enakshi
   Editing Architecture

○ Koel
   Offline
```

Avoid distracting animations.

Presence indicators should not overwhelm the actual project content.

---

# 94. MICROINTERACTIONS

Important interactions should provide visual feedback.

Examples:

* node selection
* drag/drop
* object creation
* comment creation
* version publication
* task completion
* status changes
* collaborator arrival
* collaborator leaving
* successful save
* conflict warning
* synchronization

---

# 95. RESPONSIVE BEHAVIOR

Primary experience:

**Desktop-first**

because planning and visual collaboration require large workspaces.

Support:

* desktop
* laptop
* tablet where practical

Mobile should prioritize:

* notifications
* comments
* chat
* activity
* approvals
* progress

Complex Stage/Architecture editing may remain desktop-first.

---

# 96. ACCESSIBILITY

Do not depend exclusively on color.

Support:

* keyboard navigation
* focus states
* screen-reader labels
* semantic HTML
* color-independent status indicators
* readable contrast
* reduced motion
* accessible dialogs
* accessible canvas controls

---

# 97. CORE USER FLOWS

## Flow 1 — Create Project

```text
Sign Up
 ↓
Create Band
 ↓
Project Information
 ↓
Connect GitHub
 ↓
Optional Questionnaire
 ↓
Project Home
```

---

## Flow 2 — Plan Product

```text
Project Home
 ↓
PRD
 ↓
Create Requirements
 ↓
Discuss
 ↓
Create Decisions
 ↓
Create Roadmap
 ↓
Create Milestones
```

---

## Flow 3 — Visualize Product

```text
Requirement
 ↓
Stage
 ↓
Create User Flow
 ↓
Connect Requirements
 ↓
Discuss
```

---

## Flow 4 — Design Architecture

```text
Requirements
 ↓
Architecture
 ↓
Create Components
 ↓
Connect Dependencies
 ↓
Link Requirements
 ↓
Review
```

---

## Flow 5 — Execute

```text
Requirements
 ↓
Tasks
 ↓
Assignments
 ↓
GitHub
 ↓
Implementation
```

---

## Flow 6 — Discuss Code

```text
GitHub Repository
 ↓
Open File
 ↓
Select Code
 ↓
Create Discussion
 ↓
Discuss
 ↓
Create Decision / Task
```

---

## Flow 7 — Requirement Change

```text
Edit Requirement
 ↓
Create PRD Draft
 ↓
Version Diff
 ↓
Impact Analysis
 ↓
Architecture Review
 ↓
Stage Review
 ↓
Task Review
 ↓
Human Approval
 ↓
Publish
```

---

## Flow 8 — Client Change

```text
Client
 ↓
Published PRD
 ↓
Comment
 ↓
Change Request
 ↓
Internal Review
 ↓
Accept
 ↓
PRD Draft
 ↓
Architecture Review
 ↓
Tasks
 ↓
Implementation
```

---

## Flow 9 — Client Publication

```text
Internal Draft
 ↓
Internal Review
 ↓
Ready for Client
 ↓
Client Review
 ↓
Approval
 ↓
Publish
 ↓
Client View Updated
```

---

# 98. CORE DATABASE ENTITIES

The initial domain model should include:

```text
User
Band
BandMember

Project

PRD
PRDVersion
Requirement

Stage
StageBoard
StageObject
StageConnection
StageVersion

Architecture
ArchitectureVersion
ArchitectureComponent
ArchitectureConnection

Roadmap
Milestone
Task

Decision
Question
Assumption
ChangeRequest

Discussion
Comment
Concern

ActivityEvent
Notification

ProjectBaseline
ProjectRelationship

GitHubIntegration
GitHubRepository
GitHubBranch
GitHubCommit
GitHubPullRequest
CodeDiscussion

JiraIntegration
JiraIssueLink

ClientAccess
PublishedArtifact
ClientComment
ClientApproval
```

---

# 99. RELATIONSHIP MODEL

The most important relationships include:

```text
Requirement
    ↕
Decision
    ↕
Architecture
    ↕
Stage
    ↕
Task
    ↕
Code Discussion
    ↕
GitHub Commit / PR
```

Additional:

```text
Client Change Request
        ↓
Requirement
        ↓
Decision
        ↓
Architecture
        ↓
Task
```

---

# 100. REAL-TIME ARCHITECTURE

Recommended technology:

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Zustand
* TanStack Query

### Collaborative layer

* Liveblocks

Use for:

* presence
* cursors
* rooms
* collaborative editing
* comments
* multiplayer state

### Rich text

* Tiptap

### Visual diagrams

* React Flow

### Stage

* tldraw

### Code

* Monaco Editor

---

# 101. BACKEND

Recommended:

* Node.js
* NestJS
* TypeScript
* REST APIs
* WebSocket / Socket.IO where appropriate

Architecture:

```text
Next.js
   ↓
NestJS
   ↓
Domain Modules
   ↓
Prisma
   ↓
PostgreSQL
```

---

# 102. DATABASE

Use:

**PostgreSQL**

Recommended ORM:

**Prisma**

Core data should remain normalized.

Project relationships should be stored explicitly.

---

# 103. CACHING / JOBS

Use:

**Redis**

and:

**BullMQ**

for:

* background processing
* GitHub synchronization
* webhook processing
* notifications
* impact analysis jobs
* AI processing
* indexing

---

# 104. STORAGE

S3-compatible object storage for:

* project attachments
* images
* exported artifacts
* client-visible assets

---

# 105. AUTHENTICATION

Authentication should support:

* email/password
* OAuth providers as appropriate

Authorization is Band/project scoped.

Roles:

```text
BAND_ADMIN
MEMBER
CLIENT
```

Potential future roles:

```text
VIEWER
GUEST
```

---

# 106. AUTHORIZATION

Server-side authorization is mandatory.

Every API request involving a project object must verify:

```text
Authenticated User
        ↓
Band Membership
        ↓
Role
        ↓
Object Permission
        ↓
Action
```

Client users must never be able to access internal objects by guessing URLs or IDs.

---

# 107. GITHUB SECURITY

Use a GitHub App where possible.

Follow least privilege.

Friday must respect GitHub permissions.

Effective access:

```text
Friday Permission
        +
GitHub Permission
        =
Effective Permission
```

Friday cannot grant access that GitHub does not permit.

---

# 108. JIRA SECURITY

Jira integration should use OAuth 2.0 authorization.

Credentials and tokens:

* server-side only
* encrypted at rest
* never exposed to browser
* never committed to source control

---

# 109. VERSION CONTROL RULES

Versioning must be robust.

Rules:

1. Never overwrite immutable published versions.
2. Every new version has a parent.
3. Every publication creates an immutable snapshot.
4. Changes must be attributable.
5. Version numbers are monotonic.
6. Deleted content is retained in historical versions.
7. Historical relationships remain accessible.
8. Current state must be derivable from the latest approved versions.
9. Concurrent editing must not destroy another user's work.

---

# 110. COLLABORATIVE CONFLICT HANDLING

For collaborative artifacts:

```text
User A edits
User B edits
      ↓
Realtime synchronization
      ↓
Conflict-safe merge
```

For non-collaborative external changes:

```text
Local state
      ↓
Remote state changed
      ↓
Conflict detected
      ↓
User review
```

Never silently overwrite remote project information.

---

# 111. PERFORMANCE REQUIREMENTS

Target:

* fast initial project load
* incremental loading for large projects
* virtualized lists where needed
* lazy-loaded diagrams
* optimized graph rendering
* optimistic UI for low-risk interactions
* realtime updates without full-page reload

Large Stage and Architecture boards must remain usable.

---

# 112. REAL-TIME REQUIREMENTS

When User A changes a supported collaborative object:

User B should see the change without refreshing.

Presence updates should feel near-instantaneous.

Activity events should propagate in real time.

The system should gracefully recover from temporary connection loss.

---

# 113. OFFLINE / RECONNECT

If the realtime connection drops:

* indicate disconnected state
* preserve local edits where safe
* reconnect automatically
* synchronize after reconnect
* surface conflicts where necessary

Never falsely show a change as permanently saved if it has not reached the server.

---

# 114. NOTIFICATION MODEL

Notifications should be grouped.

Example:

```text
Planning
3 changes

Collaboration
5 mentions

Development
2 GitHub updates

Client
1 change request
```

Avoid notification spam.

---

# 115. AUDIT HISTORY

Important actions should create immutable audit events.

Examples:

* project created
* member added
* member removed
* PRD published
* architecture changed
* requirement modified
* decision approved
* client artifact published
* client approval
* permission change
* integration connected

---

# 116. SEARCH INDEX

Search should eventually support semantic and structured search.

Queries may include:

> "authentication"

> "blocked tasks"

> "requirements changed this week"

> "decisions involving OAuth"

> "architecture components related to payments"

---

# 117. CLIENT DATA ISOLATION

Client visibility must be based on explicit publication.

Internal artifacts should not be serialized into client responses unnecessarily.

The backend must filter data according to client permissions.

---

# 118. ERROR HANDLING

Errors should be human-readable.

Example:

Bad:

```text
500 Internal Server Error
```

Better:

```text
GitHub synchronization failed.

Friday could not access the repository.
Your project plan has not been affected.

[Retry]
[View Integration]
```

---

# 119. EMPTY STATES

Empty states should teach users how Friday works.

Example:

### Empty Architecture

```text
Your architecture starts here.

Turn your requirements into
a technical system map.

[Create Architecture]
```

### Empty Stage

```text
Turn your product idea into a visual flow.

[Create Stage]
```

### Empty Decisions

```text
Important discussions can become
formal project decisions.

[Create Decision]
```

---

# 120. MVP PRIORITY

## P0 — MUST BUILD

### Planning

* Project Home
* PRD
* PRD versioning
* Requirements
* Roadmap
* Milestones
* Tasks
* Decisions
* Questions
* Change Requests

### Visual

* Project Map
* PRD Map
* Stage
* Architecture
* visual relationships
* visual change indicators

### Collaboration

* real-time presence
* collaborative PRD
* collaborative Stage
* collaborative Architecture
* comments
* discussions
* mentions
* activity

### Code

* GitHub connection
* repository browser
* code viewing
* code discussions

### Progress

* Project Pulse
* progress tracking
* attention center
* change center

### Client

* published PRD
* published progress
* comments
* change requests
* client access isolation

---

# 121. P1 — SHOULD BUILD

* Git Map
* dependency maps
* impact analysis
* Project Baselines
* universal search
* command palette
* Jira integration
* client approvals
* richer project health
* assumptions
* visual version comparison

---

# 122. P2 — FUTURE

* Project Replay
* advanced AI planning intelligence
* semantic project search
* advanced progress forecasting
* voice transcription
* advanced client customization
* additional integrations
* automated planning recommendations

---

# 123. EXPLICITLY OUT OF CORE SCOPE

Friday will NOT initially attempt to become:

* a complete VS Code replacement
* a complete GitHub replacement
* a complete Jira replacement
* a complete Linear replacement
* a Discord replacement
* a Slack replacement
* a Figma replacement
* a generic whiteboard application

These tools may integrate with Friday.

Friday's core remains:

> **Collaborative software planning.**

---

# 124. CORE UX PRINCIPLE

Every screen should answer at least one of:

> What are we building?

> Why are we building it?

> How are we designing it?

> How are we planning to build it?

> What are we currently doing?

> What changed?

> What needs attention?

> Who is working on it?

> How does this relate to the rest of the project?

If a feature does not contribute to these questions, it should be questioned before entering the core product.

---

# 125. SIGNATURE FRIDAY INTERACTIONS

Friday should have a consistent set of powerful interactions.

### Why?

Understand the origin of an object.

### What changed?

Understand version differences.

### What does this affect?

Understand downstream impact.

### Show related

Explore connected project objects.

### Discuss

Start contextual collaboration.

### Convert to decision

Turn conversation into project knowledge.

### Create task

Turn planning into executable work.

### Share

Publish a controlled client representation.

---

# 126. SIGNATURE FRIDAY EXPERIENCE

The ideal user experience:

```text
Open Friday
      ↓
See project visually
      ↓
Understand current state
      ↓
See teammates online
      ↓
Open PRD
      ↓
Discuss requirement
      ↓
Create decision
      ↓
Update Stage
      ↓
Update Architecture
      ↓
Create tasks
      ↓
Developer opens GitHub code
      ↓
Discusses implementation
      ↓
Progress updates
      ↓
Requirement changes
      ↓
Friday detects impact
      ↓
Team reviews
      ↓
Plan evolves
      ↓
Client receives controlled update
```

This is the core Friday loop.

---

# 127. PRIMARY DEMONSTRATION

The strongest product demonstration should be:

## "Change the Plan"

Start with:

```text
FR-021

Users authenticate with passwords.
```

Show:

```text
Stage
   Login → Password → Dashboard

Architecture
   Auth Service → PostgreSQL

Tasks
   Implement password auth
```

Change requirement to:

```text
Users authenticate using Google OAuth.
```

Friday displays:

```text
PLAN CHANGE DETECTED

FR-021 modified.

Potential Impact:

Stage
⚠ Login Flow

Architecture
⚠ Auth Service

Tasks
⚠ 3 tasks

Discussions
⚠ 2 discussions

Code
⚠ 4 files
```

Team reviews the impact.

They discuss it.

They create a Decision.

They update Architecture.

They update Stage.

They update tasks.

The developer sees the change in context.

The client eventually receives a controlled updated view.

This demonstrates the entire product philosophy in one interaction.

---

# 128. SECONDARY DEMONSTRATION

## "Why does this exist?"

Select:

```text
Redis
```

Friday displays:

```text
WHY?

Decision:
DEC-031

Reason:
Required for real-time presence.

Origin:
FR-042

Discussion:
DISC-81

Architecture:
v6

Tasks:
TASK-91
TASK-92
```

This demonstrates connected planning.

---

# 129. THIRD DEMONSTRATION

## "Where are we?"

Open Project Pulse:

```text
PROJECT PULSE

Overall       68%

Planning      82%
Design        76%
Architecture  63%
Development   48%
Testing       27%

⚠ 3 blockers
⚠ 4 decisions
● 8 active discussions

6 teammates active
```

The team instantly understands the state of the project.

---

# 130. FOURTH DEMONSTRATION

## "Show the client"

Internal project:

```text
PRD
Stage
Architecture
Tasks
Code
GitHub
Discussions
```

Client view:

```text
PROJECT

Product Overview

Published Requirements

Feature Progress

Milestones

Comments

Change Requests
```

Internal implementation remains hidden.

---

# 131. PRODUCT SUCCESS METRICS

Primary:

### Planning adoption

Percentage of active projects using Friday's planning features.

### Collaborative planning activity

Number of collaborative edits/comments/discussions per project.

### Planning completeness

Percentage of projects with:

* PRD
* requirements
* roadmap
* architecture
* tasks

### Connected planning

Percentage of requirements connected to downstream planning/execution objects.

### Project engagement

Weekly active collaborators per Band.

### Change response

Time from a planning change being detected to being reviewed.

### Client engagement

Client comments/approvals/change requests on published artifacts.

---

# 132. QUALITY METRICS

Track:

* realtime synchronization reliability
* collaboration latency
* diagram rendering performance
* version integrity
* failed synchronizations
* GitHub synchronization failures
* unauthorized client access attempts
* data loss incidents

---

# 133. SECURITY REQUIREMENTS

Friday must:

* encrypt sensitive data
* protect integration credentials
* enforce authorization server-side
* isolate client data
* validate all inputs
* use secure sessions/tokens
* prevent IDOR/access-control vulnerabilities
* audit permission changes
* never expose secrets to frontend
* never commit credentials
* implement rate limiting
* securely process webhooks

---

# 134. DATA INTEGRITY

The system must prioritize preservation of project history.

Never:

* silently delete versions
* overwrite published artifacts
* silently overwrite remote code state
* silently modify approved architecture
* expose internal client-hidden objects

---

# 135. TECHNICAL ARCHITECTURE PRINCIPLE

Use a **modular monolith** initially.

Do not introduce microservices merely because Friday has multiple domains.

Suggested modules:

```text
Auth
Bands
Projects
Planning
PRD
Requirements
Roadmap
Tasks
Decisions
Questions
ChangeRequests
Stage
Architecture
Collaboration
Discussions
Progress
GitHub
Jira
Client
Notifications
Search
AI
Activity
```

---

# 136. FRONTEND PLAYGROUND

The central Playground should dynamically render the appropriate experience.

```text
PRD
→ Tiptap

Stage
→ tldraw

Architecture
→ React Flow

Roadmap
→ Timeline / Graph

Git Map
→ Graph visualization

Code
→ Monaco

Project Map
→ React Flow / graph layer

Progress
→ visual dashboard
```

The surrounding workspace remains consistent.

---

# 137. CONSISTENT OBJECT MODEL

Every important Friday object should expose:

```text
Identity
Description
Status
Owner
Relationships
Comments
Activity
History
Actions
```

This makes the platform coherent.

---

# 138. DESIGN GOAL

A new user should be able to enter a Band and understand within approximately one minute:

1. what the team is building
2. where the project currently stands
3. what the team is working on
4. what has changed
5. what needs attention
6. who is currently active

without reading a long document.

---

# 139. CORE PRODUCT LOOP

The fundamental Friday loop is:

```text
              ┌──────────────┐
              │     PLAN     │
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │  VISUALIZE   │
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │  ARCHITECT   │
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │   EXECUTE    │
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │    TRACK     │
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │    CHANGE    │
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │   RE-PLAN    │
              └──────┬───────┘
                     │
                     └────────→ PLAN
```

---

# 140. THE FRIDAY DIFFERENTIATOR

Friday's differentiation is not:

> "We have documents."

Not:

> "We have tasks."

Not:

> "We have a whiteboard."

Not:

> "We have GitHub."

Not:

> "We have AI."

The differentiation is:

> **Friday makes the entire software planning process collaborative, visual, connected, versioned, and continuously understandable.**

The product owns the **planning layer**.

GitHub owns the code.

Jira may own execution.

Friday connects the project together.

---

# 141. FINAL PRODUCT POSITIONING

### Short

> **Friday is where software gets planned.**

### Product description

> **Friday is a visual, real-time collaborative workspace where software teams plan, design, discuss, track, and evolve an entire product from idea to implementation.**

### Competitive explanation

> **Notion helps teams document together. GitHub helps teams build together. Friday helps software teams plan the entire product together.**

### Core promise

> **Plan the product. Build it together.**

### Product philosophy

> **The project plan should be a living, collaborative system — not a document that becomes outdated once development begins.**

---

# 142. FINAL PRODUCT MODEL

```text
                         FRIDAY
                           │
                  COLLABORATIVE PLANNING
                           │
        ┌──────────────────┼───────────────────┐
        │                  │                   │
       PLAN             VISUALIZE           TRACK
        │                  │                   │
       PRD               Stage             Progress
   Requirements       User Flows           Roadmap
    Roadmap          Product Maps          Tasks
   Milestones
   Decisions
   Questions
   Assumptions
        │                  │                   │
        └──────────────────┼───────────────────┘
                           ↓
                     ARCHITECTURE
                           │
                           ↓
                       GITHUB CODE
                           │
                           ↓
                     IMPLEMENTATION
                           │
                           ↓
                       REAL-TIME
                     COLLABORATION
                           │
                           ↓
                     CHANGE / FEEDBACK
                           │
                           ↓
                       RE-PLANNING
                           │
                           └───────────────→ PLAN


             ┌─────────────────────────┐
             │      CLIENT VIEW        │
             │                         │
             │ Published PRD           │
             │ Published Progress      │
             │ Published Overview      │
             │ Comments                 │
             │ Change Requests         │
             └─────────────────────────┘
```

# 143. FINAL LOCKED PRINCIPLE



Its primary purpose is to help a team **think about, define, visualize, organize, communicate, track, and continuously evolve the product they are building.**

The codebase, GitHub, Jira, AI, client sharing, chat and integrations exist around that central purpose.

### **PLAN → VISUALIZE → DISCUSS → ARCHITECT → EXECUTE → TRACK → CHANGE → RE-PLAN**

That loop is **Friday**.
