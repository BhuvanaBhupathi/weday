'use client';

import React from 'react';
import {
  Layers,
  FileText,
  Paintbrush,
  Network,
  Code2,
  CheckSquare,
  GitBranch,
  Radio,
  Scale,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  ChevronDown,
  User as UserIcon,
  Wifi,
  WifiOff,
  Bell,
  X,
} from 'lucide-react';
import { useWorkspaceStore, WorkspaceTab } from '../lib/store';
import { useRealtimeCollaboration } from '../lib/socket';

export default function Header() {
  const {
    user,
    bands,
    activeBand,
    setActiveBand,
    activeTab,
    setActiveTab,
    isRightPanelOpen,
    toggleRightPanel,
  } = useWorkspaceStore();

  const { isConnected, toasts, dismissToast } = useRealtimeCollaboration();

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { id: 'prd', label: 'PRD', icon: <FileText className="w-4 h-4" /> },
    { id: 'stage', label: 'Stage', icon: <Paintbrush className="w-4 h-4" /> },
    { id: 'architecture', label: 'Architecture', icon: <Network className="w-4 h-4" /> },
    { id: 'decisions', label: 'Decisions & Scope', icon: <Scale className="w-4 h-4" /> },
    { id: 'code', label: 'Code & Review', icon: <Code2 className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks & Concerns', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'traceability', label: 'Traceability', icon: <GitBranch className="w-4 h-4" /> },
  ];

  return (
    <header className="h-14 border-b border-[#1e293b] bg-[#0d1322]/80 backdrop-blur-md px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Left: Brand & Band Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-0.5 cursor-pointer">
          <span className="font-inconsolata font-black text-2xl tracking-tighter text-white">WE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] shadow-[0_0_8px_#C4B5FD] mt-0.5" />
        </div>

        <div className="h-5 w-[1px] bg-slate-800" />

        {/* Active Band Pill / Switcher */}
        {activeBand ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#131b2e] border border-slate-700/60 hover:border-slate-600 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">
              {activeBand.name}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {activeBand.joinCode}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">No Band Selected</span>
        )}
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-[#090e18] p-1 rounded-lg border border-slate-800/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#1e293b] text-sky-400 shadow-sm shadow-sky-500/10 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: User Status & Sidebar Toggle */}
      <div className="flex items-center space-x-3">
        {/* Realtime Connection Status Pill */}
        <div
          className={`flex items-center space-x-1.5 px-2 py-1 rounded-full text-[10px] font-mono border transition-colors ${
            isConnected
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
          title={isConnected ? 'Realtime Connected to WEday Event Gateway' : 'Connecting to Event Gateway...'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="hidden sm:inline">{isConnected ? 'Live Sync' : 'Offline'}</span>
        </div>

        {user ? (
          <div className="flex items-center space-x-2.5 px-2.5 py-1 rounded-full bg-[#131b2e] border border-slate-800">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-6 h-6 rounded-full border border-sky-400/30"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                <UserIcon className="w-3.5 h-3.5 text-slate-300" />
              </div>
            )}
            <span className="text-xs font-medium text-slate-300">{user.displayName}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/50">
            <span>Guest</span>
          </div>
        )}

        <button
          onClick={toggleRightPanel}
          title={isRightPanelOpen ? 'Collapse side panel' : 'Open side panel'}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          {isRightPanelOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Realtime Floating Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto p-3.5 rounded-xl bg-[#0f172a]/95 border border-sky-500/40 shadow-2xl backdrop-blur-md flex items-start justify-between space-x-3 text-xs animate-in slide-in-from-top-2 duration-200"
            >
              <div className="space-y-0.5 overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <Bell className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="font-bold text-white truncate">{toast.title}</span>
                </div>
                <p className="text-[11px] text-slate-300 pl-5 leading-tight">{toast.description}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
