import type { ExtractedPRDFacts } from './prd-interpreter';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function unionByName<T>(
  base: T[],
  extra: T[],
  keyOf: (t: T) => string,
  merge?: (b: T, e: T) => T,
): T[] {
  const out: T[] = [...base];
  const seen = new Set(base.map(keyOf));
  for (const e of extra) {
    const k = keyOf(e);
    if (seen.has(k)) {
      if (merge) {
        const idx = out.findIndex((b) => keyOf(b) === k);
        out[idx] = merge(out[idx], e);
      }
      continue;
    }
    seen.add(k);
    out.push(e);
  }
  return out;
}

/**
 * Merges the LLM-extracted facts into the deterministic baseline.
 *
 * Policy:
 * - The registered (database) requirements are canonical and win.
 * - Pages / features / flows / entities / external systems: union by name —
 *   the LLM adds detail the regex interpreter cannot see, the baseline adds
 *   a deterministic safety net.
 * - Capabilities: OR — either detector firing is enough to require the boundary.
 * - Providers: deterministic first (tested), LLM as fallback for unusual vendors.
 */
export function mergeFacts(
  base: ExtractedPRDFacts,
  llm: ExtractedPRDFacts,
  canonicalRequirements: Array<{ identifier: string; title: string; description: string }> = [],
): ExtractedPRDFacts {
  const pages = unionByName(
    base.pages,
    llm.pages,
    (p) => norm(p.name),
    (b, e) => ({ ...b, description: e.description || b.description }),
  );

  const features = unionByName(
    base.features,
    llm.features,
    (f) => norm(f.name),
    (b, e) => ({
      ...b,
      description: e.description || b.description,
      pageNames: e.pageNames?.length ? e.pageNames : b.pageNames,
      requirementIds: e.requirementIds?.length ? e.requirementIds : b.requirementIds,
    }),
  );

  const requirements =
    canonicalRequirements.length > 0
      ? canonicalRequirements
      : llm.requirements.length > 0
      ? llm.requirements
      : base.requirements;

  const flows = unionByName(
    base.flows,
    llm.flows,
    (f) => norm(f.name),
    (b, e) => (e.steps.length >= b.steps.length ? { ...b, featureId: e.featureId ?? b.featureId, steps: e.steps } : b),
  );

  const dataEntities = unionByName(
    base.dataEntities,
    llm.dataEntities,
    (e) => norm(e.name),
    (b, e) => ({
      ...b,
      attributes: Array.from(new Set([...(b.attributes || []), ...(e.attributes || [])])),
      persisted: b.persisted || e.persisted,
      featureIds: Array.from(new Set([...(b.featureIds || []), ...(e.featureIds || [])])),
    }),
  );

  const externalSystems = unionByName(
    base.externalSystems,
    llm.externalSystems,
    (s) => norm(s.name),
    (b, e) => ({
      ...b,
      role: e.role || b.role,
      explicit: b.explicit || e.explicit,
      specifiedProvider: b.specifiedProvider || e.specifiedProvider,
    }),
  );

  const bc = base.capabilities;
  const lc = llm.capabilities;

  return {
    actors: Array.from(new Set([...base.actors, ...llm.actors])),
    pages,
    features,
    requirements,
    flows,
    dataEntities,
    externalSystems,
    capabilities: {
      hasAuthentication: bc.hasAuthentication || lc.hasAuthentication,
      authProviderSpecified: bc.authProviderSpecified || lc.authProviderSpecified,
      hasDatabasePersistence: bc.hasDatabasePersistence || lc.hasDatabasePersistence,
      hasFileStorage: bc.hasFileStorage || lc.hasFileStorage,
      fileStorageReason: bc.fileStorageReason || lc.fileStorageReason,
      hasEmailDelivery: bc.hasEmailDelivery || lc.hasEmailDelivery,
      hasPayments: bc.hasPayments || lc.hasPayments,
      paymentProviderSpecified: bc.paymentProviderSpecified || lc.paymentProviderSpecified,
      hasRealtimeCollaboration: bc.hasRealtimeCollaboration || lc.hasRealtimeCollaboration,
      realtimeReason: bc.realtimeReason || lc.realtimeReason,
      hasAsyncBackgroundProcessing: bc.hasAsyncBackgroundProcessing || lc.hasAsyncBackgroundProcessing,
      asyncReason: bc.asyncReason || lc.asyncReason,
      hasCachingRequirement: bc.hasCachingRequirement || lc.hasCachingRequirement,
      cachingReason: bc.cachingReason || lc.cachingReason,
      hasSearch: bc.hasSearch || lc.hasSearch,
      searchReason: bc.searchReason || lc.searchReason,
    },
    explicitTechnologies: Array.from(new Set([...base.explicitTechnologies, ...llm.explicitTechnologies])),
    assumptions: Array.from(new Set([...base.assumptions, ...llm.assumptions])),
    decisions: unionByName(base.decisions, llm.decisions, (d) => norm(d.identifier)),
  };
}
