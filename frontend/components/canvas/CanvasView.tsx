'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ChevronRight,
  Search,
  Grid3x3,
  Loader2,
  AlertTriangle,
  Copy,
  Trash2,
  Plus,
  MoreHorizontal,
  Sparkles,
  FileText,
  Box,
  Workflow,
  Type as TypeIcon,
  CheckSquare,
  ImageUp,
  History,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useWorkspaceStore } from '../../lib/store';
import {
  useCanvasStore,
  newId,
  type PageSyncPayload,
} from '../../lib/canvas-store';
import type {
  CanvasEdgeRow,
  CanvasNodeRow,
  CanvasNodeType,
  CanvasSnapshot,
  NodeLockInfo,
  PresenceMember,
  RemotePageStatePayload,
} from '../../lib/canvas-types';
import { canvasNodeTypes, NODE_DEFAULT_SIZES } from './nodes';
import { CanvasNodeContext, type CanvasNodeActions } from './nodes/node-context';
import CanvasToolbar, { setDragPayload, getDragPayload } from './CanvasToolbar';
import CursorsOverlay from './CursorsOverlay';
import NodeLockOverlay from './NodeLockOverlay';
import { FLOW_TEMPLATES, FLOW_SLOT } from './flowchart-templates';
import VersionControlPanel from './VersionControlPanel';
import VersionDiffView from './VersionDiffView';

// ─── Row ↔ React Flow node mapping ───────────────────────────────────────────

/** Window event asking the VC panel to open the save-version modal. */
const OPEN_SAVE_VERSION_EVENT = 'friday:open-save-version';

/** Cursor broadcast throttle — ~25 Hz is smooth enough and keeps the wire quiet. */
const CURSOR_INTERVAL_MS = 40;

function openSaveVersionModal() {
  window.dispatchEvent(new CustomEvent(OPEN_SAVE_VERSION_EVENT));
}

function rowToNode(row: CanvasNodeRow): Node {
  return {
    id: row.id,
    type: row.type,
    position: { x: row.x, y: row.y },
    data: {
      ...(row.data || {}),
      title: row.title,
      source: row.sourceRef ?? undefined,
      _minHeight: row.height,
      _width: row.width,
    },
    style: { width: row.width },
    width: row.width,
  };
}

function nodeToRow(n: Node, pageId: string, bandId: string): CanvasNodeRow {
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(n.data || {})) {
    if (!k.startsWith('_')) data[k] = v;
  }
  return {
    id: n.id,
    bandId,
    pageId,
    type: n.type as CanvasNodeType,
    title: (n.data?.title as string) || '',
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
    width: Math.round(n.width || (n.data?._width as number) || 280),
    height: Math.round(n.data?._minHeight as number || n.height || 160),
    rotation: 0,
    zIndex: 0,
    data,
    sourceRef: (n.data?.source as Record<string, any>) ?? null,
  };
}

function edgeToRow(e: Edge, pageId: string, bandId: string): CanvasEdgeRow {
  return {
    id: e.id,
    bandId,
    pageId,
    source: e.source,
    target: e.target,
    label: (e.label as string) || null,
    relation: (e.data?.relation as string) || null,
    data: (e.data as Record<string, any>) || {},
  };
}

/** Canvas edge row → React Flow edge (shared by load, remote sync and merge). */
function rowToEdge(e: {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  relation?: string | null;
  data?: Record<string, any> | null;
}): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    animated: false,
    style: { stroke: '#52525b', strokeWidth: 1.5 },
    markerEnd: { type: 'arrowclosed' as any, width: 16, height: 16, color: '#71717a' },
    data: { relation: e.relation ?? null },
  };
}

// ─── CanvasView ──────────────────────────────────────────────────────────────

export default function CanvasView() {
  return (
    <ReactFlowProvider>
      <CanvasViewInner />
    </ReactFlowProvider>
  );
}

