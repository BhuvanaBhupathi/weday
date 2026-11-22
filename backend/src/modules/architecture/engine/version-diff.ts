import type {
  ArchitectureNodeData,
  ArchitectureDiffResult,
} from '@friday/types';

export class VersionDiff {
  /**
   * Compares two architecture version node sets to identify NEW, MODIFIED, REMOVED, and AFFECTED components.
   */
  static compare(
    previousVersionNumber: number,
    previousNodes: ArchitectureNodeData[],
    currentVersionNumber: number,
    currentNodes: ArchitectureNodeData[],
  ): ArchitectureDiffResult {
    const prevMap = new Map<string, ArchitectureNodeData>();
    previousNodes.forEach((n) => prevMap.set(n.id, n));

    const currMap = new Map<string, ArchitectureNodeData>();
    currentNodes.forEach((n) => currMap.set(n.id, n));

    const newNodes: ArchitectureNodeData[] = [];
    const modifiedNodes: ArchitectureDiffResult['modifiedNodes'] = [];
    const removedNodes: ArchitectureNodeData[] = [];
    const affectedNodes: ArchitectureDiffResult['affectedNodes'] = [];

    // Find new and modified
    for (const [id, curr] of currMap.entries()) {
      const prev = prevMap.get(id);
      if (!prev) {
        newNodes.push(curr);
      } else {
        const diffKeys: string[] = [];
        if (curr.label !== prev.label) diffKeys.push('label');
        if (curr.technology !== prev.technology) diffKeys.push('technology');
        if (curr.type !== prev.type) diffKeys.push('type');
        if (curr.description !== prev.description) diffKeys.push('description');
        if (curr.status !== prev.status) diffKeys.push('status');

        if (diffKeys.length > 0) {
          modifiedNodes.push({ current: curr, previous: prev, diffKeys });
        }
      }
    }

    // Find removed
    for (const [id, prev] of prevMap.entries()) {
      if (!currMap.has(id)) {
        removedNodes.push(prev);
      }
    }

    // Determine affected nodes (nodes that depend on modified/new/removed nodes)
    const changedIds = new Set([
      ...newNodes.map((n) => n.id),
      ...modifiedNodes.map((m) => m.current.id),
      ...removedNodes.map((n) => n.id),
    ]);

    for (const curr of currentNodes) {
      if (!changedIds.has(curr.id)) {
        const hasDependencyOnChanged = curr.dependsOn?.some((depId) => changedIds.has(depId));
        const isUsedByChanged = curr.usedBy?.some((usedId) => changedIds.has(usedId));
        if (hasDependencyOnChanged || isUsedByChanged) {
          affectedNodes.push({
            node: curr,
            reason: hasDependencyOnChanged
              ? 'Depends on a newly added or modified architecture component'
              : 'Used by a changed or newly introduced component',
          });
        }
      }
    }

    return {
      previousVersionNumber,
      currentVersionNumber,
      newNodes,
      modifiedNodes,
      removedNodes,
      affectedNodes,
    };
  }
}
