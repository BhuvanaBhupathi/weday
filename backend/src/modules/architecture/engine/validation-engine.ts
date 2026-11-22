import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ArchitectureValidationReport,
} from '@friday/types';
import type { ExtractedPRDFacts } from './prd-interpreter';

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function matchesAny(nodes: ArchitectureNodeData[], name: string): boolean {
  const n = normName(name);
  return nodes.some((node) => {
    const label = normName(node.label);
    return label === n || label.includes(n) || n.includes(label);
  });
}

export class ValidationEngine {
  /**
   * Validates every node, edge, and technology in the architecture model.
   * Produces an explainable, evidence-grounded health report.
   *
   * When the extracted fact model is provided, the report also checks
   * COMPREHENSIVENESS: every PRD feature, page, and persisted data entity
   * must be represented by an architecture component (traceability gaps are
   * surfaced, not silently dropped).
   */
  static validate(
    nodes: ArchitectureNodeData[],
    edges: ArchitectureEdgeData[],
    requirementIdentifiers: string[] = [],
    facts?: ExtractedPRDFacts,
  ): ArchitectureValidationReport {
    const warnings: ArchitectureValidationReport['warnings'] = [];

    let confirmedCount = 0;
    let unresolvedCount = 0;
    let suggestedCount = 0;

    const coveredRequirements = new Set<string>();

    for (const node of nodes) {
      // Status counting
      if (node.status === 'CONFIRMED') confirmedCount++;
      else if (node.status === 'UNRESOLVED') unresolvedCount++;
      else if (node.status === 'AI_SUGGESTED') suggestedCount++;

      // Rule 1: Every meaningful component needs a reason
      if (!node.reason || node.reason.trim().length === 0) {
        warnings.push({
          code: 'MISSING_REASON',
          componentId: node.id,
          message: `Component "${node.label}" has no documented architectural justification or reason.`,
          severity: 'WARNING',
        });
      }

      // Check requirement coverage
      if (Array.isArray(node.sourceRequirements)) {
        node.sourceRequirements.forEach((r) => coveredRequirements.add(r));
      }
      if (node.requirementIdentifier) {
        coveredRequirements.add(node.requirementIdentifier);
      }

      // Rule 10: Complexity / Hallucination warnings
      const label = (node.label || '').toLowerCase();
      const tech = (node.technology || '').toLowerCase();
      if (/kafka|kubernetes|k8s|microservice|service mesh/i.test(label + tech)) {
        warnings.push({
          code: 'UNJUSTIFIED_COMPLEXITY',
          componentId: node.id,
          message: `High-complexity infrastructure "${node.label}" detected. Verify if a modular monolith satisfies requirements before approving.`,
          severity: 'CRITICAL',
        });
      }

      // Rule 4: Unknown information must remain unresolved
      if (node.status === 'UNRESOLVED') {
        warnings.push({
          code: 'UNRESOLVED_COMPONENT',
          componentId: node.id,
          message: `Component "${node.label}" is required by product flows but specific provider/technology requires decision.`,
          severity: 'INFO',
        });
      }

      // Check disconnected nodes (except single node setups)
      if (nodes.length > 1) {
        const isConnected = edges.some((e) => e.source === node.id || e.target === node.id);
        if (!isConnected) {
          warnings.push({
            code: 'ORPHAN_COMPONENT',
            componentId: node.id,
            message: `Component "${node.label}" has no inbound or outbound architectural relationships.`,
            severity: 'WARNING',
          });
        }
      }
    }

    // Rule 2: Every meaningful edge needs evidence
    for (const edge of edges) {
      if (!edge.relationshipType) {
        warnings.push({
          code: 'UNCLASSIFIED_EDGE',
          message: `Relationship from "${edge.source}" to "${edge.target}" has no declared relationship type.`,
          severity: 'INFO',
        });
      }
    }

    // Comprehensiveness: every PRD fact must be represented in the graph
    if (facts) {
      for (const f of facts.features) {
        if (!matchesAny(nodes, f.name)) {
          warnings.push({
            code: 'UNMAPPED_FEATURE',
            message: `PRD feature "${f.name}" has no corresponding architecture component.`,
            severity: 'WARNING',
          });
        }
      }
      for (const p of facts.pages) {
        if (!matchesAny(nodes, p.name)) {
          warnings.push({
            code: 'UNMAPPED_PAGE',
            message: `PRD page "${p.name}" has no corresponding architecture component.`,
            severity: 'INFO',
          });
        }
      }
      for (const e of facts.dataEntities.filter((x) => x.persisted)) {
        if (!matchesAny(nodes, e.name)) {
          warnings.push({
            code: 'UNMAPPED_ENTITY',
            message: `Persistent data entity "${e.name}" has no corresponding architecture component.`,
            severity: 'INFO',
          });
        }
      }
    }

    const totalReqs = requirementIdentifiers.length || 1;
    const reqCoverage = Math.min(100, Math.round((coveredRequirements.size / totalReqs) * 100));

    // Qualitative assessment
    let overallHealth: ArchitectureValidationReport['overallHealth'] = 'EXCELLENT';
    if (warnings.some((w) => w.severity === 'CRITICAL')) {
      overallHealth = 'NEEDS_REVIEW';
    } else if (unresolvedCount > 1 || warnings.some((w) => w.severity === 'WARNING')) {
      overallHealth = 'GOOD';
    } else if (nodes.length === 0) {
      overallHealth = 'INCOMPLETE';
    }

    let traceabilityRating: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    if (reqCoverage < 50) traceabilityRating = 'LOW';
    else if (reqCoverage < 80) traceabilityRating = 'MEDIUM';

    return {
      overallHealth,
      requirementCoveragePercentage: reqCoverage,
      flowCoveragePercentage: nodes.some((n) => n.type === 'frontend') && nodes.some((n) => n.type === 'backend') ? 100 : 66,
      traceabilityRating,
      totalComponents: nodes.length,
      confirmedComponents: confirmedCount,
      unresolvedComponents: unresolvedCount,
      suggestedComponents: suggestedCount,
      warnings,
    };
  }
}
