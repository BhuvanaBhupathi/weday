'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Code2,
  PenTool,
  Layers,
  FileText,
  Paintbrush,
  Network,
  Scale,
  CheckSquare,
  GitBranch,
  Plus,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { useCanvasStore } from '../../lib/canvas-store';

const VIEWS: Array<{ id: any; label: string; icon: (cls: string) => React.ReactNode }> = [
  { id: 'overview', label: 'Product Overview', icon: (cls) => <Layers className={cls} /> },
  { id: 'prd', label: 'Product Requirements', icon: (cls) => <FileText className={cls} /> },
  { id: 'stage', label: 'Stage (whiteboard)', icon: (cls) => <Paintbrush className={cls} /> },
  { id: 'architecture', label: 'Architecture', icon: (cls) => <Network className={cls} /> },
  { id: 'decisions', label: 'Decision Logs', icon: (cls) => <Scale className={cls} /> },
  { id: 'code', label: 'Code View', icon: (cls) => <Code2 className={cls} /> },
  { id: 'tasks', label: 'Tasklist', icon: (cls) => <CheckSquare className={cls} /> },
  { id: 'traceability', label: 'Git & Traceability', icon: (cls) => <GitBranch className={cls} /> },
];

export default function BandTopBar() {
  const {
    activeBand,
    activeTab,
    activeFilePath,
    setActiveTab,
    isLeftExplorerOpen,
    toggleLeftExplorer,
    isRightPanelOpen,
    toggleRightPanel,
  } = useWorkspaceStore();

  const {
    canvas,
    activePageId,
    selectPage,
    createPage,
    loadCanvas,
    dirty,
  } = useCanvasStore();


  const [viewsOpen, setViewsOpen] = useState(false);
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageDesc, setNewPageDesc] = useState('');
  const [creatingPage, setCreatingPage] = useState(false);
  const viewsRef = useRef<HTMLDivElement>(null);

  // Ensure canvas pages are loaded for the top navigation
  useEffect(() => {
    if (activeBand && activeTab === 'canvas' && !canvas) {
      loadCanvas(activeBand.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBand?.id, activeTab, canvas]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (viewsRef.current && !viewsRef.current.contains(e.target as Node)) {
        setViewsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const inCanvas = activeTab === 'canvas';
  const pages = canvas?.pages || [];

  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !newPageName.trim() || creatingPage) return;
    setCreatingPage(true);
    try {
      const page = await createPage(activeBand.id, {
        name: newPageName.trim(),
        description: newPageDesc.trim() || undefined,
        parentPageId: activePageId || undefined,
      });
      setPageModalOpen(false);
      setNewPageName('');
      setNewPageDesc('');
      selectPage(page.id);
    } catch (err: any) {
      alert(`Failed to create page: ${err.message}`);
    } finally {
      setCreatingPage(false);
    }
  }

  return (
    <header className="h-11 border-b border-[#1a1a1a] bg-[#000000] px-3.5 flex items-center justify-between select-none z-20 shrink-0">
      {/* Left: explorer toggle + band identity */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <button
          onClick={toggleLeftExplorer}
          title={isLeftExplorerOpen ? 'Hide File Explorer' : 'Show File Explorer'}
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#181818] transition-colors shrink-0"
        >
          {isLeftExplorerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <PenTool className="w-3.5 h-3.5 text-[#C4B5FD]" />
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {activeBand?.name || 'Workspace'}
          </span>
          {dirty && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
              title="Unsaved canvas changes"
            />
          )}
        </div>
      </div>

      {/* Center: canvas page tabs (pinned pages) or current view badge */}
      <div className="flex items-center space-x-2 min-w-0">
        {inCanvas ? (
          <div className="flex items-center space-x-1 overflow-x-auto max-w-[52vw] no-scrollbar">
            {pages.map((p) => {
              const isActive = p.id === activePageId;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPage(p.id)}
                  title={p.description || p.name}
                  className={`px-3 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#fbcfe8]/15 text-[#fce7f3] border border-[#fbcfe8]/40'
                      : 'text-zinc-400 hover:text-white hover:bg-[#141414] border border-transparent'
                  }`}
                >
                  <PenTool className={`w-3 h-3 ${isActive ? 'text-[#fbcfe8]' : 'text-zinc-500'}`} />
                  <span className="max-w-[120px] truncate">{p.name}</span>
                </button>
              );
            })}
            <button
              onClick={() => setPageModalOpen(true)}
              title="New canvas page"
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#141414] transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-md font-semibold border bg-[#ddd6fe]/10 text-[#ddd6fe] border-[#ddd6fe]/30">
            {activeTab === 'code' && activeFilePath
              ? activeFilePath.split('/').pop()
              : (VIEWS.find((v) => v.id === activeTab)?.label?.toUpperCase() || activeTab.toUpperCase())}
          </span>
        )}
      </div>

      {/* Right: views menu, code view, live sync, client link, crew toggle */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Views dropdown (the pinned artifacts, now at the top) */}
        <div className="relative" ref={viewsRef}>
          <button
            onClick={() => setViewsOpen((v) => !v)}
            className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors border ${
              viewsOpen
                ? 'bg-[#181818] text-white border-zinc-500'
                : 'bg-[#101010] text-zinc-300 hover:text-white border-[#262626]'
            }`}
          >
            <span>Views</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {viewsOpen && (
            <div className="absolute right-0 top-9 w-52 rounded-xl bg-[#101010] border border-[#2c2c2c] shadow-2xl overflow-hidden z-50 animate-fade-in">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setActiveTab(v.id);
                    setViewsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center space-x-2.5 text-xs transition-colors border-b border-[#161616] last:border-b-0 ${
                    activeTab === v.id
                      ? 'bg-[#181818] text-white font-semibold'
                      : 'text-zinc-300 hover:text-white hover:bg-[#161616]'
                  }`}
                >
                  {v.icon('w-4 h-4 text-zinc-400')}
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Code View shortcut */}
        <button
          onClick={() => setActiveTab('code')}
          title="Open Code View (GitHub)"
          className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors border ${
            activeTab === 'code'
              ? 'bg-[#cbd5e1]/15 text-[#e2e8f0] border-[#cbd5e1]/40'
              : 'bg-[#101010] text-zinc-300 hover:text-white border-[#262626]'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Code View</span>
        </button>


        {/* Toggle Right Crew Panel (Canvas uses the VC panel instead) */}
        {!inCanvas && (
          <button
            onClick={toggleRightPanel}
            title={isRightPanelOpen ? 'Hide Crew' : 'Show Crew'}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#181818] transition-colors"
          >
            {isRightPanelOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* New page modal */}
      {pageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#2c2c2c] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">New canvas page</h3>
              <button onClick={() => setPageModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Pages are separate infinite canvases inside this Band, shown as pinned tabs above.
            </p>
            <form onSubmit={handleCreatePage} className="space-y-3">
              <input
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g. Dashboard, Authentication, Mobile App"
                autoFocus
                required
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-zinc-400"
              />
              <input
                value={newPageDesc}
                onChange={(e) => setNewPageDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-zinc-400"
              />
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPageModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white border border-[#222222] hover:bg-[#181818] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPageName.trim() || creatingPage}
                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {creatingPage ? 'Creating…' : 'Create page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
