import { z } from 'zod';
import type { ExtractedPRDFacts } from './prd-interpreter';

export interface LlmExtractOptions {
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  openaiModel?: string;
  timeoutMs?: number;
}

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-pro'];

// ── Zod schema for the raw LLM JSON (lenient in, strict out) ────────────────

const flowStepSchema = z
  .object({
    actor: z.string().optional(),
    pageOrInterface: z.string().optional(),
    action: z.string().optional(),
    apiOrValidation: z.string().optional(),
    businessLogic: z.string().optional(),
    persistence: z.string().optional(),
    externalBoundary: z.string().optional(),
    response: z.string().optional(),
  })
  .passthrough();

const llmFactsSchema = z
  .object({
    actors: z.array(z.string()).default([]),
    pages: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string(),
            description: z.string().optional().default(''),
          })
          .passthrough(),
      )
      .default([]),
    features: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string(),
            description: z.string().optional().default(''),
            pageNames: z.array(z.string()).optional().default([]),
            requirementIds: z.array(z.string()).optional().default([]),
          })
          .passthrough(),
      )
      .default([]),
    requirements: z
      .array(
        z
          .object({
            identifier: z.string().optional(),
            title: z.string(),
            description: z.string().optional().default(''),
          })
          .passthrough(),
      )
      .default([]),
    flows: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string(),
            featureId: z.string().optional(),
            steps: z.array(flowStepSchema).optional().default([]),
          })
          .passthrough(),
      )
      .default([]),
    dataEntities: z
      .array(
        z
          .object({
            name: z.string(),
            attributes: z.array(z.string()).optional().default([]),
            persisted: z.boolean().optional().default(true),
            featureIds: z.array(z.string()).optional().default([]),
          })
          .passthrough(),
      )
      .default([]),
    externalSystems: z
      .array(
        z
          .object({
            name: z.string(),
            role: z.string().optional().default(''),
            explicit: z.boolean().optional().default(true),
            specifiedProvider: z.string().optional(),
          })
          .passthrough(),
      )
      .default([]),
    capabilities: z
      .object({
        hasAuthentication: z.boolean().optional().default(false),
        authProviderSpecified: z.string().optional(),
        hasDatabasePersistence: z.boolean().optional().default(false),
        hasFileStorage: z.boolean().optional().default(false),
        hasEmailDelivery: z.boolean().optional().default(false),
        hasPayments: z.boolean().optional().default(false),
        paymentProviderSpecified: z.string().optional(),
        hasRealtimeCollaboration: z.boolean().optional().default(false),
        realtimeReason: z.string().optional(),
        hasAsyncBackgroundProcessing: z.boolean().optional().default(false),
        asyncReason: z.string().optional(),
        hasCachingRequirement: z.boolean().optional().default(false),
        cachingReason: z.string().optional(),
        hasSearch: z.boolean().optional().default(false),
        searchReason: z.string().optional(),
      })
      .passthrough()
      .default({}),
    assumptions: z.array(z.string()).default([]),
    decisions: z
      .array(
        z
          .object({
            identifier: z.string().optional(),
            decision: z.string(),
            rationale: z.string().optional().default(''),
          })
          .passthrough(),
      )
      .default([]),
    explicitTechnologies: z.array(z.string()).default([]),
  })
  .passthrough();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40) || 'item';

/**
 * Pure normalization: raw LLM JSON → validated, ID-sanitized ExtractedPRDFacts.
 * Returns null when the payload is not usable (malformed or empty).
 */
