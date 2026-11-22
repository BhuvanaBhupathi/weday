import { describe, it, expect } from 'vitest';
import {
  diffSnapshots,
  filterDiffByMode,
  snapshotsEqual,
  summarizeDiff,
  type CanvasSnapshot,
} from './canvas-diff';

function node(
  id: string,
  title: string,
  x = 0,
  y = 0,
  extra: Partial<Record<string, any>> = {},
): any {
  return {
    id,
    pageId: 'page-1',
    type: 'TEXT',
    title,
    x,
    y,
    width: 280,
    height: 160,
    rotation: 0,
    zIndex: 0,
    data: {},
    sourceRef: null,
    ...extra,
  };
}

function edge(id: string, source: string, target: string, extra: any = {}): any {
  return { id, pageId: 'page-1', source, target, label: null, relation: null, data: {}, ...extra };
}

const PAGE_1 = {
  id: 'page-1',
  name: 'Overview',
  slug: 'overview',
  description: null,
  parentPageId: null,
  order: 0,
};

function snapshot(pages: any[], nodes: any[], edges: any[] = []): CanvasSnapshot {
  return { pages, nodes, edges, metadata: { savedAt: 't' } };
}

describe('canvas-diff', () => {
  it('treats the first version as everything added', () => {
    const diff = diffSnapshots(null, snapshot([PAGE_1], [node('n1', 'Problem'), node('n2', 'Requirement')], [edge('e1', 'n1', 'n2')]));
    expect(diff.counts).toEqual({ ADDED: 4, REMOVED: 0, MODIFIED: 0, MOVED: 0 });
    expect(diff.added.every((i) => i.changeType === 'ADDED')).toBe(true);
  });

  it('classifies added / removed / modified / moved nodes correctly', () => {
    const base = snapshot([PAGE_1], [
      node('problem', 'Problem'),
      node('req', 'Requirement'),
      node('arch', 'Architecture', 500, 300),
    ]);
    const next = snapshot([PAGE_1], [
      node('problem', 'Problem'),
      node('req', 'Product Requirement'), // renamed → modified
      node('arch', 'Architecture', 800, 500), // moved only
      node('auth', 'Authentication'), // added
      node('db', 'Database'), // added
    ]);

    const diff = diffSnapshots(base, next);
    expect(diff.counts.ADDED).toBe(2);
    expect(diff.counts.REMOVED).toBe(0);
    expect(diff.counts.MODIFIED).toBe(1);
    expect(diff.counts.MOVED).toBe(1);

    const modified = diff.modified.find((i) => i.targetId === 'req')!;
    expect(modified.detail!.fields).toEqual(['title']);
    expect(modified.detail!.titleFrom).toBe('Requirement');
    expect(modified.detail!.titleTo).toBe('Product Requirement');

    const moved = diff.moved.find((i) => i.targetId === 'arch')!;
    expect(moved.detail!.movedFrom).toEqual({ x: 500, y: 300 });
    expect(moved.detail!.movedTo).toEqual({ x: 800, y: 500 });
  });

  it('does not classify a pure position change as a content modification', () => {
    const base = snapshot([PAGE_1], [node('a', 'A', 0, 0)]);
    const next = snapshot([PAGE_1], [node('a', 'A', 12, 34)]);
    const diff = diffSnapshots(base, next);
    expect(diff.counts.MODIFIED).toBe(0);
    expect(diff.counts.MOVED).toBe(1);
    expect(filterDiffByMode(diff, 'content').length).toBe(0);
    expect(filterDiffByMode(diff, 'layout').length).toBe(1);
  });

  it('classifies dimension changes as modified (layout) and data changes as modified (content)', () => {
    const base = snapshot([PAGE_1], [node('a', 'A', 0, 0, { width: 280, height: 160, data: { body: 'old' } })]);
    const resized = snapshot([PAGE_1], [node('a', 'A', 0, 0, { width: 400, height: 160, data: { body: 'old' } })]);
    const redata = snapshot([PAGE_1], [node('a', 'A', 0, 0, { width: 280, height: 160, data: { body: 'new' } })]);

    const resizeDiff = diffSnapshots(base, resized);
    expect(resizeDiff.counts.MODIFIED).toBe(1);
    expect(resizeDiff.modified[0].bucket).toBe('layout');

    const dataDiff = diffSnapshots(base, redata);
    expect(dataDiff.modified[0].bucket).toBe('content');
    expect(dataDiff.modified[0].detail!.fields).toEqual(['data']);
  });

  it('reports a modified node that also moved as MODIFIED with move detail', () => {
    const base = snapshot([PAGE_1], [node('a', 'A', 0, 0)]);
    const next = snapshot([PAGE_1], [node('a', 'A renamed', 50, 50)]);
    const diff = diffSnapshots(base, next);
    expect(diff.counts.MOVED).toBe(0);
    expect(diff.counts.MODIFIED).toBe(1);
    expect(diff.modified[0].detail!.movedFrom).toEqual({ x: 0, y: 0 });
    expect(diff.modified[0].detail!.movedTo).toEqual({ x: 50, y: 50 });
  });

  it('tracks edge additions, removals and modifications', () => {
    const base = snapshot([PAGE_1], [node('a', 'A'), node('b', 'B')], [edge('e1', 'a', 'b', { label: 'depends on' })]);
    const next = snapshot([PAGE_1], [node('a', 'A'), node('b', 'B'), node('c', 'C')], [
      edge('e1', 'a', 'b', { label: 'leads to' }),
      edge('e2', 'b', 'c'),
    ]);
    const diff = diffSnapshots(base, next);
    expect(diff.added.map((i) => i.targetId)).toEqual(['c', 'e2']);
    expect(diff.modified.find((i) => i.targetId === 'e1')?.detail!.labelFrom).toBe('depends on');
    expect(diff.modified.find((i) => i.targetId === 'e1')?.detail!.labelTo).toBe('leads to');
  });

  it('tracks page additions, removals and renames', () => {
    const base = snapshot([PAGE_1], [node('a', 'A')]);
    const page2 = { ...PAGE_1, id: 'page-2', name: 'Dashboard', slug: 'dashboard', order: 1 };
    const next = snapshot(
      [{ ...PAGE_1, name: 'Product Overview' }, page2],
      [node('a', 'A')],
    );
    const diff = diffSnapshots(base, next);
    expect(diff.added.find((i) => i.targetType === 'PAGE')?.targetLabel).toBe('Dashboard');
    expect(diff.modified.filter((i) => i.targetType === 'PAGE').map((i) => i.targetId)).toEqual(['page-1']);
    expect(diff.modified.find((i) => i.targetId === 'page-1')?.detail!.nameFrom).toBe('Overview');
    expect(diff.modified.find((i) => i.targetId === 'page-1')?.detail!.nameTo).toBe('Product Overview');
  });

  it('filters by comparison mode', () => {
    const base = snapshot([PAGE_1], [node('a', 'A', 0, 0), node('b', 'B')]);
    const next = snapshot([PAGE_1], [
      node('a', 'A', 9, 9), // moved
      node('b', 'B v2'), // modified (content)
      node('c', 'C'), // added
    ]);
    const diff = diffSnapshots(base, next);

    expect(filterDiffByMode(diff, 'structure').map((i) => i.targetId)).toEqual(['c']);
    expect(filterDiffByMode(diff, 'content').map((i) => i.targetId)).toEqual(['b']);
    expect(filterDiffByMode(diff, 'layout').map((i) => i.targetId)).toEqual(['a']);
    expect(filterDiffByMode(diff, 'all')).toHaveLength(3);
  });

  it('reports no diff for identical snapshots and equal() matches', () => {
    const a = snapshot([PAGE_1], [node('a', 'A')]);
    const diff = diffSnapshots(a, snapshot([PAGE_1], [node('a', 'A')]));
    expect(diff.items).toHaveLength(0);
    expect(snapshotsEqual(a, snapshot([PAGE_1], [node('a', 'A')]))).toBe(true);
    expect(summarizeDiff(diff)).toBe('No changes');
  });

  it('summarizes counts in human-readable form', () => {
    const base = snapshot([PAGE_1], [node('a', 'A')]);
    const next = snapshot([PAGE_1], [node('b', 'B'), node('c', 'C')]);
    const diff = diffSnapshots(base, next);
    expect(summarizeDiff(diff)).toBe('2 items added, 1 item removed');
  });

  // ─── The §71 critical acceptance scenario ─────────────────────────────────
  it('handles the v1 → v2 → current-draft restore scenario', () => {
    const v1 = snapshot([PAGE_1], [node('problem', 'Problem'), node('req', 'Requirement'), node('arch', 'Architecture', 500, 300)]);
    const v2 = snapshot(
      [PAGE_1],
      [
        node('problem', 'Problem'),
        node('req', 'Requirement'),
        node('arch', 'Architecture', 800, 500), // moved in v2
        node('auth', 'Authentication'),
        node('db', 'Database'),
        node('dash', 'Dashboard'),
      ],
    );
    const currentDraft = snapshot(
      [PAGE_1],
      [
        node('problem', 'Problem'),
        node('req', 'Requirement'),
        node('arch', 'Architecture', 800, 500),
        node('auth', 'Authentication', 0, 0, { data: { note: 'modified' } }), // modified
        // Database deleted
        node('dash', 'Dashboard'),
        node('pay', 'Payments'), // added
      ],
    );

    // v1 → v2 diff
    const v1toV2 = diffSnapshots(v1, v2);
    expect(v1toV2.added.map((i) => i.targetLabel).sort()).toEqual(['Authentication', 'Dashboard', 'Database']);
    expect(v1toV2.moved.map((i) => i.targetLabel)).toEqual(['Architecture']);

    // v2 → current draft diff
    const v2toCurrent = diffSnapshots(v2, currentDraft);
    expect(v2toCurrent.removed.map((i) => i.targetLabel)).toEqual(['Database']);
    expect(v2toCurrent.added.map((i) => i.targetLabel)).toEqual(['Payments']);
    expect(v2toCurrent.modified.map((i) => i.targetLabel)).toEqual(['Authentication']);

    // Restoring v2 means current → v2: the inverse changes
    const currentToV2 = diffSnapshots(currentDraft, v2);
    expect(currentToV2.added.map((i) => i.targetLabel).sort()).toEqual(['Database']);
    expect(currentToV2.removed.map((i) => i.targetLabel)).toEqual(['Payments']);
    expect(currentToV2.modified.map((i) => i.targetLabel)).toEqual(['Authentication']);
    expect(snapshotsEqual(currentDraft, v2)).toBe(false);
  });
});
