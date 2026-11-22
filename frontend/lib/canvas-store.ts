import { create } from 'zustand';
import { api } from './api';
import type {
  CanvasEdgeRow,
  CanvasNodeRow,
  CanvasPageRow,
  CanvasStatePayload,
  CanvasVersionSummary,
  NodeLockInfo,
  PresenceMember,
} from './canvas-types';

export interface PageSyncPayload {
  nodes: Array<
    Pick<CanvasNodeRow, 'id' | 'type' | 'title' | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'zIndex' | 'data'> & {
      sourceRef?: Record<string, any> | null;
    }
  >;
  edges: Array<Pick<CanvasEdgeRow, 'id' | 'source' | 'target' | 'label' | 'relation' | 'data'>>;
  viewport?: { x: number; y: number; zoom: number };
}

interface CanvasState {
  canvas: CanvasStatePayload | null;
  activePageId: string | null;
  loading: boolean;
  loadError: string | null;

  // Draft persistence status (autosave vs. saved version — deliberately distinct)
  dirty: boolean;
  lastSavedAt: number | null;
  saveError: boolean;

  presence: PresenceMember[];
  /** Active node-edit locks (who is currently editing which node). */
  nodeLocks: NodeLockInfo[];
  vcOpen: boolean;
  versions: CanvasVersionSummary[];
  versionsLoading: boolean;
  /** Bumped every time canvas data is (re)loaded — drives remote-sync application. */
  dataVersion: number;

  loadCanvas: (bandId: string) => Promise<void>;
  applyCanvas: (payload: CanvasStatePayload) => void;
  selectPage: (pageId: string) => void;
  setActivePageIfLoaded: (pageId: string) => void;

  createPage: (bandId: string, input: { name: string; description?: string; parentPageId?: string }) => Promise<CanvasPageRow>;
  updatePage: (bandId: string, pageId: string, input: Partial<{ name: string; description: string; parentPageId: string | null; order: number }>) => Promise<void>;
  deletePage: (bandId: string, pageId: string) => Promise<void>;

  syncPage: (bandId: string, pageId: string, payload: PageSyncPayload) => Promise<boolean>;
  /**
   * Replaces the node/edge rows for a single page in the in-memory canvas
   * (used by realtime sync). Deliberately does NOT bump `dataVersion`, so it
   * never forces the store→React-Flow effect; the caller drives the render.
   */
  updatePageRows: (pageId: string, nodes: CanvasNodeRow[], edges: CanvasEdgeRow[]) => void;
  markDirty: () => void;
  clearSaveError: () => void;

  setPresence: (members: PresenceMember[]) => void;
  setNodeLocks: (locks: NodeLockInfo[]) => void;
  setVcOpen: (open: boolean) => void;
  loadVersions: (bandId: string, search?: string) => Promise<void>;
  refreshVersions: (bandId: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  canvas: null,
  activePageId: null,
  loading: false,
  loadError: null,

  dirty: false,
  lastSavedAt: null,
  saveError: false,

  presence: [],
  nodeLocks: [],
  vcOpen: false,
  versions: [],
  versionsLoading: false,
  dataVersion: 0,

  loadCanvas: async (bandId) => {
    set({ loading: true, loadError: null });
    try {
      const payload = await api.get<CanvasStatePayload>(`/bands/${bandId}/canvas`);
      const state = get();
      // Keep the active page if it still exists, otherwise the first page.
      const active =
        state.activePageId && payload.pages.some((p) => p.id === state.activePageId)
          ? state.activePageId
          : payload.pages[0]?.id ?? null;
      set((s) => ({ canvas: payload, activePageId: active, loading: false, dataVersion: s.dataVersion + 1 }));
    } catch (err: any) {
      set({ loading: false, loadError: err?.message || 'Failed to load canvas' });
    }
  },

  applyCanvas: (payload) => {
    const state = get();
    const active =
      state.activePageId && payload.pages.some((p) => p.id === state.activePageId)
        ? state.activePageId
        : payload.pages[0]?.id ?? null;
    set((s) => ({ canvas: payload, activePageId: active, loadError: null, dataVersion: s.dataVersion + 1 }));
  },

  selectPage: (pageId) => set({ activePageId: pageId, dirty: false, saveError: false }),
  setActivePageIfLoaded: (pageId) => {
    if (get().canvas?.pages.some((p) => p.id === pageId)) set({ activePageId: pageId });
  },

  createPage: async (bandId, input) => {
    const page = await api.post<CanvasPageRow>(`/bands/${bandId}/canvas/pages`, input);
    const canvas = get().canvas;
    if (canvas) {
      set({ canvas: { ...canvas, pages: [...canvas.pages, page] } });
    }
    return page;
  },

  updatePage: async (bandId, pageId, input) => {
    const updated = await api.patch<CanvasPageRow>(`/bands/${bandId}/canvas/pages/${pageId}`, input);
    const canvas = get().canvas;
    if (canvas) {
      set({
        canvas: { ...canvas, pages: canvas.pages.map((p) => (p.id === pageId ? updated : p)) },
      });
    }
  },

  deletePage: async (bandId, pageId) => {
    await api.delete(`/bands/${bandId}/canvas/pages/${pageId}`);
    const canvas = get().canvas;
    if (!canvas) return;
    const pages = canvas.pages.filter((p) => p.id !== pageId);
    const active =
      get().activePageId === pageId ? (pages[0]?.id ?? null) : get().activePageId;
    set({ canvas: { ...canvas, pages }, activePageId: active });
  },

  syncPage: async (bandId, pageId, payload) => {
    try {
      await api.put(`/bands/${bandId}/canvas/pages/${pageId}/state`, payload);
      set({ dirty: false, saveError: false, lastSavedAt: Date.now() });
      return true;
    } catch {
      // Local working state is preserved in memory — nothing is lost, only
      // the persistence attempt failed.
      set({ saveError: true });
      return false;
    }
  },

  updatePageRows: (pageId, nodes, edges) => {
    set((s) => {
      if (!s.canvas) return {};
      return {
        canvas: {
          ...s.canvas,
          nodes: [...s.canvas.nodes.filter((n) => n.pageId !== pageId), ...nodes],
          edges: [...s.canvas.edges.filter((e) => e.pageId !== pageId), ...edges],
        },
      };
    });
  },

  markDirty: () => set({ dirty: true, saveError: false }),
  clearSaveError: () => set({ saveError: false }),

  setPresence: (members) => set({ presence: members }),
  setNodeLocks: (locks) => set({ nodeLocks: locks }),
  setVcOpen: (open) => set({ vcOpen: open }),

  loadVersions: async (bandId, search) => {
    set({ versionsLoading: true });
    try {
      const versions = await api.get<CanvasVersionSummary[]>(
        `/bands/${bandId}/canvas/versions${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      );
      set({ versions: versions || [], versionsLoading: false });
    } catch {
      set({ versionsLoading: false });
    }
  },

  refreshVersions: (bandId) => get().loadVersions(bandId),
}));

// ── Helpers shared by canvas components ──────────────────────────────────────

export function relativeTime(ts: number | string): string {
  const time = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Math.max(0, Date.now() - time);
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(time).toLocaleDateString();
}

export function newId(prefix = 'n'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