export function normalizeLlmFacts(raw: unknown): ExtractedPRDFacts | null {
  try {
    const parsed = llmFactsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const p = parsed.data;

    // Reject payloads that extracted nothing meaningful.
    const hasContent = p.pages.length > 0 || p.features.length > 0 || p.flows.length > 0 || p.dataEntities.length > 0;
    if (!hasContent) return null;

    const pages = p.pages.map((pg, i) => ({
      id: pg.id && pg.id.trim() ? pg.id.trim().toUpperCase() : `PAGE-${slugify(pg.name).toUpperCase()}`,
      name: pg.name.trim(),
      description: (pg.description || '').trim(),
    }));

    const features = p.features.map((f, i) => ({
      id: f.id && f.id.trim() ? f.id.trim().toUpperCase() : `FEAT-${String(i + 1).padStart(3, '0')}`,
      name: f.name.trim(),
      description: (f.description || '').trim(),
      pageNames: (f.pageNames || []).map((n) => n.trim()).filter(Boolean),
      requirementIds: (f.requirementIds || []).map((r) => r.trim().toUpperCase()).filter(Boolean),
    }));

    const featureIds = new Set(features.map((f) => f.id));
    const pageNames = pages.map((pg) => pg.name.toLowerCase());
    const matchPage = (candidate?: string) => {
      if (!candidate) return undefined;
      const c = candidate.toLowerCase().replace(/\b(page|screen|view)\b/g, '').trim();
      const hit = pageNames.find((n) => n === c || n.includes(c) || c.includes(n));
      return hit;
    };
    const matchFeatureId = (featureName?: string) => {
      if (!featureName) return undefined;
      const c = featureName.toLowerCase();
      return features.find((f) => f.name.toLowerCase() === c || c.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(c))?.id;
    };

    const flows = p.flows.map((fl, i) => ({
      id: fl.id && fl.id.trim() ? fl.id.trim().toUpperCase() : `FLOW-${String(i + 1).padStart(3, '0')}`,
      name: fl.name.trim(),
      featureId: featureIds.has((fl.featureId || '').toUpperCase())
        ? fl.featureId!.toUpperCase()
        : matchFeatureId(fl.name),
      steps: fl.steps.map((s) => ({
        actor: (s.actor || '').trim(),
        pageOrInterface: (s.pageOrInterface || '').trim(),
        action: (s.action || '').trim(),
        apiOrValidation: s.apiOrValidation?.trim() || undefined,
        businessLogic: s.businessLogic?.trim() || undefined,
        persistence: s.persistence?.trim() || undefined,
        externalBoundary: s.externalBoundary?.trim() || undefined,
        response: s.response?.trim() || undefined,
      })),
    }));

    const dataEntities = p.dataEntities.map((e) => ({
      name: e.name.trim(),
      attributes: (e.attributes || []).map((a) => a.trim()).filter(Boolean),
      persisted: e.persisted !== false,
      featureIds: (e.featureIds || []).map((f) => f.toUpperCase()).filter((f) => featureIds.has(f)),
    }));

    const externalSystems = p.externalSystems.map((e) => ({
      name: e.name.trim(),
      role: (e.role || '').trim(),
      explicit: e.explicit !== false,
      specifiedProvider: e.specifiedProvider?.trim() || undefined,
    }));

    const caps = p.capabilities;
    const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

    return {
      actors: (p.actors || []).map((a) => a.trim()).filter(Boolean),
      pages,
      features,
      requirements: p.requirements
        .map((r) => ({
          identifier: (r.identifier || '').trim().toUpperCase(),
          title: r.title.trim(),
          description: (r.description || '').trim(),
        }))
        .filter((r) => r.identifier && r.title),
      flows,
      dataEntities,
      externalSystems,
      capabilities: {
        hasAuthentication: !!caps.hasAuthentication,
        authProviderSpecified: clean(caps.authProviderSpecified),
        hasDatabasePersistence: !!caps.hasDatabasePersistence,
        hasFileStorage: !!caps.hasFileStorage,
        fileStorageReason: clean(caps.hasFileStorage ? 'PRD requires file/upload handling' : undefined),
        hasEmailDelivery: !!caps.hasEmailDelivery,
        hasPayments: !!caps.hasPayments,
        paymentProviderSpecified: clean(caps.paymentProviderSpecified),
        hasRealtimeCollaboration: !!caps.hasRealtimeCollaboration,
        realtimeReason: clean(caps.realtimeReason),
        hasAsyncBackgroundProcessing: !!caps.hasAsyncBackgroundProcessing,
        asyncReason: clean(caps.asyncReason),
        hasCachingRequirement: !!caps.hasCachingRequirement,
        cachingReason: clean(caps.cachingReason),
        hasSearch: !!caps.hasSearch,
        searchReason: clean(caps.searchReason),
      },
      explicitTechnologies: (p.explicitTechnologies || []).map((t) => t.trim()).filter(Boolean),
      assumptions: (p.assumptions || []).map((a) => a.trim()).filter(Boolean),
      decisions: p.decisions
        .map((d) => ({
          identifier: (d.identifier || '').trim().toUpperCase() || 'DEC-LLM',
          decision: d.decision.trim(),
          rationale: (d.rationale || '').trim(),
        }))
        .filter((d) => d.decision),
    };
  } catch {
    return null;
  }
}