function CanvasViewInner() {
  const { activeBand, user } = useWorkspaceStore();
  const bandId = activeBand?.id;

  const {
    canvas,
    activePageId,
    loading,
    loadError,
    loadCanvas,
    selectPage,
    createPage,
    markDirty,
    clearSaveError,
    dirty,
    saveError,
    presence,
    setPresence,
    nodeLocks,
    setNodeLocks,
    vcOpen,
    setVcOpen,
    loadVersions,
    dataVersion,
  } = useCanvasStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlow = useReactFlow();

  const [snapOn, setSnapOn] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashActive, setTrashActive] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [archModalOpen, setArchModalOpen] = useState(false);
  const [moreMenuFor, setMoreMenuFor] = useState<string | null>(null);
  const [pageModalOpen, setPageModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const preDragRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const historyRef = useRef<{ past: Array<{ nodes: Node[]; edges: Edge[] }>; future: Array<{ nodes: Node[]; edges: Edge[] }> }>({ past: [], future: [] });
  const editWindowRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const activePageIdRef = useRef<string | null>(activePageId);
  /**
   * IDs of nodes/edges I have modified since my last successful save. When a
   * teammate's page-state broadcast arrives, these entries win over the
   * remote version (per-node last-write-wins); everything else takes the
   * remote value. Cleared on every successful save.
   */
  const dirtyIdsRef = useRef<Set<string>>(new Set());
  const markDirtyIds = useCallback((ids: Iterable<string>) => {
    for (const id of ids) dirtyIdsRef.current.add(id);
  }, []);

  // Keep refs current for use inside debounced save callbacks
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    activePageIdRef.current = activePageId;
    dirtyRef.current = dirty;
  }, [nodes, edges, activePageId, dirty]);

  const activePage = useMemo(
    () => canvas?.pages.find((p) => p.id === activePageId) ?? null,
    [canvas, activePageId],
  );

  const pageTrail = useMemo(() => {
    if (!canvas) return [];
    const trail: Array<{ id: string; name: string }> = [];
    let cur = activePage;
    while (cur && trail.length < 8) {
      trail.unshift({ id: cur.id, name: cur.name });
      cur = canvas.pages.find((p) => p.id === cur?.parentPageId) ?? null;
    }
    return trail;
  }, [canvas, activePage]);

  // ── Load canvas on band change ────────────────────────────────────────────
  useEffect(() => {
    if (!bandId) return;
    loadCanvas(bandId);
  }, [bandId]);

  // ── Sync store rows → React Flow state (on page change or remote reload) ──
  useEffect(() => {
    if (!canvas || !activePageId) return;
    // Skip while local unsaved edits are pending — my working state wins until
    // it's saved. Remote updates arriving mid-edit are merged explicitly in
    // applyRemotePageState, so nothing is clobbered here.
    if (dirtyRef.current) return;
    const pageNodes = canvas.nodes.filter((n) => n.pageId === activePageId).map(rowToNode);
    const pageEdges = canvas.edges
      .filter((e) => e.pageId === activePageId)
      .map((e) => rowToEdge(e));
    setNodes(pageNodes);
    setEdges(pageEdges);
    dirtyRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, activePageId, dataVersion]);

  // Fit view when switching pages
  useEffect(() => {
    if (!activePageId) return;
    const t = setTimeout(() => reactFlow.fitView({ padding: 0.15, duration: 200 }), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  // ── Autosave (debounced batched sync — never per mouse move) ─────────────
  const scheduleSave = useCallback(() => {
    markDirty();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const pid = activePageIdRef.current;
      const bid = bandId;
      if (!pid || !bid) return;
      const payload: PageSyncPayload = {
        nodes: nodesRef.current.map((n) => nodeToRow(n, pid, bid)),
        edges: edgesRef.current.map((e) => edgeToRow(e, pid, bid)),
      };
      const saved = await useCanvasStore.getState().syncPage(bid, pid, payload);
      if (saved) dirtyIdsRef.current.clear();
    }, 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandId]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pid = activePageIdRef.current;
    if (!pid || !bandId) return;
    if (!dirtyRef.current) return;
    const payload: PageSyncPayload = {
      nodes: nodesRef.current.map((n) => nodeToRow(n, pid, bandId)),
      edges: edgesRef.current.map((e) => edgeToRow(e, pid, bandId)),
    };
    const saved = await useCanvasStore.getState().syncPage(bandId, pid, payload);
    if (saved) dirtyIdsRef.current.clear();
  }, [bandId]);

  // ── Live cursor broadcasting (throttled to ~25 Hz) ────────────────────────
  const cursorThrottleRef = useRef<{ last: number; timer: ReturnType<typeof setTimeout> | null }>({
    last: 0,
    timer: null,
  });
  const latestCursorRef = useRef<{ x: number; y: number } | null>(null);

  const sendCursor = useCallback(
    (x: number | null, y: number | null) => {
      const bid = bandId;
      const pid = activePageIdRef.current;
      if (!bid || !pid) return;
      const socket = getSocket();
      if (!socket.connected) return;
      socket.emit('canvas:cursor', { bandId: bid, pageId: pid, x, y });
    },
    [bandId],
  );

  const sendCursorThrottled = useCallback(
    (x: number, y: number) => {
      const t = cursorThrottleRef.current;
      latestCursorRef.current = { x, y };
      const elapsed = performance.now() - t.last;
      if (elapsed >= CURSOR_INTERVAL_MS) {
        t.last = performance.now();
        sendCursor(x, y);
        return;
      }
      if (!t.timer) {
        // Trailing-edge emit so the cursor doesn't stutter between bursts.
        t.timer = setTimeout(() => {
          t.timer = null;
          t.last = performance.now();
          const p = latestCursorRef.current;
          if (p) sendCursor(p.x, p.y);
        }, CURSOR_INTERVAL_MS - elapsed);
      }
    },
    [sendCursor],
  );

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const point = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      sendCursorThrottled(point.x, point.y);
    },
    [reactFlow, sendCursorThrottled],
  );

  const hideCursor = useCallback(() => {
    const t = cursorThrottleRef.current;
    if (t.timer) {
      clearTimeout(t.timer);
      t.timer = null;
    }
    latestCursorRef.current = null;
    sendCursor(null, null);
  }, [sendCursor]);

  // ── Soft node-edit lock (Figma-style) ─────────────────────────────────────
  /** The node this tab currently has focused for editing (null when none). */
  const myLockRef = useRef<string | null>(null);

  const emitNodeLock = useCallback(
    (nodeId: string, acquire: boolean) => {
      const bid = bandId;
      if (!bid) return;
      const socket = getSocket();
      if (!socket.connected) return;
      socket.emit('canvas:node-lock', { bandId: bid, nodeId, acquire });
    },
    [bandId],
  );

  const lockNode = useCallback(
    (nodeId: string) => {
      if (myLockRef.current === nodeId) return;
      myLockRef.current = nodeId;
      emitNodeLock(nodeId, true);
    },
    [emitNodeLock],
  );

  const unlockNode = useCallback(
    (nodeId: string) => {
      if (myLockRef.current !== nodeId) return;
      myLockRef.current = null;
      emitNodeLock(nodeId, false);
    },
    [emitNodeLock],
  );

  // Release my lock if this tab unmounts while editing.
  useEffect(() => {
    return () => {
      if (myLockRef.current) emitNodeLock(myLockRef.current, false);
    };
  }, [emitNodeLock]);

  // Acquire the lock when focus lands inside a node (typing into its title,
  // body, or any field) and release it when focus leaves that node. Delegated
  // on the viewport container, so every node type is covered without changes.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const nodeOf = (target: EventTarget | null): string | null =>
      target instanceof Element
        ? target.closest('.react-flow__node')?.getAttribute('data-id') ?? null
        : null;

    const onFocusIn = (e: FocusEvent) => {
      const nodeId = nodeOf(e.target);
      if (nodeId) lockNode(nodeId);
    };
    const onFocusOut = (e: FocusEvent) => {
      const fromNode = nodeOf(e.target);
      if (!fromNode) return;
      if (nodeOf(e.relatedTarget) !== fromNode) unlockNode(fromNode);
    };

    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    return () => {
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
    };
  }, [lockNode, unlockNode]);

  // If a teammate wins a click race for the node I'm focused in, lose
  // gracefully: drop my (server-rejected) claim and blur the input.
  useEffect(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    const nodeId = active.closest('.react-flow__node')?.getAttribute('data-id');
    if (!nodeId) return;
    const lock = nodeLocks.find((l) => l.nodeId === nodeId);
    if (lock && lock.userId !== user?.id) {
      if (myLockRef.current === nodeId) {
        myLockRef.current = null;
        emitNodeLock(nodeId, false);
      }
      active.blur();
    }
  }, [nodeLocks, user?.id, emitNodeLock]);

  // ── Remote state application (realtime sync from teammates) ───────────────
  /**
   * Applies a page-state broadcast from a teammate without a page refresh.
   * Nodes/edges I modified since my last save (dirtyIdsRef) win over the
   * remote version — per-node last-write-wins — while everything else takes
   * the remote value, so concurrent edits on different nodes both survive.
   * The merged result is rendered immediately and written to the store rows
   * so the next autosave persists it.
   */
  const applyRemotePageState = useCallback(
    (payload: RemotePageStatePayload) => {
      if (!bandId) return;
      if (payload.updatedBy === user?.id) return; // echo of my own autosave
      const pid = payload.pageId;

      // Non-active pages: keep their in-memory rows fresh (no render needed).
      if (pid !== activePageIdRef.current) {
        useCanvasStore.getState().updatePageRows(pid, payload.nodes, payload.edges);
        return;
      }

      const dirtyIds = dirtyIdsRef.current;
      const localNodes = nodesRef.current;
      const localEdges = edgesRef.current;
      const localNodeById = new Map(localNodes.map((n) => [n.id, n]));
      const localEdgeById = new Map(localEdges.map((e) => [e.id, e]));
      const remoteNodeIds = new Set(payload.nodes.map((r) => r.id));
      const remoteEdgeIds = new Set(payload.edges.map((r) => r.id));

      const mergedNodes: CanvasNodeRow[] = [];
      for (const row of payload.nodes) {
        if (dirtyIds.has(row.id)) {
          const local = localNodeById.get(row.id);
          if (local) mergedNodes.push(nodeToRow(local, pid, bandId));
          // absent locally → I deleted it; keep it deleted
        } else {
          mergedNodes.push(row);
        }
      }
      for (const n of localNodes) {
        // Added locally, not saved yet, so not in the remote payload.
        if (dirtyIds.has(n.id) && !remoteNodeIds.has(n.id)) mergedNodes.push(nodeToRow(n, pid, bandId));
      }

      const mergedEdges: CanvasEdgeRow[] = [];
      for (const row of payload.edges) {
        if (dirtyIds.has(row.id)) {
          const local = localEdgeById.get(row.id);
          if (local) mergedEdges.push(edgeToRow(local, pid, bandId));
        } else {
          mergedEdges.push(row);
        }
      }
      for (const e of localEdges) {
        if (dirtyIds.has(e.id) && !remoteEdgeIds.has(e.id)) mergedEdges.push(edgeToRow(e, pid, bandId));
      }

      setNodes(mergedNodes.map(rowToNode));
      setEdges(mergedEdges.map((row) => rowToEdge(row)));
      useCanvasStore.getState().updatePageRows(pid, mergedNodes, mergedEdges);
    },
    [bandId, user?.id, setNodes, setEdges],
  );

  // Flush pending changes and hide my cursor when the component unmounts
  useEffect(() => {
    return () => {
      hideCursor();
      flushSave();
    };
  }, [hideCursor, flushSave]);

  // ── History (undo/redo) ────────────────────────────────────────────────────
  const pushHistory = useCallback((snapshot?: { nodes: Node[]; edges: Edge[] }) => {
    const snap = snapshot ?? { nodes: nodesRef.current, edges: edgesRef.current };
    historyRef.current.past.push(snap);
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.past.pop();
    if (!prev) return;
    historyRef.current.future.push({ nodes: nodesRef.current, edges: edgesRef.current });
    dirtyIdsRef.current = new Set([
      ...prev.nodes.map((n) => n.id),
      ...prev.edges.map((e) => e.id),
    ]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    scheduleSave();
  }, [setNodes, setEdges, scheduleSave]);

  const redo = useCallback(() => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push({ nodes: nodesRef.current, edges: edgesRef.current });
    dirtyIdsRef.current = new Set([
      ...next.nodes.map((n) => n.id),
      ...next.edges.map((e) => e.id),
    ]);
    setNodes(next.nodes);
    setEdges(next.edges);
    scheduleSave();
  }, [setNodes, setEdges, scheduleSave]);

  // ── Node/edge mutations ────────────────────────────────────────────────────
  const wrappedOnNodesChange: OnNodesChange<Node> = useCallback(
    (changes) => {
      onNodesChange(changes);
      const meaningful = changes.filter((c) =>
        ['position', 'dimensions', 'remove', 'add'].includes(c.type),
      );
      if (meaningful.length > 0) {
        markDirtyIds(meaningful.map((c) => (c.type === 'add' ? c.item.id : c.id)));
        scheduleSave();
      }
    },
    [onNodesChange, scheduleSave, markDirtyIds],
  );

  const wrappedOnEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      const meaningful = changes.filter((c) =>
        ['remove', 'add', 'replace'].includes(c.type),
      );
      if (meaningful.length > 0) {
        markDirtyIds(meaningful.map((c) => (c.type === 'add' ? c.item.id : c.id)));
        scheduleSave();
      }
    },
    [onEdgesChange, scheduleSave, markDirtyIds],
  );

  const updateNodeData = useCallback(
    (id: string, data: Record<string, any>) => {
      const now = Date.now();
      if (now - editWindowRef.current > 600) {
        pushHistory();
        editWindowRef.current = now;
      }
      markDirtyIds([id]);
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)));
      scheduleSave();
    },
    [setNodes, scheduleSave, pushHistory, markDirtyIds],
  );

  const deleteSelected = useCallback(() => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    pushHistory();
    markDirtyIds([...selectedNodes.map((n) => n.id), ...selectedEdges.map((e) => e.id)]);
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) =>
      eds.filter((e) => {
        if (e.selected) return false;
        const selIds = new Set(selectedNodes.map((n) => n.id));
        return !selIds.has(e.source) && !selIds.has(e.target);
      }),
    );
    scheduleSave();
  }, [setNodes, setEdges, scheduleSave, pushHistory, markDirtyIds]);

  const duplicateSelected = useCallback(() => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    pushHistory();
    const idMap = new Map<string, string>();
    const clones: Node[] = selectedNodes.map((n) => {
      const nid = newId(n.id.startsWith('f') ? 'f' : 'n');
      idMap.set(n.id, nid);
      return {
        ...n,
        id: nid,
        position: { x: n.position.x + 28, y: n.position.y + 28 },
        selected: false,
        data: { ...n.data },
      };
    });
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    const cloneEdges: Edge[] = [
      ...selectedEdges,
      ...edgesRef.current.filter((e) => {
        const selIds = new Set(selectedNodes.map((n) => n.id));
        return selIds.has(e.source) && selIds.has(e.target);
      }),
    ];
    const newEdges = cloneEdges.map((e) => ({
      ...e,
      id: newId('e'),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
      selected: false,
    }));
    markDirtyIds([...clones.map((n) => n.id), ...newEdges.map((e) => e.id)]);
    setNodes((nds) => [...nds, ...clones]);
    setEdges((eds) => [...eds, ...newEdges]);
    scheduleSave();
  }, [setNodes, setEdges, scheduleSave, pushHistory, markDirtyIds]);

  // ── Node creation ──────────────────────────────────────────────────────────
  const createNodeAt = useCallback(
    (type: CanvasNodeType, position: { x: number; y: number }, extraData?: Record<string, any>) => {
      const size = NODE_DEFAULT_SIZES[type] || { width: 280, height: 160 };
      const node: Node = {
        id: newId('n'),
        type,
        position,
        data: {
          title:
            type === 'CHECKLIST' ? 'Tasks' : type === 'PRD' ? 'Product Requirements' : '',
          ...(type === 'CHECKLIST' ? { items: [] } : {}),
          ...(type === 'PRD' ? { description: '', sections: [], status: 'idle' } : {}),
          ...(type === 'GEMINI' ? { question: '', answer: '', status: 'idle' } : {}),
          ...(type === 'IMAGE' ? {} : {}),
          ...(type === 'TEXT' ? { body: '' } : {}),
          ...extraData,
        },
        width: size.width,
        selected: true,
      };
      pushHistory();
      markDirtyIds([node.id]);
      setNodes((nds) => [...nds, node]);
      scheduleSave();
      return node;
    },
    [setNodes, scheduleSave, pushHistory, markDirtyIds],
  );

  const viewportCenter = useCallback(
    (): { x: number; y: number } => {
      const vp = reactFlow.getViewport();
      return { x: -vp.x / vp.zoom, y: -vp.y / vp.zoom };
    },
    [reactFlow],
  );

  const createAtCenter = useCallback(
    (type: CanvasNodeType) => {
      const center = viewportCenter();
      createNodeAt(type, { x: center.x - 140, y: center.y - 80 });
    },
    [viewportCenter, createNodeAt],
  );

  const placeTemplate = useCallback(
    (templateId: string, at?: { x: number; y: number }) => {
      const tpl = FLOW_TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;
      const origin = at ?? viewportCenter();
      pushHistory();
      const idMap = new Map<string, string>();
      const newNodes: Node[] = tpl.nodes.map((tn) => {
        const nid = newId('f');
        idMap.set(tn.key, nid);
        return {
          id: nid,
          type: 'FLOW',
          position: {
            x: origin.x + tn.gx * FLOW_SLOT.x,
            y: origin.y + tn.gy * FLOW_SLOT.y,
          },
          data: { title: tn.title, shape: tn.shape, template: tpl.id },
          width: 220,
          selected: false,
        };
      });
      const newEdges: Edge[] = tpl.edges.map((te) => ({
        id: newId('e'),
        source: idMap.get(te.from)!,
        target: idMap.get(te.to)!,
        label: te.label,
        style: { stroke: '#2dd4bf', strokeWidth: 1.5 },
        markerEnd: { type: 'arrowclosed' as any, width: 16, height: 16, color: '#2dd4bf' },
        data: { relation: 'leads_to', template: tpl.id },
      }));
      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
      markDirtyIds([...newNodes.map((n) => n.id), ...newEdges.map((e) => e.id)]);
      scheduleSave();
    },
    [viewportCenter, setNodes, setEdges, scheduleSave, pushHistory, markDirtyIds],
  );

  // ── DnD from toolbar ───────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const payload = getDragPayload(e);
      if (!payload) return;
      const position = reactFlow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (payload.kind === 'node') {
        createNodeAt(payload.type as CanvasNodeType, position);
      } else if (payload.kind === 'template') {
        placeTemplate(payload.id, { x: position.x - 120, y: position.y - 60 });
      }
    },
    [reactFlow, createNodeAt, placeTemplate],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // ── Trash drop zone (pointer tracking during node drag) ───────────────────
  const trashDragIdsRef = useRef<Set<string>>(new Set());

  const handleNodeDrag = useCallback((e: MouseEvent | TouchEvent) => {
    const rect = trashRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = 'clientX' in e ? e : (e.changedTouches?.[0] ?? { clientX: 0, clientY: 0 });
    const over =
      point.clientX >= rect.left - 12 &&
      point.clientX <= rect.right + 12 &&
      point.clientY >= rect.top - 12 &&
      point.clientY <= rect.bottom + 12;
    setTrashActive(over);
    if (over) {
      for (const n of nodesRef.current) {
        if (n.selected) trashDragIdsRef.current.add(n.id);
      }
    }
  }, []);

  const handleNodeDragStop = useCallback(
    (_e: MouseEvent | TouchEvent, node: Node) => {
      preDragRef.current = null;
      setTrashActive(false);
      if (trashDragIdsRef.current.has(node.id)) {
        const draggedIds = trashDragIdsRef.current;
        trashDragIdsRef.current = new Set();
        if (draggedIds.size > 0) {
          pushHistory();
          markDirtyIds([...draggedIds]);
          setNodes((nds) => nds.filter((n) => !draggedIds.has(n.id)));
          setEdges((eds) =>
            eds.filter((ed) => !draggedIds.has(ed.source) && !draggedIds.has(ed.target)),
          );
          scheduleSave();
        }
      } else {
        trashDragIdsRef.current = new Set();
      }
    },
    [setNodes, setEdges, scheduleSave, pushHistory, markDirtyIds],
  );

  const handleNodeDragStart = useCallback((_e: MouseEvent | TouchEvent, _node: Node) => {
    preDragRef.current = { nodes: nodesRef.current, edges: edgesRef.current };
    trashDragIdsRef.current = new Set();
    setTrashActive(false);
  }, []);

  // ── Connections ────────────────────────────────────────────────────────────
  const handleConnect = useCallback(
    (conn: Connection) => {
      pushHistory();
      const edgeId = newId('e');
      markDirtyIds([edgeId]);
      setEdges((eds) => [
        ...eds,
        {
          id: edgeId,
          source: conn.source!,
          target: conn.target!,
          style: { stroke: '#52525b', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed' as any, width: 16, height: 16, color: '#71717a' },
          data: { relation: 'leads_to' },
        },
      ]);
      scheduleSave();
    },
    [setEdges, scheduleSave, pushHistory, markDirtyIds],
  );

  const handleNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (connecting) {
        const source = nodesRef.current.find((n) => n.selected)?.id;
        if (source && source !== node.id) {
          handleConnect({ source, target: node.id, sourceHandle: null, targetHandle: null });
          setConnecting(false);
        }
      }
    },
    [connecting, handleConnect],
  );

  // ── Page navigation ────────────────────────────────────────────────────────
  const navigateToPage = useCallback(
    async (pageId: string) => {
      if (pageId === activePageIdRef.current) return;
      await flushSave();
      selectPage(pageId);
    },
    [flushSave, selectPage],
  );

  const handlePageCreate = useCallback(
    async (name: string, description: string, asChild: boolean) => {
      if (!bandId) return;
      const page = await createPage(bandId, {
        name,
        description: description || undefined,
        parentPageId: asChild ? activePageIdRef.current ?? undefined : undefined,
      });
      if (asChild && activePageIdRef.current) {
        // Also drop a page-link node on the parent canvas
        const center = viewportCenter();
        createNodeAt('PAGE_LINK', { x: center.x - 120, y: center.y - 32 }, {
          targetPageId: page.id,
          targetPageName: page.name,
        });
      }
      setPageModalOpen(false);
      navigateToPage(page.id);
    },
    [bandId, createPage, viewportCenter, createNodeAt, navigateToPage],
  );

  // ── Canvas search ──────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return nodes
      .filter((n) => {
        const d = n.data as any;
        const haystack = [
          n.data?.title,
          d?.body,
          d?.description,
          d?.question,
          d?.answer,
          d?.technology,
          Array.isArray(d?.items) ? d.items.map((i: any) => i?.text).join(' ') : '',
          Array.isArray(d?.sections)
            ? d.sections.map((s: any) => `${s?.title} ${s?.items?.join(' ')}`).join(' ')
            : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [search, nodes]);

  const jumpToNode = useCallback(
    (nodeId: string) => {
      const n = nodesRef.current.find((x) => x.id === nodeId);
      if (!n) return;
      reactFlow.setCenter(n.position.x + 140, n.position.y + 80, { zoom: 1, duration: 400 });
      setNodes((nds) => nds.map((x) => ({ ...x, selected: x.id === nodeId })));
      setSearchOpen(false);
      setSearch('');
    },
    [reactFlow, setNodes],
  );

  // ── AI actions (node context) ─────────────────────────────────────────────
  const askGeminiForNode = useCallback(
    async (nodeId: string, question: string) => {
      if (!bandId) return;
      const n = nodesRef.current.find((x) => x.id === nodeId);
      if (!n) return;
      updateNodeData(nodeId, { status: 'loading', error: undefined });
      try {
        const res = await api.post<{ answer: string }>(`/ai/bands/${bandId}/ask`, {
          question,
          context: {
            bandName: activeBand?.name,
            pageName: activePage?.name,
            selectedNode: {
              title: (n.data?.title as string) || '',
              type: n.type,
              body:
                (n.data?.body as string) ||
                (n.data?.description as string) ||
                (n.data?.question as string) ||
                '',
            },
          },
        });
        updateNodeData(nodeId, { answer: res.answer, status: 'idle' });
      } catch (err: any) {
        updateNodeData(nodeId, { status: 'error', error: err?.message || 'AI unavailable' });
      }
    },
    [bandId, activeBand, activePage, updateNodeData],
  );

  const generatePrdForNode = useCallback(
    async (nodeId: string, description: string) => {
      if (!bandId) return;
      updateNodeData(nodeId, { status: 'loading', error: undefined });
      try {
        const res = await api.post<{
          title: string;
          problem: string;
          sections: Array<{ title: string; items: string[] }>;
        }>(`/ai/bands/${bandId}/generate-prd`, { description });
        updateNodeData(nodeId, {
          sections: res.sections.map((s) => ({
            id: newId('s'),
            title: s.title,
            items: s.items,
          })),
          status: 'idle',
        });
      } catch (err: any) {
        updateNodeData(nodeId, { status: 'error', error: err?.message || 'PRD generation failed' });
      }
    },
    [bandId, updateNodeData],
  );

  const uploadImageToNode = useCallback(
    async (nodeId: string, file: File) => {
      if (file.size > 1.5 * 1024 * 1024) {
        updateNodeData(nodeId, { status: 'error', error: 'Image too large (max 1.5 MB)' });
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Capture aspect ratio for proportional resizing
      const ratio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalHeight / Math.max(1, img.naturalWidth));
        img.onerror = () => resolve(0.6);
        img.src = dataUrl;
      });
      updateNodeData(nodeId, {
        src: dataUrl,
        caption: file.name,
        _minHeight: 220,
        _ratio: ratio,
      });
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const w = n.width || 300;
          return { ...n, data: { ...n.data, _minHeight: Math.round(w * ratio), _ratio: ratio } };
        }),
      );
    },
    [updateNodeData, setNodes],
  );

  const nodeActions: CanvasNodeActions = useMemo(
    () => ({
      updateNodeData,
      openPage: (pageId) => navigateToPage(pageId),
      askGeminiForNode,
      generatePrdForNode,
      uploadImageToNode,
    }),
    [updateNodeData, navigateToPage, askGeminiForNode, generatePrdForNode, uploadImageToNode],
  );

  // ── Architecture generation ────────────────────────────────────────────────
  const handleGenerateArchitecture = useCallback(
    async (prdContent: string, mode: 'replace' | 'new') => {
      if (!bandId || !activePageId) return;
      setArchModalOpen(false);
      try {
        const res = await api.post<any>(`/ai/bands/${bandId}/generate-architecture-from-prd`, {
          content: prdContent,
        });
        const archNodes: Array<{
          nodeId: string;
          label: string;
          type: string;
          technology?: string;
          description?: string;
          positionX?: number;
          positionY?: number;
        }> = res?.nodes || [];
        const archEdges: Array<{ edgeId: string; source: string; target: string; label?: string }> =
          res?.edges || [];
        if (archNodes.length === 0) {
          alert('No architecture components were derived from this PRD. Add more detail and try again.');
          return;
        }

        if (mode === 'replace') {
          const clusterIds = new Set(
            nodesRef.current
              .map((n) => (n.data?.architectureClusterId as string) || '')
              .filter(Boolean),
          );
          const removeIds = new Set(
            nodesRef.current.filter((n) => clusterIds.has((n.data?.architectureClusterId as string) || '')).map((n) => n.id),
          );
          setNodes((nds) => nds.filter((n) => !removeIds.has(n.id)));
          setEdges((eds) => eds.filter((e) => !removeIds.has(e.source) && !removeIds.has(e.target)));
        }

        const center = viewportCenter();
        const positions = archNodes
          .map((n) => ({ x: n.positionX ?? 0, y: n.positionY ?? 0 }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
        const minX = positions.length ? Math.min(...positions.map((p) => p.x)) : 0;
        const minY = positions.length ? Math.min(...positions.map((p) => p.y)) : 0;

        const clusterId = newId('arch');
        const idMap = new Map<string, string>();
        const newNodes: Node[] = archNodes.map((n) => {
          const nid = newId('an');
          idMap.set(n.nodeId, nid);
          return {
            id: nid,
            type: 'ARCHITECTURE',
            position: {
              x: center.x + (n.positionX ?? 0) - minX,
              y: center.y + (n.positionY ?? 0) - minY,
            },
            data: {
              title: n.label,
              technology: n.technology || '',
              description: n.description || '',
              architectureClusterId: clusterId,
              source: { type: 'prd' },
            },
            width: 280,
            selected: false,
          };
        });
        const newEdges: Edge[] = archEdges
          .filter((e) => idMap.has(e.source) && idMap.has(e.target))
          .map((e) => ({
            id: newId('ae'),
            source: idMap.get(e.source)!,
            target: idMap.get(e.target)!,
            label: e.label,
            style: { stroke: '#a78bfa', strokeWidth: 1.5 },
            markerEnd: { type: 'arrowclosed' as any, width: 16, height: 16, color: '#a78bfa' },
            data: { relation: 'leads_to', architectureClusterId: clusterId },
          }));

        pushHistory();
        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
        scheduleSave();
      } catch (err: any) {
        alert(`Architecture generation failed: ${err.message}`);
      }
    },
    [bandId, activePageId, viewportCenter, setNodes, setEdges, scheduleSave, pushHistory],
  );

  const existingArchCluster = useMemo(() => {
    return nodes.some((n) => n.data?.architectureClusterId);
  }, [nodes]);

  // ── Socket: presence + remote sync ─────────────────────────────────────────
  useEffect(() => {
    const bid = bandId;
    if (!bid) return;
    const socket = getSocket();

    const onPresence = (data: { bandId: string; members: PresenceMember[] }) => {
      if (data.bandId === bid) setPresence(data.members || []);
    };
    const onNodeLocks = (data: { bandId: string; locks: NodeLockInfo[] }) => {
      if (data.bandId === bid) setNodeLocks(data.locks || []);
    };
    // A teammate's autosave lands here with the full page state — apply it
    // straight into the canvas (no REST re-fetch, no browser refresh).
    const onPageSynced = (data: RemotePageStatePayload) => {
      if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) {
        // Legacy payload without state — fall back to a refetch.
        if (data?.pageId === activePageIdRef.current && data?.updatedBy !== user?.id) loadCanvas(bid);
        return;
      }
      if (data.updatedBy === user?.id) return; // echo of my own save
      applyRemotePageState(data);
    };
    const onPageEvent = () => {
      loadCanvas(bid);
    };
    const onVersionSaved = () => {
      if (useCanvasStore.getState().vcOpen) loadVersions(bid);
    };
    const onRestored = (data: { restoredBy: string; snapshot?: CanvasSnapshot }) => {
      if (data.restoredBy === user?.id) return;
      void (async () => {
        // Persist my in-flight edits first so nothing is silently lost…
        if (dirtyRef.current) await flushSave();
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        // …then apply the restored snapshot straight from the event.
        if (data.snapshot) {
          dirtyRef.current = false;
          dirtyIdsRef.current.clear();
          const st = useCanvasStore.getState();
          st.applyCanvas({
            role: st.canvas?.role ?? 'MEMBER',
            pages: data.snapshot.pages.map((p) => ({
              ...p,
              bandId: bid,
              description: p.description ?? null,
              parentPageId: p.parentPageId ?? null,
            })),
            nodes: data.snapshot.nodes.map((n) => ({
              ...n,
              bandId: bid,
              sourceRef: n.sourceRef ?? null,
            })) as CanvasNodeRow[],
            edges: data.snapshot.edges.map((e) => ({ ...e, bandId: bid })) as CanvasEdgeRow[],
            drafts: st.canvas?.drafts ?? [],
            repository: st.canvas?.repository ?? null,
          });
        } else {
          loadCanvas(bid);
        }
      })();
      alert('The canvas was restored to a previous version by another crew member.');
    };

    socket.on('canvas:presence', onPresence);
    socket.on('canvas:node-locks', onNodeLocks);
    socket.on('canvas:page-state-synced', onPageSynced);
    socket.on('canvas:page-created', onPageEvent);
    socket.on('canvas:page-updated', onPageEvent);
    socket.on('canvas:page-deleted', onPageEvent);
    socket.on('canvas:version-saved', onVersionSaved);
    socket.on('canvas:restored', onRestored);
    socket.on('canvas:version-deleted', onVersionSaved);

    return () => {
      socket.off('canvas:presence', onPresence);
      socket.off('canvas:node-locks', onNodeLocks);
      socket.off('canvas:page-state-synced', onPageSynced);
      socket.off('canvas:page-created', onPageEvent);
      socket.off('canvas:page-updated', onPageEvent);
      socket.off('canvas:page-deleted', onPageEvent);
      socket.off('canvas:version-saved', onVersionSaved);
      socket.off('canvas:restored', onRestored);
      socket.off('canvas:version-deleted', onVersionSaved);
    };
  }, [bandId, user?.id, setPresence, setNodeLocks, loadCanvas, loadVersions, applyRemotePageState, flushSave]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || t.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        undo();
      } else if ((mod && e.key.toLowerCase() === 'z' && e.shiftKey) || (mod && e.key.toLowerCase() === 'y')) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        duplicateSelected();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setVcOpen(true);
        openSaveVersionModal();
      } else if (mod && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        setConnecting(false);
        setSearchOpen(false);
        setMoreMenuFor(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, duplicateSelected, deleteSelected, setVcOpen]);

  // ── Selection toolbar position ─────────────────────────────────────────────
  const selection = useMemo(() => {
    const selNodes = nodes.filter((n) => n.selected);
    if (selNodes.length === 0) return null;
    const xs = selNodes.map((n) => n.position.x);
    const ys = selNodes.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs.map((x, i) => x + (selNodes[i].width || 280)));
    const screen = reactFlow.flowToScreenPosition({ x: minX, y: minY });
    return {
      count: selNodes.length,
      left: screen.x,
      top: Math.max(44, screen.y - 40),
      width: maxX - minX,
    };
  }, [nodes, reactFlow]);

  // ── Node edit locks (soft, Figma-style) ────────────────────────────────────
  // Nodes a teammate is actively editing are inert for me: no clicking,
  // typing, or dragging. Purely a render-time style override — node state
  // (and thus autosave/merge) is untouched.
  const lockedByOther = useMemo(() => {
    const m = new Map<string, NodeLockInfo>();
    for (const l of nodeLocks) if (l.userId !== user?.id) m.set(l.nodeId, l);
    return m;
  }, [nodeLocks, user?.id]);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) =>
        lockedByOther.has(n.id)
          ? { ...n, style: { ...n.style, pointerEvents: 'none' as const } }
          : n,
      ),
    [nodes, lockedByOther],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!bandId) return null;

  return (
    <CanvasNodeContext.Provider value={nodeActions}>
    <div className="flex-1 flex min-w-0 h-full bg-black relative">
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Canvas top strip: breadcrumbs + search + tools */}
        <div className="h-9 border-b border-[#1a1a1a] bg-[#0a0a0a] px-3 flex items-center gap-2 select-none shrink-0 z-10">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 min-w-0 text-xs">
            <span className="text-zinc-500 font-semibold truncate">{activeBand?.name}</span>
            {pageTrail.map((p, i) => (
              <React.Fragment key={p.id}>
                <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />
                <button
                  onClick={() => navigateToPage(p.id)}
                  className={`truncate max-w-[140px] ${
                    i === pageTrail.length - 1
                      ? 'text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-3 hidden md:block">
            <div
              className={`flex items-center gap-2 h-7 rounded-lg bg-[#101010] border px-2.5 transition-all ${
                searchOpen ? 'w-64 border-zinc-500' : 'w-52 border-[#222222]'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                ref={searchInputRef}
                value={search}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search canvas…  ⌘K"
                className="flex-1 min-w-0 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
              />
            </div>
            {searchOpen && search.trim() && (
              <div className="absolute top-8 left-0 w-72 rounded-lg bg-[#101010] border border-[#262626] shadow-2xl overflow-hidden z-50">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-zinc-600">No nodes match “{search}”.</p>
                ) : (
                  searchResults.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => jumpToNode(n.id)}
                      className="w-full text-left px-3 py-2 hover:bg-[#181818] flex items-center justify-between gap-2 border-b border-[#161616] last:border-b-0"
                    >
                      <span className="text-xs text-zinc-200 truncate">
                        {(n.data?.title as string) || (n.data?.body as string)?.slice(0, 40) || 'Untitled'}
                      </span>
                      <span className="text-[9px] font-mono uppercase text-zinc-600 shrink-0">
                        {n.type}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Snap to grid toggle */}
            <button
              onClick={() => setSnapOn((v) => !v)}
              title={snapOn ? 'Disable snap to grid' : 'Snap to grid'}
              className={`p-1.5 rounded-md transition-colors ${
                snapOn ? 'text-violet-300 bg-violet-500/15' : 'text-zinc-500 hover:text-white hover:bg-[#161616]'
              }`}
            >
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>

            {/* Presence */}
            <div className="flex items-center -space-x-1.5 ml-1">
              {presence.slice(0, 6).map((m) => {
                const label = m.displayName || m.username;
                return (
                  <div
                    key={m.userId}
                    title={m.userId === user?.id ? `You (${label})` : label}
                    className="w-5 h-5 rounded-full border-2 border-[#0a0a0a] overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: m.color || '#262626' }}
                  >
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={label} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] font-bold text-white">
                        {label.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
              {presence.length > 6 && (
                <span className="text-[9px] text-zinc-400 pl-2">+{presence.length - 6}</span>
              )}
            </div>

            {/* VC toggle */}
            <button
              onClick={() => setVcOpen(!vcOpen)}
              title="Toggle Version Control"
              className={`p-1.5 rounded-md transition-colors ${
                vcOpen
                  ? 'text-violet-300 bg-violet-500/15'
                  : 'text-zinc-500 hover:text-white hover:bg-[#161616]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas viewport */}
        <div ref={viewportRef} className="flex-1 relative min-h-0">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={wrappedOnNodesChange}
            onEdgesChange={wrappedOnEdgesChange as any}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onNodeDrag={handleNodeDrag}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={hideCursor}
            onBeforeDelete={() => {
              pushHistory();
              return Promise.resolve(true);
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onPaneClick={() => {
              setConnecting(false);
              setMoreMenuFor(null);
            }}
            nodeTypes={canvasNodeTypes}
            minZoom={0.25}
            maxZoom={2}
            snapToGrid={snapOn}
            snapGrid={[16, 16]}
            connectionMode={connecting ? ConnectionMode.Loose : ConnectionMode.Strict}
            connectionRadius={30}
            selectionOnDrag
            panOnDrag
            panOnScroll={false}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
            className="bg-black"
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { stroke: '#52525b', strokeWidth: 1.5 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} color="#1c1c1c" gap={22} size={1.2} />
            <Controls
              className="!bg-[#101010] !border !border-[#262626] !text-zinc-300 [&>button]:!bg-[#101010] [&>button]:!border-b [&>button]:!border-[#262626] [&>button:hover]:!bg-[#1a1a1a]"
            />
            {nodes.length > 8 && (
              <MiniMap
                className="!bg-[#0a0a0a] !border !border-[#262626]"
                maskColor="rgba(0,0,0,0.7)"
                nodeColor="#3f3f46"
                pannable
                zoomable
              />
            )}
          </ReactFlow>

          {/* Live cursors of other crew members (color + profile pic) */}
          <CursorsOverlay bandId={bandId} activePageId={activePageId} />

          {/* Soft edit locks: who is currently editing which node */}
          <NodeLockOverlay nodes={nodes} locks={nodeLocks} myUserId={user?.id} />

          {/* Empty state */}
          {nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto p-8 rounded-2xl bg-[#0c0c0c]/95 border border-[#262626] max-w-md text-center space-y-4 shadow-2xl backdrop-blur-md">
                <div>
                  <h4 className="text-base font-bold text-white mb-1">Start building your product</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Drag anything onto the canvas to begin — or click a tool below.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <EmptyChip icon={<Sparkles className="w-3.5 h-3.5 text-violet-300" />} label="Ask Gemini" onClick={() => createAtCenter('GEMINI')} />
                  <EmptyChip icon={<FileText className="w-3.5 h-3.5 text-sky-300" />} label="PRD" onClick={() => createAtCenter('PRD')} />
                  <EmptyChip icon={<Box className="w-3.5 h-3.5 text-violet-300" />} label="Architecture" onClick={() => setArchModalOpen(true)} />
                  <EmptyChip icon={<Workflow className="w-3.5 h-3.5 text-teal-300" />} label="Flowchart" onClick={() => placeTemplate('user-journey')} />
                  <EmptyChip icon={<TypeIcon className="w-3.5 h-3.5" />} label="Text" onClick={() => createAtCenter('TEXT')} />
                  <EmptyChip icon={<CheckSquare className="w-3.5 h-3.5 text-amber-300" />} label="Todo" onClick={() => createAtCenter('CHECKLIST')} />
                  <EmptyChip icon={<ImageUp className="w-3.5 h-3.5" />} label="Image" onClick={() => createAtCenter('IMAGE')} />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPageModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 text-xs font-semibold border border-violet-500/30 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> New page
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading canvas…
              </div>
            </div>
          )}

          {/* Load error */}
          {loadError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{loadError}</span>
              <button onClick={() => loadCanvas(bandId)} className="underline hover:text-white">
                Retry
              </button>
            </div>
          )}

          {/* Save error toast */}
          {saveError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/70 border border-amber-800 text-xs text-amber-200 shadow-xl">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Couldn&apos;t save changes — your local working state is preserved.</span>
              <button
                onClick={() => {
                  clearSaveError();
                  flushSave();
                }}
                className="font-semibold underline hover:text-white"
              >
                Retry
              </button>
            </div>
          )}

          {/* Connecting hint */}
          {connecting && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-sky-950/70 border border-sky-800 text-xs text-sky-200">
              Click a target node to connect (Esc to cancel)
            </div>
          )}

          {/* Selection action toolbar */}
          {selection && !connecting && (
            <div
              className="absolute z-30 flex items-center gap-0.5 rounded-lg bg-[#0c0c0c]/95 backdrop-blur-md border border-[#2c2c2c] shadow-2xl px-1 py-0.5"
              style={{ left: selection.left, top: selection.top }}
            >
              <SelButton title="Duplicate (⌘D)" onClick={duplicateSelected}>
                <Copy className="w-3.5 h-3.5" />
              </SelButton>
              <SelButton title="Connect to another node" onClick={() => setConnecting(true)} active={connecting}>
                <Workflow className="w-3.5 h-3.5" />
              </SelButton>
              <SelButton title="Delete (⌫)" onClick={deleteSelected} danger>
                <Trash2 className="w-3.5 h-3.5" />
              </SelButton>
              <div className="relative">
                <SelButton title="More" onClick={() => setMoreMenuFor((v) => (v ? null : 'more'))}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </SelButton>
                {moreMenuFor === 'more' && (
                  <div className="absolute top-8 left-0 w-44 rounded-lg bg-[#101010] border border-[#2c2c2c] shadow-2xl overflow-hidden z-50">
                    <button
                      onClick={async () => {
                        setMoreMenuFor(null);
                        if (!bandId || !activePageId) return;
                        try {
                          const page = await createPage(bandId, {
                            name: `Page ${useCanvasStore.getState().canvas?.pages.length}`,
                            parentPageId: activePageId,
                          });
                          const sel = nodesRef.current.find((n) => n.selected);
                          createNodeAt(
                            'PAGE_LINK',
                            { x: (sel?.position.x ?? 100) + 40, y: (sel?.position.y ?? 100) + 120 },
                            { targetPageId: page.id, targetPageName: page.name },
                          );
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-[#181818] flex items-center gap-2"
                    >
                      <LayoutPanelIcon />
                      Link as page node
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuFor(null);
                        setVcOpen(true);
                        openSaveVersionModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-[#181818] flex items-center gap-2"
                    >
                      <SaveIcon />
                      Create version
                    </button>
                  </div>
                )}
              </div>
              {selection.count > 1 && (
                <span className="px-1.5 text-[9px] font-mono text-zinc-500">{selection.count} selected</span>
              )}
            </div>
          )}

          {/* Trash zone */}
          <div
            ref={trashRef}
            className={`absolute bottom-5 left-4 z-20 flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-xl border-2 border-dashed transition-all select-none ${
              trashActive
                ? 'border-rose-400 bg-rose-500/15 scale-110'
                : 'border-[#2a2a2a] bg-[#0c0c0c]/80'
            }`}
            title="Drag nodes here to delete (recoverable from version history)"
          >
            <Trash2 className={`w-5 h-5 ${trashActive ? 'text-rose-300' : 'text-zinc-600'}`} />
            {trashActive && <span className="text-[9px] font-mono text-rose-300">DROP</span>}
          </div>

          {/* Floating toolbar */}
          <CanvasToolbar
            onCreateAtCenter={createAtCenter}
            onGenerateArchitecture={() => setArchModalOpen(true)}
            onPlaceTemplate={(id) => placeTemplate(id)}
          />

          {/* Version diff overlay */}
          {compareVersionId && (
            <VersionDiffView
              bandId={bandId}
              versionId={compareVersionId}
              onClose={() => setCompareVersionId(null)}
            />
          )}
        </div>
      </div>

      {/* Version control panel */}
      <VersionControlPanel
        bandId={bandId}
        role={canvas?.role || 'VIEWER'}
        onCompare={(versionId) => setCompareVersionId(versionId)}
        onRestored={async () => {
          await loadCanvas(bandId);
          reactFlow.fitView({ padding: 0.15, duration: 300 });
        }}
      />

      {/* Architecture modal */}
      {archModalOpen && (
        <ArchitectureModal
          existingCluster={existingArchCluster}
          prdSeed={nodes
            .filter((n) => n.type === 'PRD')
            .map((n) => {
              const d = n.data as any;
              const sections = Array.isArray(d?.sections)
                ? d.sections.map((s: any) => `## ${s.title}\n${(s.items || []).map((i: string) => `- ${i}`).join('\n')}`).join('\n')
                : '';
              return `# ${(d?.title as string) || 'PRD'}\n${d?.description || ''}\n${sections}`;
            })
            .join('\n\n')}
          onCancel={() => setArchModalOpen(false)}
          onGenerate={(content, mode) => handleGenerateArchitecture(content, mode)}
        />
      )}

      {/* New page modal */}
      {pageModalOpen && (
        <NewPageModal
          defaultName={`Page ${useCanvasStore.getState().canvas?.pages.length}`}
          onCancel={() => setPageModalOpen(false)}
          onCreate={(name, description) => handlePageCreate(name, description, true)}
        />
      )}
    </div>
    </CanvasNodeContext.Provider>
  );
}

// ─── Small presentational helpers ─────────────────────────────────────────────

function EmptyChip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#1e1e1e] border border-[#262626] text-xs text-zinc-300 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function SelButton({
  children,
  title,
  onClick,
  danger,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-sky-500/20 text-sky-300'
          : danger
            ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'
            : 'text-zinc-400 hover:text-white hover:bg-[#1c1c1c]'
      }`}
    >
      {children}
    </button>
  );
}

function LayoutPanelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}

// ─── Architecture generation modal ────────────────────────────────────────────

function ArchitectureModal({
  existingCluster,
  prdSeed,
  onCancel,
  onGenerate,
}: {
  existingCluster: boolean;
  prdSeed: string;
  onCancel: () => void;
  onGenerate: (content: string, mode: 'replace' | 'new') => void;
}) {
  const [content, setContent] = useState(prdSeed);
  const [busy, setBusy] = useState(false);

  function generate(mode: 'replace' | 'new') {
    if (!content.trim()) {
      alert('Paste or enter some PRD content first.');
      return;
    }
    setBusy(true);
    onGenerate(content.trim(), mode);
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0e0e] border border-[#2c2c2c] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Box className="w-4 h-4 text-violet-300" /> Generate architecture
          </h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white text-xs">✕</button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Friday&apos;s Reasoning Engine derives a minimal, evidence-backed architecture graph from this
          PRD content. The result is placed on the canvas as connected nodes you can move and edit.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          placeholder="PRD content (auto-filled from PRD nodes on this page)…"
          className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-400/50 resize-none font-mono"
        />
        {existingCluster && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              This canvas already contains an architecture graph. Choose <strong>Replace</strong> to
              remove it first, or <strong>Create new</strong> to keep both.
            </span>
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white border border-[#222222]">
            Cancel
          </button>
          {existingCluster ? (
            <>
              <button
                disabled={busy}
                onClick={() => generate('new')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#161616] hover:bg-[#1e1e1e] text-zinc-200 border border-[#262626] disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create new'}
              </button>
              <button
                disabled={busy}
                onClick={() => generate('replace')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Replace
              </button>
            </>
          ) : (
            <button
              disabled={busy || !content.trim()}
              onClick={() => generate('new')}
              className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Generate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New page modal ───────────────────────────────────────────────────────────

function NewPageModal({
  defaultName,
  onCancel,
  onCreate,
}: {
  defaultName: string;
  onCancel: () => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');

  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0e0e] border border-[#2c2c2c] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">New canvas page</h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white text-xs">✕</button>
        </div>
        <p className="text-xs text-zinc-500">
          Pages are separate infinite canvases inside this Band. A link node is added to the current
          page so you can navigate back.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dashboard, Authentication"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onCreate(name.trim(), description.trim());
          }}
          className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50"
        />
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white border border-[#222222]">
            Cancel
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), description.trim())}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50"
          >
            Create page
          </button>
        </div>
      </div>
    </div>
  );
}
