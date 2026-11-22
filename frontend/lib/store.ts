import { create } from 'zustand';

export type WorkspaceTab =
  | 'canvas'
  | 'overview'
  | 'prd'
  | 'stage'
  | 'architecture'
  | 'decisions'
  | 'code'
  | 'tasks'
  | 'traceability';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

export interface Band {
  id: string;
  name: string;
  slug: string;
  description?: string;
  joinCode: string;
  role?: string;
}

interface WorkspaceState {
  user: User | null;
  bands: Band[];
  activeBand: Band | null;
  isHomeView: boolean;
  activeDmUser: User | null;
  activeTab: WorkspaceTab;
  activeFilePath: string | null;
  isRightPanelOpen: boolean;
  isLeftExplorerOpen: boolean;
  activeChannelId: string | null;
  inspectionContext: CodeInspectionContext | null;

  setUser: (user: User | null) => void;
  setBands: (bands: Band[]) => void;
  setActiveBand: (band: Band | null) => void;
  setIsHomeView: (isHome: boolean) => void;
  setActiveDmUser: (user: User | null) => void;
  setActiveTab: (tab: WorkspaceTab) => void;
  setActiveFilePath: (path: string | null) => void;
  toggleRightPanel: () => void;
  toggleLeftExplorer: () => void;
  setActiveChannelId: (id: string | null) => void;
  setInspectionContext: (ctx: CodeInspectionContext | null) => void;
}

export interface CodeInspectionContext {
  type: 'commit' | 'pr';
  id: string; // sha or pr number
  title: string;
  author?: string;
  files?: Array<{ filename: string; patch?: string; status: string; additions?: number; deletions?: number }>;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  user: null,
  bands: [],
  activeBand: null,
  isHomeView: false,
  activeDmUser: null,
  activeTab: 'canvas',
  activeFilePath: null,
  isRightPanelOpen: true,
  isLeftExplorerOpen: true,
  activeChannelId: null,
  inspectionContext: null,

  setUser: (user) => set({ user }),
  setBands: (bands) => set({ bands }),
  setActiveBand: (activeBand) =>
    set({
      activeBand,
      isHomeView: false,
    }),
  setIsHomeView: (isHomeView) =>
    set({
      isHomeView,
    }),
  setActiveDmUser: (activeDmUser) => set({ activeDmUser }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setActiveFilePath: (activeFilePath) => set({ activeFilePath, activeTab: 'code' }),
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  toggleLeftExplorer: () => set((state) => ({ isLeftExplorerOpen: !state.isLeftExplorerOpen })),
  setActiveChannelId: (activeChannelId) => set({ activeChannelId }),
  setInspectionContext: (inspectionContext) => set({ inspectionContext }),
}));

