'use client';

import React, { useState, useEffect, useRef } from 'react';
import ServerRail from '../../components/layout/ServerRail';
import BandTopBar from '../../components/layout/BandTopBar';
import IdeFileTree from '../../components/layout/IdeFileTree';
import CrewPanel from '../../components/layout/CrewPanel';
import HomeView from '../../components/views/HomeView';
import OverviewView from '../../components/views/OverviewView';
import PrdView from '../../components/views/PrdView';
import StageView from '../../components/views/StageView';
import ArchitectureView from '../../components/views/ArchitectureView';
import CodeView from '../../components/views/CodeView';
import TasksView from '../../components/views/TasksView';
import DecisionsView from '../../components/views/DecisionsView';
import TraceabilityView from '../../components/views/TraceabilityView';
import CanvasView from '../../components/canvas/CanvasView';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';
import { useRealtimeCollaboration } from '../../lib/socket';

export default function WorkspacePage() {
  const {
    user,
    setUser,
    bands,
    setBands,
    activeBand,
    setActiveBand,
    isHomeView,
    activeTab,
    setActiveTab,
    activeFilePath,
    isLeftExplorerOpen,
    isRightPanelOpen,
  } = useWorkspaceStore();

  // Keeps the socket in the active band's room (presence, live cursors,
  // canvas sync) and surfaces live event toasts. Must stay mounted for the
  // whole workspace — no other component emits join:band.
  useRealtimeCollaboration();

  const [loading, setLoading] = useState(true);

  // Opening (or switching) a Band always lands on the Canvas workspace
  useEffect(() => {
    if (activeBand) setActiveTab('canvas');
  }, [activeBand?.id]);

  // Column Resizing States for Band Workspace
  const [leftExplorerWidth, setLeftExplorerWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(260);
  const isDraggingLeftRef = useRef(false);
  const isDraggingRightRef = useRef(false);
  const dragStartXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDraggingLeftRef.current) {
        const delta = e.clientX - dragStartXRef.current;
        const newWidth = Math.max(180, Math.min(480, startWidthRef.current + delta));
        setLeftExplorerWidth(newWidth);
      } else if (isDraggingRightRef.current) {
        const delta = dragStartXRef.current - e.clientX;
        const newWidth = Math.max(180, Math.min(480, startWidthRef.current + delta));
        setRightPanelWidth(newWidth);
      }
    }

    function handleMouseUp() {
      if (isDraggingLeftRef.current || isDraggingRightRef.current) {
        isDraggingLeftRef.current = false;
        isDraggingRightRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  function startLeftResize(e: React.MouseEvent) {
    isDraggingLeftRef.current = true;
    dragStartXRef.current = e.clientX;
    startWidthRef.current = leftExplorerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function startRightResize(e: React.MouseEvent) {
    isDraggingRightRef.current = true;
    dragStartXRef.current = e.clientX;
    startWidthRef.current = rightPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const me = await api.get('/auth/me');
      setUser(me);
      // Load user bands
      const userBands = await api.get('/bands/my');
      setBands(userBands || []);
      if (userBands && userBands.length > 0 && !activeBand && !isHomeView) {
        setActiveBand(userBands[0]);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#000000] flex flex-col items-center justify-center space-y-4 select-none">
        <div className="flex items-center space-x-0.5">
          <span className="font-inconsolata font-black text-3xl tracking-tighter text-white">WE</span>
          <span className="w-2 h-2 rounded-full bg-[#C4B5FD] shadow-[0_0_8px_#C4B5FD] mt-1" />
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-zinc-300 animate-spin" />
      </div>
    );
  }

  // Not logged in: prompt login
  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#000000] flex flex-col items-center justify-center p-4">
        <div className="p-8 rounded-2xl bg-[#0c0c0c] border border-zinc-800 text-center max-w-sm w-full space-y-4 shadow-2xl">
          <div className="flex items-center justify-center space-x-1 mx-auto">
            <span className="font-inconsolata font-black text-3xl tracking-tighter text-white">WE</span>
            <span className="w-2 h-2 rounded-full bg-[#C4B5FD] shadow-[0_0_8px_#C4B5FD] mt-1" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Welcome to WEday</h2>
          <p className="text-sm text-zinc-400">Authentication required to access the collaborative workspace.</p>
          <a
            href="/"
            className="block w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition-colors"
          >
            Go to Landing Page
          </a>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen w-screen bg-[#000000] text-zinc-200 overflow-hidden select-none">
      {/* ─── SECTION 1: PINNED SERVER RAIL (Pinned across website) ───────────── */}
      <ServerRail />

      {/* ─── MAIN PLATFORM BODY ─────────────────────────────────────────────── */}
      {isHomeView ? (
        /* HOME PAGE: 4-SECTION DISCORD + IDE VIEW WITH DRAG RESIZING */
        <HomeView />
      ) : (
        /* BAND PAGE: IDE EXPLORER + PLAYGROUND + CREW PANEL */
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top IDE Bar */}
          <BandTopBar />

          {/* Band Workspace Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left IDE File Tree & Pinned Artifacts */}
            {isLeftExplorerOpen && (
              <>
                <IdeFileTree width={leftExplorerWidth} />
                {/* Drag Handle between Left Explorer and Playground */}
                <div
                  onMouseDown={startLeftResize}
                  className="w-1 bg-[#1a1a1a] hover:bg-zinc-500 cursor-col-resize active:bg-white transition-colors shrink-0 z-10"
                  title="Drag to resize explorer"
                />
              </>
            )}

            {/* Center Playground Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#000000]">

              {/* Active Playground Canvas/Viewport */}
              <div
                key={activeTab}
                className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#000000] animate-fade-in"
              >
                {activeTab === 'canvas' && <CanvasView />}
                {activeTab === 'overview' && <OverviewView />}
                {activeTab === 'prd' && <PrdView />}
                {activeTab === 'stage' && <StageView />}
                {activeTab === 'architecture' && <ArchitectureView />}
                {activeTab === 'decisions' && <DecisionsView />}
                {activeTab === 'code' && <CodeView />}
                {activeTab === 'tasks' && <TasksView />}
                {activeTab === 'traceability' && <TraceabilityView />}
              </div>
            </main>

            {/* Rightmost Crew Members Panel (Canvas has its own VC panel) */}
            {isRightPanelOpen && activeTab !== 'canvas' && (
              <>
                {/* Drag Handle between Playground and Crew Panel */}
                <div
                  onMouseDown={startRightResize}
                  className="w-1 bg-[#1a1a1a] hover:bg-zinc-500 cursor-col-resize active:bg-white transition-colors shrink-0 z-10"
                  title="Drag to resize crew panel"
                />
                <CrewPanel width={rightPanelWidth} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
