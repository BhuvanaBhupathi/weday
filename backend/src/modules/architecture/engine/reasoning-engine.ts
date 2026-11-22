import type { ExtractedPRDFacts } from './prd-interpreter';
import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ArchitectureComponentStatus,
} from '@friday/types';

export interface DerivedArchitecture {
  nodes: ArchitectureNodeData[];
  edges: ArchitectureEdgeData[];
  unresolvedDecisions: Array<{ id: string; title: string; reason: string }>;
  assumptions: string[];
  complexityLevel: 1 | 2 | 3 | 4;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'must', 'shall', 'should', 'when',
  'into', 'over', 'under', 'between', 'provide', 'provides', 'allows', 'allow', 'enables',
  'enable', 'users', 'user', 'data', 'system', 'systems', 'application', 'applications',
  'features', 'feature', 'requirement', 'requirements', 'product', 'page', 'pages',
  'content', 'supports', 'support', 'includes', 'include', 'based', 'using', 'used',
  'every', 'each', 'all', 'any', 'can', 'will', 'have', 'has', 'are', 'was', 'were',
]);

const tokenize = (s: string) =>
  (s.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !STOPWORDS.has(w));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40) || 'item';

const normPage = (s: string) => s.toLowerCase().replace(/\b(page|screen|view)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Does a flow step's page/interface reference name the given PRD page? */
function stepNamesPage(stepPage: string | undefined, pageName: string): boolean {
  if (!stepPage) return false;
  const a = normPage(stepPage);
  const b = normPage(pageName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function similarName(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nb = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export class ReasoningEngine {
  /**
   * Holistic derivation: every page, feature, data entity, flow, and
   * evidence-backed infrastructure boundary from the fact model becomes a
   * first-class, provenance-carrying node — while the complexity hierarchy
   * still forbids unjustified infrastructure.
   *
   * Levels:
   *   1: Frontend + Backend + Database (+ pages / modules / entities)
   *   2: + Auth, Storage, Email, Payments, Search, Realtime (only when required)
   *   3: + Cache, Workers (only with concrete access patterns)
   *   4: Microservices / Kubernetes (rejected for MVP unless explicitly proved)
   */
  static derive(facts: ExtractedPRDFacts, projectName: string): DerivedArchitecture {
    const nodes: ArchitectureNodeData[] = [];
    const edges: ArchitectureEdgeData[] = [];
    const unresolvedDecisions: Array<{ id: string; title: string; reason: string }> = [];
    const assumptions = [...facts.assumptions];

    let complexityLevel: 1 | 2 | 3 | 4 = 1;
    let infraIndex = 0;
    const infraPos = () => ({ x: 1140, y: 120 + infraIndex++ * 240 });

    const isSimplePortfolio =
      facts.pages.some((p) => /portfolio|projects|about/i.test(p.name)) &&
      !facts.capabilities.hasAuthentication &&
      !facts.capabilities.hasPayments &&
      !facts.capabilities.hasRealtimeCollaboration;

    // ── Requirement mapping (honest provenance, no blanket claims) ──────────
    const reqIdsFor = (text: string, explicitIds?: string[]): string[] => {
      if (explicitIds && explicitIds.length > 0) {
        const known = new Set(facts.requirements.map((r) => r.identifier));
        const valid = explicitIds.filter((id) => known.has(id));
        if (valid.length > 0) return Array.from(new Set(valid));
      }
      const tokens = tokenize(text);
      return facts.requirements
        .filter((r) => {
          const rt = `${r.title} ${r.description}`.toLowerCase();
          return tokens.some((t) => rt.includes(t));
        })
        .map((r) => r.identifier);
    };
    const unionIds = (...groups: string[][]): string[] => Array.from(new Set(groups.flat()));

    const pageNodeOf = (name: string) => `node-page-${slugify(name)}`;
    const moduleNodeOf = (name: string) => `node-module-${slugify(name)}`;

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 1: CLIENT / FRONTEND APPLICATION
    // ──────────────────────────────────────────────────────────────────────────
    const clientNodeId = 'node-frontend';
    const clientPages = facts.pages.map((p) => p.name);
    const clientReqIds = reqIdsFor(`client user interface screens navigation ${clientPages.join(' ')}`);
    nodes.push({
      id: clientNodeId,
      label: isSimplePortfolio ? `${projectName} Website` : `${projectName} Client App`,
      type: 'frontend',
      technology: 'Next.js 16 + React 19',
      description: `User-facing interface presenting ${clientPages.join(', ')}`,
      purpose: 'Deliver responsive interaction, client routing, and view state',
      status: 'CONFIRMED',
      source: 'PRD',
      sourcePages: clientPages,
      sourceFeatures: facts.features.map((f) => f.name),
      sourceRequirements: clientReqIds,
      reason: 'Direct client access point required by primary product flows',
      evidence: `${facts.pages.length} pages and ${facts.features.length} features identified in the product specification`,
      confidence: 'HIGH',
      x: 480,
      y: 60,
    });

    // ── PAGES: one node per PRD page (holistic mapping) ──────────────────────
    facts.pages.forEach((p, i) => {
      const id = pageNodeOf(p.name);
      const featuresHere = facts.features.filter((f) =>
        (f.pageNames || []).some((n) => similarName(n, p.name)),
      );
      const flowsHere = facts.flows.filter((fl) => fl.steps.some((s) => stepNamesPage(s.pageOrInterface, p.name)));
      nodes.push({
        id,
        label: p.name,
        type: 'page',
        technology: 'Client page / route',
        description: p.description || `Page: ${p.name}`,
        purpose: p.description || `User-facing screen for ${p.name}`,
        status: 'CONFIRMED',
        source: 'PRD',
        sourcePages: [p.name],
        sourceFeatures: featuresHere.map((f) => f.name),
        sourceFlows: flowsHere.map((f) => f.name),
        sourceRequirements: unionIds(
          ...featuresHere.map((f) => reqIdsFor(`${f.name} ${f.description}`, f.requirementIds)),
        ),
        reason: `Page "${p.name}" is defined in the product specification`,
        evidence: `PRD page: ${p.description || p.name}`,
        confidence: 'HIGH',
        x: 120 + i * 300,
        y: 300,
      });
      edges.push({
        id: `edge-frontend-page-${slugify(p.name)}`,
        source: clientNodeId,
        target: id,
        label: 'Renders',
        relationshipType: 'CONTAINS',
        evidence: `Frontend application renders the ${p.name} page`,
      });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 1: BACKEND APPLICATION
    // ──────────────────────────────────────────────────────────────────────────
    const backendNodeId = 'node-backend';
    const flowApis = facts.flows.flatMap((f) => f.steps.map((s) => s.apiOrValidation).filter(Boolean) as string[]);
    const backendApis = flowApis.length > 0 ? Array.from(new Set(flowApis)) : ['GET /api/health', 'POST /api/action'];

    nodes.push({
      id: backendNodeId,
      label: isSimplePortfolio ? 'Contact API Route' : 'Application Backend Service',
      type: 'backend',
      technology: isSimplePortfolio ? 'Next.js Server Actions / API' : 'NestJS Modular Backend',
      description: isSimplePortfolio
        ? 'Validates inquiry submissions and routes to email delivery'
        : `REST & domain service modules: ${facts.features.map((f) => f.name).join(', ') || 'core business workflows'}`,
      purpose: 'Execute server-side validation, business rules, and integration boundaries',
      status: 'CONFIRMED',
      source: 'ENGINE_INFERRED',
      apis: backendApis,
      sourceFeatures: facts.features.map((f) => f.name),
      sourceRequirements: reqIdsFor(`application backend api services endpoints ${facts.features.map((f) => f.name).join(' ')}`),
      dependsOn: [],
      usedBy: [clientNodeId],
      reason: 'Server boundary required to enforce security and validate input before side effects',
      evidence: `Handles ${backendApis.length} API contracts derived from ${facts.flows.length} product flows`,
      confidence: 'HIGH',
      x: 480,
      y: 540,
    });

    edges.push({
      id: 'edge-client-backend',
      source: clientNodeId,
      target: backendNodeId,
      label: 'HTTP Requests / Mutations',
      relationshipType: 'CALLS',
      evidence: 'Client invokes server endpoints for data mutations and workflow steps',
      animated: true,
    });

    // ── FEATURE MODULES: one node per PRD feature (holistic mapping) ─────────
    const moduleReqIds: Record<string, string[]> = {};
    facts.features.forEach((f, i) => {
      const id = moduleNodeOf(f.name);
      const ownedEntities = facts.dataEntities.filter(
        (e) => (e.featureIds || []).includes(f.id) || similarName(e.name, f.name),
      );
      const flowsHere = facts.flows.filter((fl) => fl.featureId === f.id);
      const reqIds = unionIds(
        reqIdsFor(`${f.name} ${f.description}`, f.requirementIds),
        ...ownedEntities.map((e) => reqIdsFor(e.name)),
      );
      moduleReqIds[id] = reqIds;

      nodes.push({
        id,
        label: f.name,
        type: 'module',
        technology: 'Domain service module (modular monolith)',
        description: f.description || `Feature module: ${f.name}`,
        purpose: `Implements the ${f.name} capability`,
        status: 'CONFIRMED',
        source: flowsHere.length > 0 ? 'FLOW' : 'REQUIREMENT',
        sourceFeatures: [f.name],
        sourcePages: f.pageNames || [],
        sourceFlows: flowsHere.map((x) => x.name),
        sourceEntities: ownedEntities.map((e) => e.name),
        sourceRequirements: reqIds,
        apis: Array.from(
          new Set(flowsHere.flatMap((fl) => fl.steps.map((s) => s.apiOrValidation).filter(Boolean) as string[])),
        ),
        data: ownedEntities.map((e) => e.name),
        reason: `Required to implement "${f.name}": ${f.description || 'defined in the product specification'}`,
        evidence:
          flowsHere.length > 0
            ? `Product flow: ${flowsHere.map((x) => x.name).join('; ')}`
            : `Feature "${f.name}" is defined in the product specification`,
        confidence: 'HIGH',
        x: 120 + i * 300,
        y: 780,
      });

      edges.push({
        id: `edge-backend-module-${slugify(f.name)}`,
        source: backendNodeId,
        target: id,
        label: 'Exposes',
        relationshipType: 'CONTAINS',
        evidence: `Backend hosts the ${f.name} domain module`,
      });
    });

    // Backend requirement coverage = union of what its modules + core actually serve
    nodes.find((n) => n.id === backendNodeId)!.sourceRequirements = unionIds(
      reqIdsFor(`application backend api services endpoints ${facts.features.map((f) => f.name).join(' ')}`),
      ...Object.values(moduleReqIds),
    );

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 1: PERSISTENCE (DATABASE) + DATA ENTITIES
    // ──────────────────────────────────────────────────────────────────────────
    let dbNodeId: string | null = null;
    if (facts.capabilities.hasDatabasePersistence && !isSimplePortfolio) {
      dbNodeId = 'node-database';
      const persistedEntities = facts.dataEntities.filter((e) => e.persisted);
      const entityNames = persistedEntities.map((d) => d.name);
      const explicitDb = facts.explicitTechnologies.find((t) => /postgres|sqlite|mysql|mongo/i.test(t));

      nodes.push({
        id: dbNodeId,
        label: 'Relational Database',
        type: 'database',
        technology: explicitDb ? `${explicitDb} + Prisma ORM` : 'PostgreSQL + Prisma ORM',
        description: `Persistent store for entities: ${entityNames.join(', ') || 'application records'}`,
        purpose: 'Atomic transactional state and relational record persistence',
        status: 'CONFIRMED',
        source: 'REQUIREMENT',
        data: entityNames,
        sourceEntities: entityNames,
        sourceRequirements: reqIdsFor(`database persistence storage ${entityNames.join(' ')}`),
        dependsOn: [],
        usedBy: [backendNodeId],
        reason: 'Application domain necessitates durable multi-session persistence',
        evidence: `${entityNames.length} domain data models require relational schemas`,
        confidence: 'HIGH',
        x: 480,
        y: 1020,
      });

      edges.push({
        id: 'edge-backend-db',
        source: backendNodeId,
        target: dbNodeId,
        label: 'SQL / Prisma ORM',
        relationshipType: 'STORES_IN',
        evidence: 'Backend persists and queries normalized domain models',
        animated: false,
      });

      // ── DATA ENTITIES: one node per persisted entity ──────────────────────
      persistedEntities.forEach((e, i) => {
        const id = `node-entity-${slugify(e.name)}`;
        const ownerFeatures = facts.features.filter((f) => (e.featureIds || []).includes(f.id));
        nodes.push({
          id,
          label: e.name,
          type: 'entity',
          technology: 'Persistent table / collection',
          description: `Attributes: ${e.attributes.join(', ') || 'as defined in PRD'}`,
          purpose: `Stores ${e.name} records`,
          status: 'CONFIRMED',
          source: 'REQUIREMENT',
          sourceEntities: [e.name],
          sourceFeatures: ownerFeatures.map((o) => o.name),
          sourceRequirements: unionIds(
            reqIdsFor(e.name, (e as any).requirementIds),
            ...ownerFeatures.map((f) => reqIdsFor(`${f.name} ${f.description}`, f.requirementIds)),
          ),
          data: e.attributes,
          reason: `${e.name} data must persist across sessions per the product specification`,
          evidence: `PRD data model: ${e.name}${e.attributes.length ? ` (${e.attributes.join(', ')})` : ''}`,
          confidence: 'HIGH',
          x: 120 + i * 300,
          y: 1260,
        });
        edges.push({
          id: `edge-db-entity-${slugify(e.name)}`,
          source: dbNodeId!,
          target: id,
          label: 'Stores',
          relationshipType: 'CONTAINS',
          evidence: `Database stores ${e.name} records`,
        });
      });

      // Modules that own persisted data get an explicit read/write edge
      facts.features.forEach((f) => {
        const moduleId = moduleNodeOf(f.name);
        const owned = facts.dataEntities.filter(
          (e) => e.persisted && ((e.featureIds || []).includes(f.id) || similarName(e.name, f.name)),
        );
        if (owned.length > 0) {
          edges.push({
            id: `edge-module-db-${slugify(f.name)}`,
            source: moduleId,
            target: dbNodeId!,
            label: `Reads/writes ${owned.map((e) => e.name).join(', ')}`,
            relationshipType: 'STORES_IN',
            evidence: `Module "${f.name}" persists ${owned.map((e) => e.name).join(', ')}`,
          });
        }
      });
    }

    // ── USER FLOW EDGES: page → module (→ backend) carrying the API contract ─
    facts.flows.forEach((fl) => {
      const feature = facts.features.find((f) => f.id === fl.featureId);
      const targetId = feature ? moduleNodeOf(feature.name) : backendNodeId;
      const firstPageStep = fl.steps.find((s) => s.pageOrInterface);
      const page = firstPageStep ? facts.pages.find((p) => stepNamesPage(firstPageStep.pageOrInterface, p.name)) : undefined;
      const sourceId = page ? pageNodeOf(page.name) : clientNodeId;
      if (sourceId === targetId) return;

      const api =
        firstPageStep?.apiOrValidation ||
        fl.steps.find((s) => s.apiOrValidation)?.apiOrValidation ||
        '';
      edges.push({
        id: `edge-flow-${slugify(fl.id || fl.name)}`,
        source: sourceId,
        target: targetId,
        label: api || firstPageStep?.action || fl.name,
        relationshipType: 'CALLS',
        evidence: `Flow "${fl.name}": ${firstPageStep?.actor || 'actor'} → ${firstPageStep?.action || 'action'}${api ? ` via ${api}` : ''}`,
        animated: true,
      });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 2: EMAIL PROVIDER
    // ──────────────────────────────────────────────────────────────────────────
    if (facts.capabilities.hasEmailDelivery) {
      complexityLevel = Math.max(complexityLevel, 2) as 1 | 2 | 3 | 4;
      const emailNodeId = 'node-email-service';
      const extEmail = facts.externalSystems.find((e) => e.name.toLowerCase().includes('email') || e.specifiedProvider);
      const isResolved = !!extEmail?.specifiedProvider;
      const pos = infraPos();

      nodes.push({
        id: emailNodeId,
        label: extEmail?.specifiedProvider || 'Email Delivery Provider',
        type: 'service',
        technology: extEmail?.specifiedProvider ? `${extEmail.specifiedProvider} API` : 'SMTP / Mail API (Unresolved)',
        description: 'Transactional mail transport to deliver outbound messages',
        purpose: 'External transactional message routing',
        status: isResolved ? 'CONFIRMED' : 'UNRESOLVED',
        source: 'REQUIREMENT',
        sourceFlows: facts.flows.filter((fl) => fl.steps.some((s) => /email|mail|deliver/i.test(s.externalBoundary || ''))).map((fl) => fl.name),
        sourceRequirements: facts.requirements
          .filter((r) => /contact|email|message|notif/i.test(r.title + r.description))
          .map((r) => r.identifier),
        reason: 'Outbound email delivery is required by the product specification',
        evidence: 'Product flows include an external email delivery boundary',
        confidence: isResolved ? 'HIGH' : 'MEDIUM',
        ...pos,
      });

      edges.push({
        id: 'edge-backend-email',
        source: backendNodeId,
        target: emailNodeId,
        label: 'REST API Delivery',
        relationshipType: 'SENDS_TO',
        evidence: 'Backend routes validated message payloads to the external mail gateway',
        animated: true,
      });

      if (!isResolved) {
        unresolvedDecisions.push({
          id: 'DEC-EMAIL-PROVIDER',
          title: 'Select Email Transport Provider',
          reason: 'Email delivery boundary is required, but the PRD does not specify a provider (e.g. Resend, SendGrid, Postmark).',
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 2: AUTHENTICATION PROVIDER
    // ──────────────────────────────────────────────────────────────────────────
    if (facts.capabilities.hasAuthentication) {
      complexityLevel = Math.max(complexityLevel, 2) as 1 | 2 | 3 | 4;
      const authNodeId = 'node-auth-provider';
      const isResolved = !!facts.capabilities.authProviderSpecified;
      const pos = infraPos();

      const authReqIds = unionIds(
        facts.requirements.filter((r) => /auth|account|login|security|credential|session/i.test(r.title + r.description)).map((r) => r.identifier),
        reqIdsFor('user authentication account login security identity session'),
      );

      nodes.push({
        id: authNodeId,
        label: facts.capabilities.authProviderSpecified || 'Authentication Provider',
        type: 'auth',
        technology: facts.capabilities.authProviderSpecified
          ? `${facts.capabilities.authProviderSpecified} SDK`
          : 'OAuth / JWT Provider (Unspecified)',
        description: isResolved
          ? `Federated identity and session issuance via ${facts.capabilities.authProviderSpecified}`
          : 'Identity verification boundary required for private workspace access',
        purpose: 'User authentication, token verification, and security credentials',
        status: isResolved ? 'CONFIRMED' : 'UNRESOLVED',
        source: 'REQUIREMENT',
        sourceRequirements: authReqIds,
        sourceFeatures: facts.features.filter((f) => /auth|account|login|signin|sign in/i.test(f.name + f.description)).map((f) => f.name),
        reason: isResolved
          ? `Authentication is required by requirements; identity is handled by ${facts.capabilities.authProviderSpecified}`
          : 'Authentication is required by requirements, but no identity provider is finalized unless explicitly specified',
        evidence: 'Product flows include an authentication handshake and session verification step',
        confidence: isResolved ? 'HIGH' : 'MEDIUM',
        ...pos,
      });

      edges.push({
        id: 'edge-client-auth',
        source: clientNodeId,
        target: authNodeId,
        label: 'Credentials / Token',
        relationshipType: 'AUTHENTICATES_WITH',
        evidence: 'Client initiates authentication handshake',
        animated: true,
      });

      edges.push({
        id: 'edge-backend-auth',
        source: backendNodeId,
        target: authNodeId,
        label: 'Verify JWT / Claims',
        relationshipType: 'USES',
        evidence: 'Backend validates token signature with auth provider',
        animated: false,
      });

      if (!isResolved) {
        unresolvedDecisions.push({
          id: 'DEC-AUTH-PROVIDER',
          title: 'Select Identity / Authentication Provider',
          reason: 'Authentication is required by user account requirements, but identity provider was not specified in the PRD.',
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 2: PAYMENT PROVIDER
    // ──────────────────────────────────────────────────────────────────────────
    if (facts.capabilities.hasPayments) {
      complexityLevel = Math.max(complexityLevel, 2) as 1 | 2 | 3 | 4;
      const paymentNodeId = 'node-payment-provider';
      const isResolved = !!facts.capabilities.paymentProviderSpecified;
      const pos = infraPos();

      nodes.push({
        id: paymentNodeId,
        label: facts.capabilities.paymentProviderSpecified || 'Payment Provider',
        type: 'service',
        technology: facts.capabilities.paymentProviderSpecified
          ? `${facts.capabilities.paymentProviderSpecified} API + Webhooks`
          : 'Payment Gateway (Unspecified)',
        description: 'Payment tokenization, card processing, and subscription billing webhooks',
        purpose: 'Process transactions securely and notify system through signed webhooks',
        status: isResolved ? 'CONFIRMED' : 'UNRESOLVED',
        source: 'REQUIREMENT',
        sourceFeatures: facts.features.filter((f) => /payment|billing|subscription|checkout/i.test(f.name + f.description)).map((f) => f.name),
        sourceRequirements: facts.requirements
          .filter((r) => /payment|billing|subscription|checkout|purchase/i.test(r.title + r.description))
          .map((r) => r.identifier),
        reason: 'Direct financial handling requires a PCI-compliant external payment provider',
        evidence: 'Product flows include a checkout session and provider webhook boundary',
        confidence: isResolved ? 'HIGH' : 'MEDIUM',
        ...pos,
      });

      edges.push({
        id: 'edge-client-payment',
        source: clientNodeId,
        target: paymentNodeId,
        label: 'Checkout Session',
        relationshipType: 'CALLS',
        evidence: 'User completes purchase on secure payment gateway',
        animated: true,
      });

      edges.push({
        id: 'edge-payment-webhook',
        source: paymentNodeId,
        target: backendNodeId,
        label: 'Signed Webhooks',
        relationshipType: 'SENDS_TO',
        evidence: 'Payment processor notifies backend of invoice and subscription state changes',
        animated: true,
      });

      if (!isResolved) {
        unresolvedDecisions.push({
          id: 'DEC-PAYMENT-PROVIDER',
          title: 'Select Payment Processing Provider',
          reason: 'Payments required by specification, but processor (e.g. Stripe, PayPal, Lemon Squeezy) not explicitly confirmed.',
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 2: FILE STORAGE
    // ──────────────────────────────────────────────────────────────────────────
    if (facts.capabilities.hasFileStorage) {
      complexityLevel = Math.max(complexityLevel, 2) as 1 | 2 | 3 | 4;
      const storageNodeId = 'node-storage';
      const extStorage = facts.externalSystems.find((e) => /storage|s3|blob|file/i.test(e.name) && e.specifiedProvider);
      const isResolved = !!extStorage?.specifiedProvider;
      const pos = infraPos();

      nodes.push({
        id: storageNodeId,
        label: extStorage?.specifiedProvider || 'File Storage',
        type: 'storage',
        technology: extStorage?.specifiedProvider ? `${extStorage.specifiedProvider}` : 'Object Storage (Unspecified)',
        description: 'Durable storage for uploaded files, images, or documents',
        purpose: 'Binary file persistence and retrieval',
        status: isResolved ? 'CONFIRMED' : 'UNRESOLVED',
        source: 'REQUIREMENT',
        sourceRequirements: facts.requirements
          .filter((r) => /upload|file|image|document|avatar|attachment/i.test(r.title + r.description))
          .map((r) => r.identifier),
        reason: facts.capabilities.fileStorageReason || 'PRD requires file upload/download handling',
        evidence: 'Product specification includes file handling requirements',
        confidence: isResolved ? 'HIGH' : 'MEDIUM',
        ...pos,
      });

      edges.push({
        id: 'edge-backend-storage',
        source: backendNodeId,
        target: storageNodeId,
        label: 'Upload / Download',
        relationshipType: 'STORES_IN',
        evidence: 'Backend uploads and serves files via object storage',
      });

      if (!isResolved) {
        unresolvedDecisions.push({
          id: 'DEC-STORAGE-PROVIDER',
          title: 'Select File Storage Provider',
          reason: 'File storage boundary is required, but the PRD does not specify a provider (e.g. S3, GCS, local disk).',
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 2: SEARCH
    // ──────────────────────────────────────────────────────────────────────────
    if (facts.capabilities.hasSearch) {
      complexityLevel = Math.max(complexityLevel, 2) as 1 | 2 | 3 | 4;
      const searchNodeId = 'node-search';
      const pos = infraPos();

      nodes.push({
        id: searchNodeId,
        label: 'Search Service',
        type: 'service',
        technology: 'Database full-text / search index',
        description: 'Full-text and global search across product content',
        purpose: 'Fast lookup across persisted content',
        status: 'CONFIRMED',
        source: 'REQUIREMENT',
        sourceRequirements: facts.requirements
          .filter((r) => /search|find|query|lookup/i.test(r.title + r.description))
          .map((r) => r.identifier),
        reason: facts.capabilities.searchReason || 'PRD requires search across content',
        evidence: 'Product specification includes search requirements',
        confidence: 'HIGH',
        ...pos,
      });

      edges.push({
        id: 'edge-backend-search',
        source: backendNodeId,
        target: searchNodeId,
        label: 'Index / Query',
        relationshipType: 'USES',
        evidence: 'Backend indexes and queries content for search',
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 2: REALTIME SUBSYSTEM (only if explicit live multiplayer behavior)
    // ──────────────────────────────────────────────────────────────────────────
    if (facts.capabilities.hasRealtimeCollaboration) {
      complexityLevel = Math.max(complexityLevel, 2) as 1 | 2 | 3 | 4;
      const realtimeNodeId = 'node-realtime';
      const pos = infraPos();

      nodes.push({
        id: realtimeNodeId,
        label: 'Real-time Sync Subsystem',
        type: 'service',
        technology: 'Liveblocks / WebSocket PubSub',
        description: 'Live presence, cursors, and broadcast state synchronization for concurrent editors',
        purpose: 'Low-latency state fanout for collaborative workspace sessions',
        status: 'CONFIRMED',
        source: 'REQUIREMENT',
        sourceFeatures: facts.features.filter((f) => /real.?time|collaborat|presence|live/i.test(f.name + f.description)).map((f) => f.name),
        reason: facts.capabilities.realtimeReason || 'Multiple users must observe shared changes and presence simultaneously',
        evidence: 'Explicit requirement for live multiplayer synchronization',
        confidence: 'HIGH',
        ...pos,
      });

      edges.push({
        id: 'edge-client-realtime',
        source: clientNodeId,
        target: realtimeNodeId,
        label: 'WebSocket (Presence & Edits)',
        relationshipType: 'USES',
        evidence: 'Client maintains bidirectional live connection for concurrent session awareness',
        animated: true,
      });

      edges.push({
        id: 'edge-realtime-backend',
        source: realtimeNodeId,
        target: backendNodeId,
        label: 'Event Sync & Persistence',
        relationshipType: 'AFFECTS',
        evidence: 'Broadcasted live state is periodically flushed to backend',
        animated: false,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEVEL 3: CACHE / WORKER EVALUATION (strict evidence rule)
    // ──────────────────────────────────────────────────────────────────────────
    if (facts.capabilities.hasCachingRequirement) {
      complexityLevel = Math.max(complexityLevel, 3) as 1 | 2 | 3 | 4;
      const cacheNodeId = 'node-cache';
      const pos = infraPos();

      nodes.push({
        id: cacheNodeId,
        label: 'In-Memory Cache (Redis)',
        type: 'queue',
        technology: 'Redis',
        description: 'High-speed read cache for low-latency queries',
        purpose: 'Offload read queries under high throughput access patterns',
        status: 'CONFIRMED',
        source: 'REQUIREMENT',
        reason: facts.capabilities.cachingReason || 'Demonstrated read latency requirement',
        evidence: 'Access pattern demands caching beyond database indexes',
        confidence: 'HIGH',
        ...pos,
      });

      edges.push({
        id: 'edge-backend-cache',
        source: backendNodeId,
        target: cacheNodeId,
        label: 'Read/Write Cache',
        relationshipType: 'USES',
        evidence: 'Backend caches hot read paths in Redis',
      });
    }

    if (facts.capabilities.hasAsyncBackgroundProcessing) {
      complexityLevel = Math.max(complexityLevel, 3) as 1 | 2 | 3 | 4;
      const workerNodeId = 'node-worker';
      const pos = infraPos();

      nodes.push({
        id: workerNodeId,
        label: 'Async Background Worker',
        type: 'service',
        technology: 'BullMQ + Worker Pool',
        description: 'Dedicated consumer for long-running asynchronous jobs',
        purpose: 'Prevent HTTP thread blocking for CPU-intensive workloads',
        status: 'CONFIRMED',
        source: 'REQUIREMENT',
        reason: facts.capabilities.asyncReason || 'Background workload exceeds synchronous HTTP timeouts',
        evidence: 'Asynchronous task queue required for heavy export/processing',
        confidence: 'HIGH',
        ...pos,
      });

      edges.push({
        id: 'edge-backend-worker',
        source: backendNodeId,
        target: workerNodeId,
        label: 'Enqueues Jobs',
        relationshipType: 'CALLS',
        evidence: 'Backend dispatches heavy job payloads to background worker',
        animated: true,
      });
    }

    return {
      nodes,
      edges,
      unresolvedDecisions,
      assumptions,
      complexityLevel,
    };
  }

  /**
   * Rejects unjustified Gemini AI suggestions (e.g., unsolicited Redis, Kafka, Kubernetes).
   */
  static evaluateAiSuggestion(
    suggestion: { label: string; technology?: string; reason?: string },
    facts: ExtractedPRDFacts,
  ): { accepted: boolean; status: ArchitectureComponentStatus; explanation: string } {
    const label = (suggestion.label || '').toLowerCase();
    const tech = (suggestion.technology || '').toLowerCase();

    // Microservices / Kubernetes check
    if (/kubernetes|k8s|microservice|service mesh|istio/i.test(label + tech)) {
      return {
        accepted: false,
        status: 'REMOVED',
        explanation: 'Rejected for MVP: Modular monolith is Friday standard. No independent scaling or deployment requirement exists.',
      };
    }

    // Kafka / Message Broker check
    if (/kafka|rabbitmq|message broker|event bus/i.test(label + tech)) {
      return {
        accepted: false,
        status: 'REMOVED',
        explanation: 'Rejected: No high-throughput event streaming requirement justified in PRD.',
      };
    }

    // Redis check
    if (/redis|cache|caching/i.test(label + tech)) {
      if (facts.capabilities.hasCachingRequirement) {
        return {
          accepted: true,
          status: 'CONFIRMED',
          explanation: 'Accepted: PRD explicitly specified concrete read access bottleneck requirement.',
        };
      }
      return {
        accepted: false,
        status: 'AI_SUGGESTED',
        explanation: 'Not required for MVP: Standard PostgreSQL queries with proper indexing satisfy access patterns. No caching requirement identified.',
      };
    }

    // CDN / Edge check for simple projects
    if (/cdn|cloudflare|edge/i.test(label + tech)) {
      return {
        accepted: false,
        status: 'AI_SUGGESTED',
        explanation: 'Hosting CDN is infrastructure concern, not core product application architecture.',
      };
    }

    return {
      accepted: true,
      status: 'AI_SUGGESTED',
      explanation: 'Evaluated as potential candidate subject to user review.',
    };
  }
}
