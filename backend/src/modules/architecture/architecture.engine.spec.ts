import { describe, it, expect } from 'vitest';
import { PrdInterpreter, type ExtractedPRDFacts } from './engine/prd-interpreter';
import { ReasoningEngine } from './engine/reasoning-engine';
import { ValidationEngine } from './engine/validation-engine';
import { VersionDiff } from './engine/version-diff';
import { normalizeLlmFacts } from './engine/llm-prd-extractor';
import { mergeFacts } from './engine/facts-merger';

describe('Friday Architecture Intelligence Engine', () => {
  it('TEST CASE 1 — Simple Portfolio: derives minimal architecture, includes Email Provider, and rejects Redis/K8s/Kafka', () => {
    const prd = `
# Developer Portfolio
A personal portfolio website with Home, About, Projects, and Contact pages.
The contact form sends an email to the owner.
    `;

    const facts = PrdInterpreter.interpret(prd);
    expect(facts.capabilities.hasEmailDelivery).toBe(true);
    expect(facts.capabilities.hasAuthentication).toBe(false);
    expect(facts.capabilities.hasCachingRequirement).toBe(false);

    const arch = ReasoningEngine.derive(facts, 'Developer Portfolio');

    const nodeLabels = arch.nodes.map((n) => n.label);
    expect(nodeLabels.some((l) => /portfolio|website/i.test(l))).toBe(true);
    expect(nodeLabels.some((l) => /contact api/i.test(l))).toBe(true);
    expect(nodeLabels.some((l) => /email/i.test(l))).toBe(true);

    // Ensure NO unnecessary infrastructure is generated
    expect(nodeLabels.some((l) => /redis/i.test(l))).toBe(false);
    expect(nodeLabels.some((l) => /kafka/i.test(l))).toBe(false);
    expect(nodeLabels.some((l) => /kubernetes/i.test(l))).toBe(false);
    expect(nodeLabels.some((l) => /microservice/i.test(l))).toBe(false);
    expect(nodeLabels.some((l) => /cdn/i.test(l))).toBe(false);
    expect(nodeLabels.some((l) => /api gateway/i.test(l))).toBe(false);

    // Validate reasons and evidence
    const emailNode = arch.nodes.find((n) => /email/i.test(n.label));
    expect(emailNode?.reason).toBeDefined();
    expect(emailNode?.evidence).toBeDefined();

    // Check validation report
    const validation = ValidationEngine.validate(arch.nodes, arch.edges, ['FR-001']);
    expect(validation.overallHealth).toBe('EXCELLENT');
    expect(validation.warnings.filter((w) => w.severity === 'CRITICAL').length).toBe(0);
  });

  it('TEST CASE 2 & 7 — Authenticated Project App: leaves identity provider UNRESOLVED if unspecified', () => {
    const prd = `
# Project Planning Tool
Users can create accounts, log in with credentials, and manage team projects.
All project data is stored in relational records.
    `;

    const facts = PrdInterpreter.interpret(prd);
    expect(facts.capabilities.hasAuthentication).toBe(true);
    expect(facts.capabilities.authProviderSpecified).toBeUndefined();

    const arch = ReasoningEngine.derive(facts, 'Project Planning Tool');
    const authNode = arch.nodes.find((n) => n.type === 'auth');

    expect(authNode).toBeDefined();
    expect(authNode?.status).toBe('UNRESOLVED');
    expect(authNode?.reason).toContain('Authentication is required');
    expect(arch.unresolvedDecisions.some((d) => d.id === 'DEC-AUTH-PROVIDER')).toBe(true);

    // Does not hallucinate Clerk, Auth0, or Google OAuth
    expect(authNode?.technology).not.toBe('Clerk');
    expect(authNode?.technology).not.toBe('Auth0');
  });

  it('TEST CASE 4 — Realtime Collaboration: creates realtime layer with explicit reason', () => {
    const prd = `
# Realtime Whiteboard
Multiple users must see edits immediately on shared canvases with live cursor presence.
Users edit project plans together in real time.
    `;

    const facts = PrdInterpreter.interpret(prd);
    expect(facts.capabilities.hasRealtimeCollaboration).toBe(true);

    const arch = ReasoningEngine.derive(facts, 'Realtime Whiteboard');
    const realtimeNode = arch.nodes.find((n) => n.type === 'service' && /real-time/i.test(n.label));

    expect(realtimeNode).toBeDefined();
    expect(realtimeNode?.status).toBe('CONFIRMED');
    expect(realtimeNode?.reason).toContain('Multiple users must observe shared changes');
  });

  it('TEST CASE 5 — Payment Integration: creates payment boundary and webhook flow', () => {
    const prd = `
# Subscription SaaS
Users can purchase a monthly subscription via Stripe checkout.
Billing notifications are handled through webhook events.
    `;

    const facts = PrdInterpreter.interpret(prd);
    expect(facts.capabilities.hasPayments).toBe(true);
    expect(facts.capabilities.paymentProviderSpecified).toBe('Stripe');

    const arch = ReasoningEngine.derive(facts, 'Subscription SaaS');
    const paymentNode = arch.nodes.find((n) => /stripe/i.test(n.label));

    expect(paymentNode).toBeDefined();
    expect(paymentNode?.status).toBe('CONFIRMED');
    expect(arch.edges.some((e) => e.target === 'node-backend' && e.relationshipType === 'SENDS_TO')).toBe(true);
  });

  it('TEST CASE 8 — Rejects Unsolicited Gemini Redis Suggestion when no bottleneck exists', () => {
    const prd = 'Simple CRUD tool for reading and updating personal notes.';
    const facts = PrdInterpreter.interpret(prd);

    const evaluation = ReasoningEngine.evaluateAiSuggestion(
      { label: 'Redis Cache Layer', technology: 'Redis' },
      facts,
    );

    expect(evaluation.accepted).toBe(false);
    expect(evaluation.status).toBe('AI_SUGGESTED');
    expect(evaluation.explanation).toContain('Not required for MVP');
  });

  it('TEST CASE 12 — Version comparison diffing: identifies NEW, MODIFIED, REMOVED, and AFFECTED', () => {
    const v1Nodes: any[] = [
      { id: 'client', label: 'Client', technology: 'Next.js', type: 'frontend', description: 'UI' },
      { id: 'backend', label: 'Backend', technology: 'Node.js', type: 'backend', description: 'API', dependsOn: ['db'] },
      { id: 'db', label: 'Database', technology: 'PostgreSQL', type: 'database', description: 'DB' },
    ];

    const v2Nodes: any[] = [
      { id: 'client', label: 'Client', technology: 'Next.js 16', type: 'frontend', description: 'UI' }, // MODIFIED
      { id: 'backend', label: 'Backend', technology: 'Node.js', type: 'backend', description: 'API', dependsOn: ['payment'] }, // AFFECTED
      { id: 'payment', label: 'Payment Gateway', technology: 'Stripe', type: 'service', description: 'Stripe' }, // NEW
      // db removed
    ];

    const diff = VersionDiff.compare(1, v1Nodes, 2, v2Nodes);

    expect(diff.newNodes.map((n) => n.id)).toEqual(['payment']);
    expect(diff.removedNodes.map((n) => n.id)).toEqual(['db']);
    expect(diff.modifiedNodes.map((m) => m.current.id)).toEqual(['client']);
    expect(diff.affectedNodes.map((a) => a.node.id)).toContain('backend');
  });

  it('TEST CASE 3 — CRUD application: derives frontend + backend + database, no unnecessary infra', () => {
    const prd = `
# Notes App
Users can create, read, update and delete personal notes. All notes are stored persistently.
    `;

    const facts = PrdInterpreter.interpret(prd);
    const arch = ReasoningEngine.derive(facts, 'Notes App');

    const types = arch.nodes.map((n) => n.type);
    expect(types).toContain('frontend');
    expect(types).toContain('backend');
    expect(types).toContain('database');

    // No over-engineered infrastructure for a simple CRUD app
    expect(arch.nodes.some((n) => /redis|kafka|kubernetes|microservice|cdn/i.test(n.label + (n.technology || '')))).toBe(false);

    // Every node must carry a reason (Rule 1)
    for (const node of arch.nodes) {
      expect(node.reason).toBeTruthy();
    }
  });

  it('TEST CASE 9 — Deterministic / idempotent derivation: same PRD yields identical node & edge IDs', () => {
    const prd = '# Site\nHome, About, and Contact pages. The contact form sends an email to the owner.';

    const arch1 = ReasoningEngine.derive(PrdInterpreter.interpret(prd), 'Site');
    const arch2 = ReasoningEngine.derive(PrdInterpreter.interpret(prd), 'Site');

    expect(arch1.nodes.map((n) => n.id).sort()).toEqual(arch2.nodes.map((n) => n.id).sort());
    expect(arch1.edges.map((e) => e.id).sort()).toEqual(arch2.edges.map((e) => e.id).sort());
    expect(arch1.complexityLevel).toBe(arch2.complexityLevel);
  });

  it('TEST CASE 10 — PRD modification: adding a payment requirement introduces a NEW payment component', () => {
    const base = '# Tool\nA simple dashboard where users log in to manage data.';
    const modified =
      '# Tool\nA simple dashboard where users log in to manage data. Users can pay for the premium plan via Stripe checkout.';

    const baseArch = ReasoningEngine.derive(PrdInterpreter.interpret(base), 'Tool');
    const modArch = ReasoningEngine.derive(PrdInterpreter.interpret(modified), 'Tool');

    const baseIds = new Set(baseArch.nodes.map((n) => n.id));
    const modIds = new Set(modArch.nodes.map((n) => n.id));

    expect(modIds.has('node-payment-provider')).toBe(true);
    expect(baseIds.has('node-payment-provider')).toBe(false);

    const diff = VersionDiff.compare(1, baseArch.nodes, 2, modArch.nodes);
    expect(diff.newNodes.some((n) => n.id === 'node-payment-provider')).toBe(true);
  });

  it('TEST CASE 11 — Existing requirements are honored; requirement removal reduces the requirement set', () => {
    const prd = '# App\nThe contact form sends an email to the owner.';

    const full = PrdInterpreter.interpret(prd, [
      { identifier: 'FR-001', title: 'Contact form', description: 'Contact submissions must be emailed to the owner' },
      { identifier: 'FR-002', title: 'Notifications', description: 'Email notifications for account updates' },
    ]);
    const reduced = PrdInterpreter.interpret(prd, [
      { identifier: 'FR-001', title: 'Contact form', description: 'Contact submissions must be emailed to the owner' },
    ]);

    expect(full.requirements.map((r) => r.identifier)).toEqual(['FR-001', 'FR-002']);
    expect(reduced.requirements.map((r) => r.identifier)).toEqual(['FR-001']);

    // Both must still derive a valid, non-empty, fully-reasoned architecture
    for (const facts of [full, reduced]) {
      const arch = ReasoningEngine.derive(facts, 'App');
      expect(arch.nodes.length).toBeGreaterThan(0);
      for (const node of arch.nodes) expect(node.reason).toBeTruthy();
    }
  });

  it('HOListic derivation: every PRD page, feature, and entity becomes a provenance-carrying node; flow edges carry API contracts', () => {
    const facts: ExtractedPRDFacts = {
      actors: ['User'],
      pages: [
        { id: 'PAGE-LOGIN', name: 'Login', description: 'Authentication gateway' },
        { id: 'PAGE-DASHBOARD', name: 'Dashboard', description: 'Project overview' },
        { id: 'PAGE-PROJECT', name: 'Project Detail', description: 'Plan editing workspace' },
      ],
      features: [
        {
          id: 'FEAT-001',
          name: 'User Authentication',
          description: 'Login and session management',
          pageNames: ['Login'],
          requirementIds: ['FR-001'],
        },
        {
          id: 'FEAT-002',
          name: 'Project Management',
          description: 'Create and manage project plans',
          pageNames: ['Dashboard', 'Project Detail'],
          requirementIds: ['FR-002', 'FR-003'],
        },
      ],
      requirements: [
        { identifier: 'FR-001', title: 'User authentication', description: 'Users must log in to access private projects' },
        { identifier: 'FR-002', title: 'Project creation', description: 'Users can create projects' },
        { identifier: 'FR-003', title: 'Plan editing', description: 'Users can edit project plans' },
      ],
      flows: [
        {
          id: 'FLOW-LOGIN',
          name: 'User Sign In',
          featureId: 'FEAT-001',
          steps: [
            {
              actor: 'User',
              pageOrInterface: 'Login Page',
              action: 'Submits credentials',
              apiOrValidation: 'POST /api/auth/login',
              persistence: 'Query user records',
            },
          ],
        },
        {
          id: 'FLOW-CREATE-PROJECT',
          name: 'Create Project',
          featureId: 'FEAT-002',
          steps: [
            {
              actor: 'User',
              pageOrInterface: 'Dashboard',
              action: 'Creates a project',
              apiOrValidation: 'POST /api/projects',
              businessLogic: 'Validate name',
              persistence: 'Insert project record',
            },
          ],
        },
      ],
      dataEntities: [
        { name: 'User', attributes: ['id', 'email'], persisted: true, featureIds: ['FEAT-001'] },
        { name: 'Project', attributes: ['id', 'title'], persisted: true, featureIds: ['FEAT-002'] },
      ],
      externalSystems: [],
      capabilities: {
        hasAuthentication: true,
        hasDatabasePersistence: true,
        hasFileStorage: false,
        hasEmailDelivery: false,
        hasPayments: false,
        hasRealtimeCollaboration: false,
        hasAsyncBackgroundProcessing: false,
        hasCachingRequirement: false,
      },
      explicitTechnologies: ['PostgreSQL'],
      assumptions: [],
      decisions: [],
    };

    const arch = ReasoningEngine.derive(facts, 'Project Planner');
    const labels = arch.nodes.map((n) => n.label);
    const ids = arch.nodes.map((n) => n.id);

    // Comprehensiveness: every page, feature, and entity exists as a node
    for (const p of facts.pages) expect(labels).toContain(p.name);
    for (const f of facts.features) expect(labels).toContain(f.name);
    for (const e of facts.dataEntities) expect(labels).toContain(e.name);
    expect(ids).toContain('node-database');

    // Core topology present
    expect(arch.nodes.some((n) => n.type === 'frontend')).toBe(true);
    expect(arch.nodes.some((n) => n.type === 'backend')).toBe(true);
    expect(arch.nodes.some((n) => n.type === 'auth')).toBe(true);

    // No unjustified infrastructure
    expect(
      arch.nodes.some((n) => /redis|kafka|kubernetes|microservice/i.test(n.label + (n.technology || ''))),
    ).toBe(false);

    // Provenance: every node carries reason + evidence; every edge carries type + evidence
    for (const n of arch.nodes) {
      expect(n.reason).toBeTruthy();
      expect(n.evidence).toBeTruthy();
    }
    for (const e of arch.edges) {
      expect(e.relationshipType).toBeTruthy();
      expect(e.evidence).toBeTruthy();
    }

    // No orphan nodes
    const connected = new Set<string>();
    arch.edges.forEach((e) => {
      connected.add(e.source);
      connected.add(e.target);
    });
    for (const n of arch.nodes) expect(connected.has(n.id)).toBe(true);

    // LLM-mapped requirements are honored: auth module cites FR-001
    const authModule = arch.nodes.find((n) => n.id === 'node-module-user-authentication')!;
    expect(authModule.sourceRequirements).toContain('FR-001');

    // Flow edge: Login page → auth module carries the API contract
    const loginEdge = arch.edges.find(
      (e) => e.source === 'node-page-login' && e.target === 'node-module-user-authentication',
    );
    expect(loginEdge).toBeDefined();
    expect(loginEdge?.label).toContain('POST /api/auth/login');

    // Module → database read/write edge for owned entities
    expect(
      arch.edges.some(
        (e) => e.source === 'node-module-user-authentication' && e.target === 'node-database' && e.relationshipType === 'STORES_IN',
      ),
    ).toBe(true);

    // Validation: fully comprehensive, no unmapped facts, not flagged for review
    const validation = ValidationEngine.validate(
      arch.nodes,
      arch.edges,
      facts.requirements.map((r) => r.identifier),
      facts,
    );
    expect(validation.warnings.filter((w) => w.code === 'UNMAPPED_FEATURE')).toHaveLength(0);
    expect(validation.warnings.filter((w) => w.code === 'UNMAPPED_PAGE')).toHaveLength(0);
    expect(validation.warnings.filter((w) => w.code === 'UNMAPPED_ENTITY')).toHaveLength(0);
    expect(validation.overallHealth).not.toBe('NEEDS_REVIEW');
  });

  it('LLM extraction: normalizes raw LLM JSON into the fact model (IDs sanitized, defaults applied, junk rejected)', () => {
    const raw = {
      actors: ['Customer'],
      pages: [
        { name: 'Pricing', description: 'Plan comparison' },
        { id: '   ', name: 'Checkout', description: 'Payment' },
      ],
      features: [
        { name: 'Subscriptions', description: 'Manage plans', pageNames: ['Pricing'], requirementIds: ['fr-002', ''] },
      ],
      requirements: [{ title: 'Payment capture', description: 'Collect payment', identifier: 'fr-001' }],
      flows: [
        {
          name: 'Checkout Flow',
          steps: [{ actor: 'Customer', pageOrInterface: 'Checkout Page', action: 'Pays', apiOrValidation: 'POST /api/checkout' }],
        },
      ],
      dataEntities: [{ name: 'Subscription', attributes: ['plan'], persisted: true, featureIds: ['FEAT-001'] }],
      externalSystems: [{ name: 'Stripe', role: 'Payments', explicit: true, specifiedProvider: 'Stripe' }],
      capabilities: { hasPayments: true, paymentProviderSpecified: 'Stripe' },
      explicitTechnologies: ['Stripe', '   '],
      assumptions: ['MVP single region'],
      decisions: [{ decision: 'Use Stripe', rationale: 'Fast integration' }],
    };

    const facts = normalizeLlmFacts(raw);
    expect(facts).not.toBeNull();
    expect(facts!.pages[0].id).toBe('PAGE-PRICING');
    expect(facts!.pages[1].id).toBe('PAGE-CHECKOUT'); // blank id falls back to slug
    expect(facts!.features[0].id).toBe('FEAT-001');
    expect(facts!.features[0].requirementIds).toEqual(['FR-002']); // uppercased, blanks dropped
    expect(facts!.requirements[0].identifier).toBe('FR-001');
    expect(facts!.dataEntities[0].featureIds).toEqual(['FEAT-001']);
    expect(facts!.capabilities.hasPayments).toBe(true);
    expect(facts!.capabilities.paymentProviderSpecified).toBe('Stripe');
    expect(facts!.explicitTechnologies).toEqual(['Stripe']);
    expect(facts!.decisions[0].identifier).toBe('DEC-LLM');

    // Malformed or empty payloads are rejected (deterministic fallback takes over)
    expect(normalizeLlmFacts({})).toBeNull();
    expect(normalizeLlmFacts({ pages: [] })).toBeNull();
    expect(normalizeLlmFacts('nonsense')).toBeNull();
  });

  it('Fact merging: LLM enriches the deterministic baseline; DB requirements stay canonical; capabilities OR', () => {
    const base = PrdInterpreter.interpret('# Site\nHome and Contact pages. Contact form sends email.', [
      { identifier: 'FR-001', title: 'Contact form', description: 'Contact submissions must be delivered by email' },
    ]);
    const llm = normalizeLlmFacts({
      pages: [
        { name: 'Home', description: 'Landing' },
        { name: 'About', description: 'Company story' }, // LLM-only page
      ],
      features: [
        { name: 'Contact Inquiry Form', description: 'Richer description from LLM', requirementIds: ['FR-001'] },
      ],
      requirements: [{ identifier: 'FR-999', title: 'Should be ignored', description: 'DB requirements win' }],
      dataEntities: [{ name: 'Inquiry', attributes: ['message'], persisted: true }],
      capabilities: { hasDatabasePersistence: true },
      explicitTechnologies: ['PostgreSQL'],
    })!;

    const merged = mergeFacts(base, llm, [
      { identifier: 'FR-001', title: 'Contact form', description: 'Contact submissions must be delivered by email' },
    ]);

    // Union of pages (LLM-only "About" is kept)
    expect(merged.pages.map((p) => p.name)).toEqual(expect.arrayContaining(['Home', 'Contact', 'About']));
    // Canonical DB requirements win (LLM-invented FR-999 dropped)
    expect(merged.requirements.map((r) => r.identifier)).toEqual(['FR-001']);
    // LLM enriches the shared feature (mapping + description)
    const contact = merged.features.find((f) => f.name === 'Contact Inquiry Form')!;
    expect(contact.requirementIds).toEqual(['FR-001']);
    expect(contact.description).toBe('Richer description from LLM');
    // Capabilities OR across both interpreters
    expect(merged.capabilities.hasEmailDelivery).toBe(true);
    expect(merged.capabilities.hasDatabasePersistence).toBe(true);
    // Explicit technologies union
    expect(merged.explicitTechnologies).toContain('PostgreSQL');
  });
});
