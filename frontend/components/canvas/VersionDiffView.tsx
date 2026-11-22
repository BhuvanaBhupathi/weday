'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, GitCompareArrows, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { CanvasDiff, CanvasSnapshot, DiffItem, DiffMode, VersionCompareResult } from '../../lib/canvas-types';

const MODES: Array<{ id: DiffMode; label: string }> = [
  { id: 'content', label: 'Content' },
  { id: 'structure', label: 'Structure' },
  { id: 'layout', label: 'Layout' },
  { id: 'all', label: 'All' },
];

const STATE_COLORS: Record<string, { border: string; badge: string; label: string }> = {
  ADDED: { border: 'border-emerald-400/80', badge: 'bg-emerald-500/15 text-emerald-300', label: 'Added' },
  REMOVED: { border: 'border-rose-400/80', badge: 'bg-rose-500/15 text-rose-300', label: 'Removed' },
  MODIFIED: { border: 'border-amber-400/80', badge: 'bg-amber-500/15 text-amber-300', label: 'Modified' },
  MOVED: { border: 'border-sky-400/80', badge: 'bg-sky-500/15 text-sky-300', label: 'Moved' },
  UNCHANGED: { border: 'border-[#2a2a2a]', badge: 'bg-[#1a1a1a] text-zinc-500', label: '' },
};

// Read-only snapshot node for diff panes
function DiffNode({ data }: NodeProps) {
  const state = (data.state as string) || 'UNCHANGED';
  const c = STATE_COLORS[state] || STATE_COLORS.UNCHANGED;
  return (
    <div className={`rounded-lg border bg-[#101010] px-3 py-2 min-w-[140px] max-w-[220px] ${c.border}`}>
      <div className="text-xs font-semibold text-zinc-100 truncate">{(data.title as string) || (data.type as string)}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[9px] font-mono uppercase text-zinc-600">{data.type as string}</span>
        {c.label && <span className={`text-[9px] font-mono px-1 py-px rounded ${c.badge}`}>{c.label}</span>}
      </div>
    </div>
  );
}

const diffNodeTypes = { diff: DiffNode };

function snapshotToFlow(snapshot: CanvasSnapshot, changedIds: Set<string>, stateOf: (id: string) => string) {
  const nodes: Node[] = (snapshot.nodes || []).map((n) => ({
    id: n.id,
    type: 'diff',
    position: { x: n.x, y: n.y },
    data: { title: n.title || n.type, type: n.type, state: stateOf(n.id) },
    draggable: false,
    selectable: false,
    connectable: false,
  }));
  const nodeIds = new Set((snapshot.nodes || []).map((n) => n.id));
  const edges: Edge[] = (snapshot.edges || [])
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => {
      const state = stateOf(e.id);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || undefined,
        animated: state === 'ADDED',
        style: {
          stroke:
            state === 'ADDED'
              ? '#34d399'
              : state === 'REMOVED'
                ? '#fb7185'
                : state === 'MODIFIED'
                  ? '#fbbf24'
                  : '#3f3f46',
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        data: {},
      } as Edge;
    });
  return { nodes, edges };
}