function buildExtractionPrompt(
  prdContent: string,
  existingRequirements: Array<{ identifier: string; title: string; description: string }>,
): string {
  const reqList = existingRequirements.length
    ? existingRequirements.map((r) => `- ${r.identifier}: ${r.title} — ${r.description}`).join('\n')
    : '(none registered yet — extract requirement statements from the PRD itself and assign identifiers FR-001, FR-002, ... in document order)';

  return `You are the PRODUCT FACT EXTRACTOR inside Friday, a collaborative software planning workspace.
You are NOT an architect. Do NOT design or suggest any architecture, infrastructure, or technologies. Your ONLY job is to read the Product Requirements Document below and extract every product/system fact, COMPLETELY and WITHOUT OMISSIONS.

EXTRACT EVERY INSTANCE OF (do not summarize or cap the lists):
1. "pages" — every screen/page the product has (name + one-line purpose).
2. "features" — every distinct feature/capability. For EACH feature set:
   - "pageNames": the pages where the feature is used (match page names exactly as extracted).
   - "requirementIds": the FR identifiers (from the registered requirements list, or your extracted ones) that this feature implements. Map EVERY requirement to at least one feature when the PRD makes the link clear.
3. "requirements" — every requirement. If the registered list below is non-empty, reproduce it verbatim (identifier + title + description) and do NOT invent extra ones.
4. "flows" — one entry per meaningful user flow (happy path). Each flow has "featureId" (the feature it belongs to) and "steps": each step is ACTOR → pageOrInterface → action, plus apiOrValidation (the HTTP endpoint implied, e.g. "POST /api/projects"), businessLogic, persistence (what data is stored/queried), externalBoundary (any external service touched), response.
5. "dataEntities" — every persistent data entity with its key attributes, and "featureIds" for the features that own it. Set "persisted": false only for purely in-memory/transient data.
6. "externalSystems" — only external systems the PRD actually requires (email, identity provider, payments, file storage, search, third-party APIs). "explicit": true only if the PRD names the behavior; "specifiedProvider" ONLY if the PRD names a concrete vendor. If no vendor is named, OMIT specifiedProvider — never guess one.
7. "capabilities" — boolean flags, with STRICT rules:
   - hasAuthentication: the PRD requires user accounts/login.
   - hasDatabasePersistence: the PRD requires durable data storage.
   - hasFileStorage: uploads/downloads of files/images/documents.
   - hasEmailDelivery: email must be sent.
   - hasPayments: money changes hands.
   - hasRealtimeCollaboration: multiple users must see each other's changes live (simultaneous editing/presence). NOT for ordinary async sync.
   - hasAsyncBackgroundProcessing: long-running work (video transcoding, large exports, heavy batch jobs). NOT ordinary background emails.
   - hasCachingRequirement: ONLY if the PRD states an explicit high-throughput/latency requirement. Ordinary data access does NOT count.
   - hasSearch: full-text/global search across content.
8. "explicitTechnologies" — technologies the PRD names explicitly (e.g. Next.js, PostgreSQL, Stripe). List only what is named.
9. "decisions" — architecture/technology decisions the PRD explicitly makes (identifier DEC-001, ...).
10. "assumptions" — assumptions the PRD states or that are necessary and unambiguous.

RULES:
- Extract, do not design. If the PRD is silent about something, leave it out — do not invent features, pages, entities, or vendors.
- Every list must be complete: walk the PRD section by section (pages, features, flows, data, integrations, non-functional requirements) and do not leave any out.
- Respond with a SINGLE valid JSON object, no markdown fences, no commentary, with exactly these top-level keys:
{"actors": string[], "pages": [{"id","name","description"}], "features": [{"id","name","description","pageNames":[],"requirementIds":[]}], "requirements": [{"identifier","title","description"}], "flows": [{"id","name","featureId","steps":[{"actor","pageOrInterface","action","apiOrValidation","businessLogic","persistence","externalBoundary","response"}]}], "dataEntities": [{"name","attributes":[],"persisted":true,"featureIds":[]}], "externalSystems": [{"name","role","explicit","specifiedProvider"}], "capabilities": {"hasAuthentication","authProviderSpecified","hasDatabasePersistence","hasFileStorage","hasEmailDelivery","hasPayments","paymentProviderSpecified","hasRealtimeCollaboration","realtimeReason","hasAsyncBackgroundProcessing","asyncReason","hasCachingRequirement","cachingReason","hasSearch","searchReason"}, "explicitTechnologies": string[], "assumptions": string[], "decisions": [{"identifier","decision","rationale"}]}

REGISTERED REQUIREMENTS (canonical — use these identifiers):
${reqList}

PRODUCT REQUIREMENTS DOCUMENT:
"""
${prdContent}
"""`;
}

async function callGeminiWithTimeout(apiKey: string, model: string, prompt: string, timeoutMs: number): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini ${model} returned ${res.status}`);
    const json = (await res.json()) as any;
    const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error(`Gemini ${model} returned empty content`);
    return JSON.parse(candidate);
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAIWithTimeout(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You extract structured product facts from a PRD. Respond with a single valid JSON object only.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI ${model} returned ${res.status}`);
    const json = (await res.json()) as any;
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error(`OpenAI ${model} returned empty content`);
    return JSON.parse(content);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * LLM-backed PRD fact extraction (Gemini = product understanding).
 * The deterministic Reasoning Engine still makes every architecture decision;
 * this only enriches the fact model. Returns null when no provider is
 * configured or all attempts fail — callers fall back to pure-deterministic facts.
 */
export class LlmPrdExtractor {
  static async extract(
    prdContent: string,
    existingRequirements: Array<{ identifier: string; title: string; description: string }>,
    opts: LlmExtractOptions,
  ): Promise<ExtractedPRDFacts | null> {
    if (!prdContent?.trim()) return null;
    const timeoutMs = opts.timeoutMs ?? 90_000;
    const prompt = buildExtractionPrompt(prdContent, existingRequirements);

    if (opts.geminiApiKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const raw = await callGeminiWithTimeout(opts.geminiApiKey, model, prompt, timeoutMs);
          const facts = normalizeLlmFacts(raw);
          if (facts) return facts;
        } catch {
          // try next model
        }
      }
    }

    if (opts.openaiApiKey) {
      try {
        const raw = await callOpenAIWithTimeout(opts.openaiApiKey, opts.openaiModel || 'gpt-4o', prompt, timeoutMs);
        const facts = normalizeLlmFacts(raw);
        if (facts) return facts;
      } catch {
        // fall through to deterministic-only
      }
    }

    return null;
  }
}
