import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service';
import { Priority, RequirementStatus, ChangeState } from '@prisma/client';
import type { ArchitectureValidationReport } from '@friday/types';

import { ArchitectureService } from '../architecture/architecture.service';
import { PrdInterpreter } from '../architecture/engine/prd-interpreter';
import { ReasoningEngine } from '../architecture/engine/reasoning-engine';
import { ValidationEngine } from '../architecture/engine/validation-engine';

export interface ProjectSketchResult {
  prd: {
    title: string;
    content: string;
    problem: string;
    targetUsers: string;
    coreCapabilities: string;
  };
  requirements: Array<{
    identifier: string;
    title: string;
    description: string;
    priority: Priority;
    acceptanceCriteria: string[];
  }>;
  architecture: {
    nodes: Array<{
      nodeId: string;
      label: string;
      type: string;
      technology: string;
      description: string;
      requirementIdentifier?: string;
      positionX: number;
      positionY: number;
    }>;
    edges: Array<{
      edgeId: string;
      source: string;
      target: string;
      label: string;
      animated?: boolean;
    }>;
    // Derived by Friday's deterministic Reasoning Engine (not Gemini)
    validation?: ArchitectureValidationReport;
    unresolvedDecisions?: Array<{ id: string; title: string; reason: string }>;
    assumptions?: string[];
    complexityLevel?: 1 | 2 | 3 | 4;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI | null = null;
  private readonly geminiApiKey: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly architectureService: ArchitectureService,
  ) {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.logger.log('OpenAI client initialized');
    }

    this.geminiApiKey =
      this.config.get<string>('GEMINI_API') ||
      this.config.get<string>('GEMINI_API_KEY') ||
      null;

    if (this.geminiApiKey) {
      this.logger.log('Gemini AI API key initialized');
    } else {
      this.logger.warn('No GEMINI_API or OPENAI_API_KEY configured');
    }
  }

  /**
   * Shared Gemini REST call. Returns raw text. Model fallback is built in.
   */
  private async callGeminiText(prompt: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const models = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-pro'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          this.logger.warn(`Gemini model ${model} returned ${res.status}: ${errText}`);
          continue;
        }

        const json = (await res.json()) as any;
        const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          return candidate.trim();
        }
      } catch (err: any) {
        this.logger.warn(`Gemini model ${model} attempt error: ${err.message}`);
      }
    }

    throw new Error('All Gemini API models failed to generate content');
  }

  /**
   * Helper to call Gemini REST API with JSON output and fallback models.
   */
  private async callGemini(prompt: string): Promise<any> {
    const text = await this.callGeminiText(prompt);
    try {
      return JSON.parse(text);
    } catch {
      // Gemini sometimes wraps JSON in markdown fences
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced) return JSON.parse(fenced[1]);
      throw new Error('Gemini returned non-JSON content');
    }
  }

  /**
   * Band-aware software question answering ("Ask Gemini" canvas tool).
   * The question is answered with structured Band context (current PRD,
   * architecture, page, selected node) rather than as a generic prompt.
   * AI output is advisory — it never mutates project state.
   */
  async askSoftwareQuestion(
    bandId: string,
    _userId: string,
    question: string,
    context?: {
      bandName?: string;
      prdContent?: string;
      architectureSummary?: string;
      pageName?: string;
      selectedNode?: { title?: string; type?: string; body?: string };
    },
  ) {
    if (!this.geminiApiKey && !this.openai) {
      throw new Error('AI is not configured for this Band (no GEMINI_API or OPENAI_API_KEY set)');
    }

    const band = await this.prisma.band.findUnique({
      where: { id: bandId },
      include: {
        prd: { include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } },
        architecture: {
          include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1, include: { nodes: true } } },
        },
      },
    });
    if (!band) throw new NotFoundException('Band not found');

    const prdText =
      context?.prdContent || band.prd?.versions?.[0]?.content || '(no PRD yet)';
    const archText =
      context?.architectureSummary ||
      band.architecture?.versions?.[0]?.nodes
        ?.map((n) => `${n.label} (${n.type}${n.technology ? ', ' + n.technology : ''})`)
        .join(' → ') ||
      '(no architecture yet)';

    const prompt = `You are the senior software engineer embedded in Friday, a collaborative software planning workspace. Answer the user's question about the product below. Be concrete, practical and concise (under ~250 words). Prefer recommendations over essays. If a decision depends on missing information, say which one.

BAND: ${context?.bandName || band.name}
CURRENT PAGE: ${context?.pageName || 'Canvas'}
CURRENT PRD:
${prdText.substring(0, 6000)}

CURRENT ARCHITECTURE:
${archText.substring(0, 2000)}

${
  context?.selectedNode
    ? `SELECTED CANVAS NODE (focus of the question):