function DiffPane({ title, snapshot, diff, side }: { title: string; snapshot: CanvasSnapshot; diff: CanvasDiff; side: 'base' | 'next' }) {
  const { nodes, edges } = useMemo(() => {
    const changedIds = new Set(diff.items.map((i) => i.targetId));
    const stateOf = (id: string): string => {
      // base side: items present in base; next side: present in next
      const item = diff.items.find((i) => i.targetId === id);
      if (!item) return 'UNCHANGED';
      if (side === 'base') {
        if (item.changeType === 'REMOVED' || item.changeType === 'MOVED' || item.changeType === 'MODIFIED')
          return item.changeType;
        return 'UNCHANGED';
      }
      if (item.changeType === 'ADDED' || item.changeType === 'MOVED' || item.changeType === 'MODIFIED')
        return item.changeType;
      return 'UNCHANGED';
    };
    return snapshotToFlow(snapshot, changedIds, stateOf);
  }, [snapshot, diff, side]);

  return (
    <div className="flex-1 min-w-0 flex flex-col border border-[#1a1a1a] rounded-xl overflow-hidden bg-black">
      <div className="h-8 px-3 flex items-center justify-between bg-[#0a0a0a] border-b border-[#1a1a1a] shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">{title}</span>
        <span className="text-[10px] text-zinc-600 font-mono">
          {(snapshot.nodes || []).length} nodes
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={diffNodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-black"
        >
          <Background variant={BackgroundVariant.Dots} color="#1a1a1a" gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

interface VersionDiffViewProps {
  bandId: string;
  versionId: string;
  onClose: () => void;
}

export default function VersionDiffView({ bandId, versionId, onClose }: VersionDiffViewProps) {
  const [result, setResult] = useState<VersionCompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<DiffMode>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<VersionCompareResult>(`/bands/${bandId}/canvas/versions/${versionId}/compare?other=current`)
      .then((res) => !cancelled && setResult(res))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bandId, versionId]);

  const items: DiffItem[] = useMemo(() => {
    if (!result) return [];
    if (mode === 'all') return result.diff.items;
    return result.diff.items.filter((i) => i.bucket === mode);
  }, [result, mode]);

  if (loading) {
    return (
      <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        <span className="text-xs text-zinc-500">Computing visual diff…</span>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center gap-3 p-6">
        <GitCompareArrows className="w-6 h-6 text-zinc-600" />
        <p className="text-sm text-zinc-300">Version comparison unavailable</p>
        <p className="text-xs text-zinc-500 max-w-sm text-center">{error}</p>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-1.5 rounded-lg bg-[#161616] hover:bg-[#1e1e1e] text-xs text-zinc-200 border border-[#262626]"
        >
          Back to canvas
        </button>
      </div>
    );
  }

  const { diff } = result;

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-11 border-b border-[#1a1a1a] bg-[#080808] px-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-[#161616] hover:bg-[#1e1e1e] text-xs text-zinc-200 border border-[#262626] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Canvas
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <GitCompareArrows className="w-4 h-4 text-violet-300 shrink-0" />
          <span className="text-xs font-bold text-white truncate">Version comparison</span>
          <span className="text-[10px] font-mono text-zinc-500 truncate hidden md:inline">
            {result.base.label} → {result.next.label}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-2.5 h-7 rounded-md text-[11px] font-medium transition-colors ${
                mode === m.id
                  ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
                  : 'text-zinc-400 hover:text-white border border-transparent hover:bg-[#161616]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panes + change list */}
      <div className="flex-1 min-h-0 flex gap-2 p-2">
        <DiffPane title={result.base.label} snapshot={result.base.snapshot} diff={diff} side="base" />
        <DiffPane title={result.next.label} snapshot={result.next.snapshot} diff={diff} side="next" />
        <div className="w-64 shrink-0 border border-[#1a1a1a] rounded-xl bg-[#080808] flex flex-col overflow-hidden">
          <div className="h-8 px-3 flex items-center justify-between bg-[#0a0a0a] border-b border-[#1a1a1a]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Changes</span>
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className="text-emerald-300">+{diff.counts.ADDED}</span>
              <span className="text-rose-300">−{diff.counts.REMOVED}</span>
              <span className="text-amber-300">~{diff.counts.MODIFIED}</span>
              <span className="text-sky-300">↔{diff.counts.MOVED}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {items.length === 0 ? (
              <p className="text-[11px] text-zinc-600 px-2 py-3">No {mode !== 'all' ? mode : ''} changes.</p>
            ) : (
              items.map((item, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1.5 rounded-md bg-[#0e0e0e] border border-[#1a1a1a] flex items-start gap-2"
                >
                  <span
                    className={`shrink-0 mt-0.5 text-xs font-mono w-3 text-center ${
                      item.changeType === 'ADDED'
                        ? 'text-emerald-300'
                        : item.changeType === 'REMOVED'
                          ? 'text-rose-300'
                          : item.changeType === 'MOVED'
                            ? 'text-sky-300'
                            : 'text-amber-300'
                    }`}
                  >
                    {item.changeType === 'ADDED' ? '+' : item.changeType === 'REMOVED' ? '−' : item.changeType === 'MOVED' ? '↔' : '~'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-200 truncate">{item.targetLabel}</span>
                      <span className="text-[8px] font-mono uppercase text-zinc-600 shrink-0">
                        {item.targetType}
                      </span>
                    </div>
                    {renderChangeDetail(item)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderChangeDetail(item: DiffItem): React.ReactNode {
  const d = item.detail || {};
  if (item.changeType === 'MOVED') {
    return (
      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
        ({Math.round((d.movedFrom as any)?.x ?? 0)}, {Math.round((d.movedFrom as any)?.y ?? 0)}) → (
        {Math.round((d.movedTo as any)?.x ?? 0)}, {Math.round((d.movedTo as any)?.y ?? 0)})
      </div>
    );
  }
  if (item.changeType === 'MODIFIED' && Array.isArray(d.fields)) {
    const fields: string[] = d.fields;
    let fromTo: React.ReactNode = null;
    const first = fields.find((f) => f !== 'data' && f !== 'sourceRef');
    if (first) {
      fromTo = (
        <span className="text-zinc-500">
          {String(d[`${first}From`] ?? '').substring(0, 40)}
          {d[`${first}To`] !== undefined && (
            <>
              {' → '}
              <span className="text-zinc-300">{String(d[`${first}To`] ?? '').substring(0, 40)}</span>
            </>
          )}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
        <span className="text-[9px] font-mono text-zinc-600 uppercase shrink-0">{fields.join(', ')}</span>
        {fromTo && <span className="text-[10px] truncate">{fromTo}</span>}
        {d.movedTo && (
          <span className="text-[9px] font-mono text-sky-400/70 shrink-0">+ moved</span>
        )}
      </div>
    );
  }
  if (item.targetType === 'EDGE' && d.source) {
    return (
      <div className="text-[10px] font-mono text-zinc-500 mt-0.5 truncate">
        {String(d.source)} → {String(d.target)}
      </div>
    );
  }
  return null;
}