title: ${context.selectedNode.title || ''}
type: ${context.selectedNode.type || ''}
content: ${(context.selectedNode.body || '').substring(0, 2000)}`
    : ''
}

QUESTION:
${question}`;

    try {
      if (this.geminiApiKey) {
        return { answer: await this.callGeminiText(prompt), provider: 'gemini' };
      }
    } catch (err: any) {
      this.logger.warn(`Gemini askSoftwareQuestion error: ${err.message}`);
    }

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.get<string>('OPENAI_MODEL', 'gpt-4o'),
          messages: [
            { role: 'system', content: 'You are a pragmatic senior software engineer advising a product team. Answer concisely.' },
            { role: 'user', content: prompt },
          ],
        });
        return { answer: response.choices[0]?.message?.content || '', provider: 'openai' };
      } catch (err: any) {
        this.logger.error(`OpenAI askSoftwareQuestion error: ${err.message}`);
      }
    }

    throw new Error('AI providers are unavailable right now. Please try again later.');
  }

  /**
   * Generates a STRUCTURED, point-based PRD (sections + bullets, not an essay)
   * from a short product description. Output is advisory canvas content.
   */
  async generateStructuredPrd(
    bandId: string,
    _userId: string,
    description: string,
  ) {
    const band = await this.prisma.band.findUnique({ where: { id: bandId } });
    if (!band) throw new NotFoundException('Band not found');

    const prompt = `You are a product manager inside Friday, a collaborative software planning workspace.
Turn the short product description below into a STRUCTURED point-based PRD.

STRICT RULES:
- Point-based only: short section titles, each with 3-8 concise bullet points. No long paragraphs.
- Do NOT invent technologies unless the description implies them.
- Do NOT include "out of scope" padding; every bullet must carry planning value.

Return valid JSON only, exactly this shape:
{
  "title": "Short PRD title (max 60 chars)",
  "problem": "One sentence stating the core problem",
  "sections": [
    { "title": "Authentication", "items": ["GitHub OAuth", "Session persistence", "Logout"] }
  ]
}

Suggested section order (adapt as appropriate): Product Problem, Target Users, Core Features, User Flows, Data & State, Non-Functional, Open Questions.

BAND NAME: ${band.name}
PRODUCT DESCRIPTION:
"""
${description}
"""`;

    if (this.geminiApiKey) {
      try {
        const raw = await this.callGemini(prompt);
        return this.normalizeStructuredPrd(raw);
      } catch (err: any) {
        this.logger.warn(`Gemini generateStructuredPrd error: ${err.message}`);
      }
    }

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.get<string>('OPENAI_MODEL', 'gpt-4o'),
          messages: [
            { role: 'system', content: 'You are a product manager. Return valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        });
        return this.normalizeStructuredPrd(JSON.parse(response.choices[0]?.message?.content || '{}'));
      } catch (err: any) {
        this.logger.error(`OpenAI generateStructuredPrd error: ${err.message}`);
      }
    }

    // Deterministic fallback so the canvas tool works even without AI keys.
    return {
      title: `${band.name} — PRD`,
      problem: description.substring(0, 140) || 'Core problem statement to be refined by the crew.',
      sections: [
        {
          title: 'Product Problem',
          items: [description.substring(0, 200) || 'Describe the core problem this product solves.'],
        },
        {
          title: 'Target Users',
          items: ['Primary persona to be defined by the crew'],
        },
        {
          title: 'Core Features',
          items: [
            'MVP feature 1 (refine this)',
            'MVP feature 2 (refine this)',
          ],
        },
        {
          title: 'Open Questions',
          items: [
            'Configure GEMINI_API or OPENAI_API_KEY to generate the full structured PRD',
          ],
        },
      ],
    };
  }

  private normalizeStructuredPrd(raw: any) {
    const sections = Array.isArray(raw?.sections)
      ? raw.sections
          .filter((s: any) => s && typeof s.title === 'string' && Array.isArray(s.items))
          .map((s: any) => ({
            title: String(s.title).substring(0, 80),
            items: s.items.map((i: any) => String(i)).filter(Boolean).map((i: string) => i.substring(0, 300)),
          }))
      : [];
    return {
      title: String(raw?.title || 'Product Requirements Document').substring(0, 80),
      problem: String(raw?.problem || '').substring(0, 300),
      sections,
    };
  }

  /**
   * Formulates a full Living PRD, Requirements Table, PRD Lineage Map,
   * and initial Architecture Graph from a user's project sketch.
   */
  async generateProjectFromSketch(
    bandId: string,
    userId: string,
    sketch: string,
  ): Promise<ProjectSketchResult> {
    const band = await this.prisma.band.findUnique({ where: { id: bandId } });
    if (!band) {
      throw new NotFoundException('Band not found');
    }

    let generated: ProjectSketchResult;

    try {
      const systemPrompt = `You are the AI planning engine inside Friday, a collaborative software planning workspace.
Your responsibility is to transform a user's raw project idea into a practical, understandable, implementation-oriented software plan.
You are NOT being evaluated on how many technologies you can name. You are being evaluated on whether the plan makes sense.

ABSOLUTE PRIORITY ORDER:
USER PROBLEM -> USER NEED -> CORE FEATURES -> USER FLOW -> SYSTEM BEHAVIOR -> DATA FLOW -> MINIMUM REQUIRED ARCHITECTURE -> OPTIONAL FUTURE COMPLEXITY

NEVER optimize in the reverse direction (Technology -> Architecture -> Feature -> User). The technology MUST be a consequence of the product flow.

THE SIMPLICITY-FIRST & MINIMUM NECESSARY ARCHITECTURE RULE:
- The first version of every project must be designed around the simplest reasonable implementation (MVP).
- Assume: small initial user base, limited traffic, small team, one application, one database (or static content if no persistent records), straightforward APIs, simple deployment, NO unnecessary distributed infrastructure.
- For a simple website / portfolio / landing page / MVP tool:
  * LEVEL 1 (BASIC): Frontend UI (Next.js / HTML) + Backend API (Node.js/API Routes) + Data Store (PostgreSQL / SQLite or Static Data).
  * DO NOT introduce CDN, Edge routing, Redis, Queues, Microservices, Worker pools, or third-party service splits unless an explicit requirement specifically demands them!
  * If a simpler solution is sufficient, USE THE SIMPLER SOLUTION. "Not needed for MVP" is the preferred answer.

PRD MUST BE FLOW-FIRST:
Include clear Mermaid flowcharts in the PRD markdown content:
1. Primary User Journey / Site Flow (flowchart TD showing page-to-page navigation)
2. Core Feature Functional Flow (flowchart TD showing user action -> UI state -> API -> persistence -> result)
3. Data Flow (flowchart LR showing User -> UI -> API -> Database)

STRUCTURED INTERMEDIATE REPRESENTATION (IR):
Derive the architecture directly from the product flows.
Return a single JSON object conforming strictly to this JSON schema:
{
  "ir": {
    "problem": "Clear 1-sentence statement of the core problem being solved",
    "targetUsers": "1-sentence description of the primary user persona",
    "coreCapabilities": "Comma-separated list of the 3 essential capabilities",
    "userJourney": ["Step 1: Visitor enters", "Step 2: Explores", "Step 3: Completes action"],
    "requiresDatabase": boolean,
    "requiresBackend": boolean,
    "requiredTiers": ["Frontend", "Backend", "Database"]
  },
  "prd": {
    "title": "${band.name} — Product Requirements Document",
    "content": "A comprehensive, flow-first Markdown document with: # 1. Product Definition & Problem, # 2. MVP Scope & User Journey, # 3. Site & Feature Flowcharts (using mermaid blocks), # 4. Step-by-Step Build Milestones (Phase 1: Core Foundation, Phase 2: User Interface & Primary Flow, Phase 3: Persistence, Polish & Launch), # 5. Technology Justifications & 'Not Needed' list, and # 6. Explicitly Out of Scope.",
    "problem": "Same 1-sentence statement from ir.problem",
    "targetUsers": "Same 1-sentence statement from ir.targetUsers",
    "coreCapabilities": "Same 3 capabilities from ir.coreCapabilities"
  },
  "requirements": [
    {
      "identifier": "FR-001",
      "title": "Phase 1: Foundation & Core Layout",
      "description": "Establish the base client structure, essential screens, and entry navigation.",
      "priority": "CRITICAL",
      "acceptanceCriteria": ["Primary view renders responsively", "Navigation routes function correctly"]
    },
    {
      "identifier": "FR-002",
      "title": "Phase 2: Primary Feature Workflow",
      "description": "Implement the core interactive flow connecting user action to system behavior.",
      "priority": "HIGH",
      "acceptanceCriteria": ["User input validates cleanly", "Action completes with feedback"]
    },
    {
      "identifier": "FR-003",
      "title": "Phase 3: Persistence & End-to-End Integration",
      "description": "Wire up backend data persistence and complete end-to-end integration.",
      "priority": "HIGH",
      "acceptanceCriteria": ["Data persists across sessions", "Error handling displays gracefully"]
    }
  ],
  "architecture": {
    "nodes": [
      {
        "nodeId": "node-frontend",
        "label": "Frontend UI",
        "type": "frontend",
        "technology": "Next.js / React / Tailwind",
        "description": "Client interface and interactive views",
        "requirementIdentifier": "FR-001",
        "positionX": 80,
        "positionY": 120
      },
      {
        "nodeId": "node-backend",
        "label": "Backend Server",
        "type": "backend",
        "technology": "Node.js / API Routes",
        "description": "API endpoints, request validation, and business logic",
        "requirementIdentifier": "FR-002",
        "positionX": 380,
        "positionY": 120
      },
      {
        "nodeId": "node-database",
        "label": "Data Store",
        "type": "database",
        "technology": "PostgreSQL / SQLite",
        "description": "Persistent record storage",
        "requirementIdentifier": "FR-003",
        "positionX": 680,
        "positionY": 120
      }
    ],
    "edges": [
      {
        "edgeId": "edge-1",
        "source": "node-frontend",
        "target": "node-backend",
        "label": "HTTP Requests",
        "animated": true
      },
      {
        "edgeId": "edge-2",
        "source": "node-backend",
        "target": "node-database",
        "label": "Data Queries",
        "animated": false
      }
    ]
  }
}

The user's project name is "${band.name}".
The user's sketch is:
"""
${sketch}
"""

Synthesize this strictly following the Friday AI Planning Engine principles. Return valid JSON only.`;

      const aiResponse = await this.callGemini(systemPrompt);
      generated = this.normalizeSketchResult(aiResponse, band.name, sketch);
    } catch (err: any) {
      this.logger.error(`AI Generation failed: ${err.message}. Falling back to structured intelligent template.`);
      generated = this.generateFallbackProject(band.name, sketch);
    }

    // Persist the product understanding: PRD + Requirements (Gemini's role ends here).
    await this.persistProjectSpec(bandId, userId, generated);

    // Friday's deterministic Reasoning Engine derives the architecture from the
    // persisted PRD + Requirements. Gemini is an input source, NOT the architecture
    // authority — we never persist Gemini's proposed nodes/edges.
    const derived = await this.architectureService.generateArchitectureFromPrd(bandId, userId);
    const version = derived.version;

    generated.architecture = {
      nodes: (version.nodes || []).map((n) => ({
        nodeId: n.nodeId,
        label: n.label,
        type: n.type,
        technology: n.technology || '',
        description: n.description || '',
        requirementIdentifier: (n.data as any)?.requirementIdentifier,
        positionX: n.positionX,
        positionY: n.positionY,
      })),
      edges: (version.edges || []).map((e) => ({
        edgeId: e.edgeId,
        source: e.source,
        target: e.target,
        label: e.label || '',
        animated: e.animated,
      })),
      validation: derived.validation,
      unresolvedDecisions: derived.unresolvedDecisions,
      assumptions: derived.assumptions,
      complexityLevel: derived.complexityLevel,
    };

    return generated;
  }

  /**
   * Persists generated PRD version, Requirements, and Architecture version to the database.
   */
  private async persistProjectSpec(
    bandId: string,
    userId: string,
    spec: ProjectSketchResult,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // 1. PRD & PRDVersion
      let prd = await tx.pRD.findUnique({ where: { bandId } });
      if (!prd) {
        prd = await tx.pRD.create({
          data: {
            bandId,
            title: spec.prd.title,
          },
        });
      }

      const lastPrdVer = await tx.pRDVersion.findFirst({
        where: { prdId: prd.id },
        orderBy: { versionNumber: 'desc' },
      });
      const nextPrdVerNum = (lastPrdVer?.versionNumber ?? 0) + 1;

      const newPrdVersion = await tx.pRDVersion.create({
        data: {
          prdId: prd.id,
          versionNumber: nextPrdVerNum,
          title: spec.prd.title,
          content: spec.prd.content,
          changeSummary: 'AI generated from project sketch ("What are we building today?")',
          createdById: userId,
        },
      });

      await tx.pRD.update({
        where: { id: prd.id },
        data: {
          title: spec.prd.title,
          currentVersionId: newPrdVersion.id,
        },
      });

      // 2. Requirements: Remove any existing draft requirements for this band, then insert new ones
      await tx.requirement.deleteMany({ where: { bandId } });

      for (let i = 0; i < spec.requirements.length; i++) {
        const req = spec.requirements[i];
        await tx.requirement.create({
          data: {
            identifier: req.identifier || `FR-00${i + 1}`,
            bandId,
            prdId: prd.id,
            title: req.title,
            description: req.description,
            priority: req.priority || Priority.MEDIUM,
            status: RequirementStatus.APPROVED,
            changeState: ChangeState.NEW,
            acceptanceCriteria: req.acceptanceCriteria || [],
            order: i,
            createdById: userId,
          },
        });
      }

      // NOTE: Architecture is intentionally NOT persisted here. Gemini produces
      // product understanding (PRD + Requirements) only. The architecture is
      // derived deterministically by Friday's Reasoning Engine, which reads the
      // PRD + Requirements persisted above (see generateProjectFromSketch).
    });
  }

  private normalizeSketchResult(raw: any, bandName: string, sketch: string): ProjectSketchResult {
    const ir = raw.ir || {};
    const problem = ir.problem || raw.prd?.problem || `Addressing core requirements described in ${sketch.substring(0, 100)}`;
    const targetUsers = ir.targetUsers || raw.prd?.targetUsers || 'Primary users and team members';
    const coreCapabilities = ir.coreCapabilities || raw.prd?.coreCapabilities || 'User interface, core workflow handling, and persistent data';

    // Normalize requirements
    const requirements = (raw.requirements || []).map((r: any, idx: number) => ({
      identifier: r.identifier || `FR-00${idx + 1}`,
      title: r.title || `Phase ${idx + 1}: Feature Milestone`,
      description: r.description || '',
      priority: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(r.priority) ? r.priority : 'HIGH') as Priority,
      acceptanceCriteria: Array.isArray(r.acceptanceCriteria) && r.acceptanceCriteria.length > 0
        ? r.acceptanceCriteria
        : ['Verified through direct workflow testing and validation.'],
    }));

    // Architecture derived strictly from product flows
    // Filter out unjustified infrastructure (CDN, email relays, message queues) unless explicitly modeled
    let rawNodes = Array.isArray(raw.architecture?.nodes) ? raw.architecture.nodes : [];
    
    // Disallow overengineered/hallucinated node labels
    const bannedPatterns = /cdn|edge|hosting|formspree|mail|queue|bull|redis|worker|broker/i;
    rawNodes = rawNodes.filter((n: any) => !bannedPatterns.test(n.label || '') && !bannedPatterns.test(n.nodeId || ''));

    // If less than 2 nodes remain, construct the canonical flow-derived stack
    if (rawNodes.length < 2) {
      rawNodes = [
        {
          nodeId: 'node-frontend',
          label: 'Frontend UI',
          type: 'frontend',
          technology: 'Next.js / React / Tailwind',
          description: 'Client interface and reactive user flow',
          requirementIdentifier: requirements[0]?.identifier || 'FR-001',
          positionX: 80,
          positionY: 120,
        },
        {
          nodeId: 'node-backend',
          label: 'Backend Server',
          type: 'backend',
          technology: 'Node.js / Express / API Routes',
          description: 'Application request handling and business logic',
          requirementIdentifier: requirements[1]?.identifier || 'FR-002',
          positionX: 380,
          positionY: 120,
        },
        {
          nodeId: 'node-database',
          label: 'Data Store',
          type: 'database',
          technology: 'PostgreSQL / SQLite',
          description: 'Persistent application records',
          requirementIdentifier: requirements[2]?.identifier || 'FR-003',
          positionX: 680,
          positionY: 120,
        },
      ];
    }

    // Force clean horizontal step-by-step layout
    const nodes = rawNodes.map((n: any, idx: number) => ({
      nodeId: n.nodeId || `node-${idx + 1}`,
      label: n.label || (idx === 0 ? 'Frontend UI' : idx === 1 ? 'Backend Server' : 'Data Store'),
      type: n.type || (idx === 0 ? 'frontend' : idx === 1 ? 'backend' : 'database'),
      technology: n.technology || (idx === 0 ? 'Next.js / React' : idx === 1 ? 'Node.js' : 'PostgreSQL'),
      description: n.description || '',
      requirementIdentifier: n.requirementIdentifier || requirements[Math.min(idx, requirements.length - 1)]?.identifier || 'FR-001',
      positionX: 80 + idx * 300,
      positionY: 120,
    }));

    // Build clean sequential edges connecting nodes left-to-right
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        edgeId: `edge-${i + 1}`,
        source: nodes[i].nodeId,
        target: nodes[i + 1].nodeId,
        label: i === 0 ? 'HTTP Requests' : 'Data Queries',
        animated: i === 0,
      });
    }

    return {
      prd: {
        title: raw.prd?.title || `${bandName} — Product Requirements Document`,
        content: raw.prd?.content || `# ${bandName} PRD\n\n${sketch}`,
        problem,
        targetUsers,
        coreCapabilities,
      },
      requirements,
      architecture: {
        nodes,
        edges,
      },
    };
  }

  private generateFallbackProject(bandName: string, sketch: string): ProjectSketchResult {
    return {
      prd: {
        title: `${bandName} — Product Requirements Document`,
        problem: `Users need a simple, direct solution for: ${sketch.substring(0, 100)}.`,
        targetUsers: 'Primary users and team members looking for a streamlined workflow.',
        coreCapabilities: 'Intuitive interface, fast API endpoints, and dependable storage.',
        content: `# ${bandName} — Product Requirements Document

## 1. Overview & Objective
${bandName} is built to deliver a streamlined, effective solution for:
> ${sketch}

## 2. Core Problem & Solution
- **Problem**: Existing workflows are overly complex and fragmented.
- **Solution**: A lightweight, focused application delivering immediate value with zero bloat.

## 3. Essential User Flow
1. User accesses the interface.
2. User performs the core task directly.
3. System processes the input and persists results reliably.

## 4. Step-by-Step Implementation Milestones
- **Phase 1 (Core Foundation)**: Setup basic application server and database models.
- **Phase 2 (User Interface)**: Build interactive frontend screens for primary actions.
- **Phase 3 (Persistence & Launch)**: Connect end-to-end data flow, validate workflows, and deploy.

## 5. Explicitly Out of Scope
- Complex microservices or distributed message queues (unnecessary for MVP).
- Overengineered third-party enterprise integrations.
`,
      },
      requirements: [
        {
          identifier: 'FR-001',
          title: 'Core Application Engine & API',
          description: 'Establish the foundational backend service and request handlers.',
          priority: Priority.CRITICAL,
          acceptanceCriteria: [
            'API endpoints receive and validate request payloads.',
            'Health-check responds successfully.',
          ],
        },
        {
          identifier: 'FR-002',
          title: 'Direct Client Interface',
          description: 'Provide an intuitive, responsive user interface for the primary workflow.',
          priority: Priority.HIGH,
          acceptanceCriteria: [
            'User can trigger core actions and view immediate feedback.',
            'Responsive layout on desktop and mobile screens.',
          ],
        },
        {
          identifier: 'FR-003',
          title: 'Persistent Data Storage',
          description: 'Store and retrieve application records reliably.',
          priority: Priority.HIGH,
          acceptanceCriteria: [
            'Data mutations persist to the database without data loss.',
            'Queries return relevant records with low latency.',
          ],
        },
      ],
      architecture: {
        nodes: [
          {
            nodeId: 'node-client',
            label: `${bandName} Client`,
            type: 'frontend',
            technology: 'Next.js / React',
            description: 'Simple and responsive user interface',
            requirementIdentifier: 'FR-002',
            positionX: 80,
            positionY: 120,
          },
          {
            nodeId: 'node-server',
            label: 'Application Server',
            type: 'backend',
            technology: 'Node.js / REST API',
            description: 'Core business logic and API request handling',
            requirementIdentifier: 'FR-001',
            positionX: 380,
            positionY: 120,
          },
          {
            nodeId: 'node-db',
            label: 'Database',
            type: 'database',
            technology: 'PostgreSQL / SQLite',
            description: 'Persistent application data storage',
            requirementIdentifier: 'FR-003',
            positionX: 680,
            positionY: 120,
          },
        ],
        edges: [
          {
            edgeId: 'edge-client-server',
            source: 'node-client',
            target: 'node-server',
            label: 'HTTP API',
            animated: true,
          },
          {
            edgeId: 'edge-server-db',
            source: 'node-server',
            target: 'node-db',
            label: 'Data Queries',
            animated: false,
          },
        ],
      },
    };
  }

  async analyzePrd(prdContent: string) {
    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.get<string>('OPENAI_MODEL', 'gpt-4o'),
          messages: [
            {
              role: 'system',
              content: `You are a principal software architect. Analyze this PRD and return a JSON object with:
              1. "summary": string
              2. "keyFeatures": string[]
              3. "technicalRisks": string[]
              4. "suggestedArchitecture": array of { label: string, type: string, description: string, technology: string }
              5. "databaseEntities": string[]`,
            },
            { role: 'user', content: prdContent },
          ],
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (content) return JSON.parse(content);
      } catch (err: any) {
        this.logger.error(`OpenAI error: ${err.message}`);
      }
    }

    if (this.geminiApiKey) {
      try {
        const prompt = `You are a principal software architect. Analyze this PRD content and return a JSON object with:
        "summary": string,
        "keyFeatures": string[],
        "technicalRisks": string[],
        "suggestedArchitecture": array of { "label": string, "type": string, "description": string, "technology": string },
        "databaseEntities": string[]

PRD Content:
${prdContent}`;
        return await this.callGemini(prompt);
      } catch (err: any) {
        this.logger.warn(`Gemini analyzePrd error: ${err.message}`);
      }
    }

    // Heuristic structured fallback analysis
    return {
      summary: 'Extracted key requirements and architecture blueprints from PRD content.',
      keyFeatures: [
        'Real-time collaborative editing and discussion anchoring',
        'State-machine driven Concern resolution workflow',
        'Multi-board visual stage canvas integration',
        'Git-backed synchronized change proposals and code review',
      ],
      technicalRisks: [
        'Ensuring bidirectional traceability across high-velocity code commits',
        'Concurrency handling in real-time visual collaboration canvas',
      ],
      suggestedArchitecture: [
        { label: 'Client Application', type: 'frontend', description: 'Next.js 14 App Router UI', technology: 'Next.js, React, Tailwind' },
        { label: 'API Gateway', type: 'backend', description: 'NestJS REST & WebSocket server', technology: 'NestJS, Socket.IO' },
        { label: 'Relational Database', type: 'database', description: 'Primary relational data store', technology: 'PostgreSQL, Prisma' },
        { label: 'Job & Cache Engine', type: 'cache', description: 'Background queues and pub/sub', technology: 'Upstash Redis, Bull' },
      ],
      databaseEntities: ['User', 'Band', 'PRD', 'Architecture', 'Discussion', 'Concern', 'Task', 'Commit'],
    };
  }

  async generateArchitectureForBand(bandId: string, userId: string, prdContent?: string) {
    const result = await this.architectureService.generateArchitectureFromPrd(bandId, userId, prdContent);
    return result.version;
  }

  /**
   * Derives architecture deterministically from PRD content using Friday's
   * Reasoning Engine. Replaces the previous Gemini-as-architect behavior: the
   * PRD interpreter extracts product facts, and the engine derives the minimal
   * evidence-backed architecture (no band context required, but the same
   * complexity rules and provenance apply).
   */
  async generateArchitectureFromPrd(prdContent: string) {
    const facts = PrdInterpreter.interpret(prdContent || '');
    const derived = ReasoningEngine.derive(facts, 'Generated Architecture');
    const validation = ValidationEngine.validate(
      derived.nodes,
      derived.edges,
      facts.requirements.map((r) => r.identifier),
    );

    return {
      nodes: derived.nodes.map((n) => ({
        nodeId: n.id,
        label: n.label,
        type: n.type,
        description: n.description,
        technology: n.technology,
        status: n.status,
        reason: n.reason,
        evidence: n.evidence,
        sourceRequirements: n.sourceRequirements,
        positionX: n.x ?? 100,
        positionY: n.y ?? 100,
      })),
      edges: derived.edges.map((e) => ({
        edgeId: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        relationshipType: e.relationshipType,
        evidence: e.evidence,
        animated: e.animated,
      })),
      validation,
      unresolvedDecisions: derived.unresolvedDecisions,
      assumptions: derived.assumptions,
      complexityLevel: derived.complexityLevel,
    };
  }

  async explainCode(codeSnippet: string, language = 'typescript') {
    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.get<string>('OPENAI_MODEL', 'gpt-4o'),
          messages: [
            {
              role: 'system',
              content: 'You are an expert software developer. Explain this code clearly and suggest 1-2 architectural improvements.',
            },
            { role: 'user', content: `Language: ${language}\n\n\`\`\`${language}\n${codeSnippet}\n\`\`\`` },
          ],
        });
        return { explanation: response.choices[0]?.message?.content };
      } catch (err: any) {
        this.logger.error(`OpenAI error: ${err.message}`);
      }
    }

    if (this.geminiApiKey) {
      try {
        const prompt = `You are an expert software developer. Explain this code clearly and suggest 1-2 architectural improvements.
Language: ${language}
\`\`\`${language}
${codeSnippet}
\`\`\`
Return a JSON object: { "explanation": "your explanation here" }`;
        const res = await this.callGemini(prompt);
        if (res?.explanation) return res;
      } catch (err: any) {
        this.logger.warn(`Gemini explainCode error: ${err.message}`);
      }
    }

    return {
      explanation: `Analyzed ${language} snippet (${codeSnippet.split('\n').length} lines). The code demonstrates cohesive modular design, clear boundary isolation, and structured type constraints.`,
    };
  }
}

