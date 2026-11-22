'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckSquare,
  AlertOctagon,
  FileText,
  Network,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';
import { signatureColorFor } from '../../lib/signature-colors';

export default function OverviewView() {
  const { activeBand, setActiveTab } = useWorkspaceStore();
  const [summary, setSummary] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [concerns, setConcerns] = useState<any[]>([]);

  useEffect(() => {
    if (!activeBand) return;
    loadDashboardData();
  }, [activeBand]);

  async function loadDashboardData() {
    if (!activeBand) return;
    try {
      const [sumData, tasksData, concernsData] = await Promise.all([
        api.get(`/bands/${activeBand.id}/memory/summary`).catch(() => null),
        api.get(`/bands/${activeBand.id}/tasks`).catch(() => []),
        api.get(`/bands/${activeBand.id}/concerns`).catch(() => []),
      ]);
      setSummary(sumData);
      setTasks(tasksData);
      setConcerns(concernsData);
    } catch (err) {
      console.error('Failed to load overview data', err);
    }
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#000000] space-y-6 select-none">
      {/* Welcome Banner / Hero */}
      <div className="relative rounded-2xl overflow-hidden p-6 border border-[#1a1a1a] bg-[#0a0a0a] shadow-sm">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Project-Centric Workspace</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {activeBand ? activeBand.name : 'Welcome to Friday'}
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl mt-1 leading-relaxed">
              {activeBand?.description ||
                'Persistent workspace connecting requirements, visual stage, system architecture, code discussions, and Git workflows.'}
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setActiveTab('prd')}
              className="px-4 py-2 rounded-lg bg-[#bfdbfe]/15 hover:bg-[#bfdbfe]/25 border border-[#bfdbfe]/40 text-[#dbeafe] text-xs font-bold shadow-sm flex items-center space-x-2 transition-all"
            >
              <FileText className="w-4 h-4 text-[#bfdbfe]" />
              <span>Open PRD</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className="px-4 py-2 rounded-lg bg-[#ddd6fe]/15 hover:bg-[#ddd6fe]/25 border border-[#ddd6fe]/40 text-[#ede9fe] text-xs font-bold shadow-sm flex items-center space-x-2 transition-all"
            >
              <Network className="w-4 h-4 text-[#ddd6fe]" />
              <span>Architecture</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#bfdbfe]/5 border border-[#bfdbfe]/20 hover:border-[#bfdbfe]/40 transition-colors flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-[#bfdbfe]">PRD Version</p>
            <h3 className="text-xl font-bold text-white mt-1">
              v{summary?.prd?.latestVersion ?? '1'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 flex items-center space-x-1">
              <span>Synced with Architecture</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#bfdbfe]/10 border border-[#bfdbfe]/30 flex items-center justify-center text-[#bfdbfe]">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#fed7aa]/5 border border-[#fed7aa]/20 hover:border-[#fed7aa]/40 transition-colors flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-[#fed7aa]">Active Tasks</p>
            <h3 className="text-xl font-bold text-white mt-1">{tasks.length}</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {tasks.filter((t) => t.status === 'DONE').length} completed
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#fed7aa]/10 border border-[#fed7aa]/30 flex items-center justify-center text-[#fed7aa]">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#fecaca]/5 border border-[#fecaca]/20 hover:border-[#fecaca]/40 transition-colors flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-[#fecaca]">Open Concerns</p>
            <h3 className="text-xl font-bold text-zinc-200 mt-1">{concerns.length}</h3>
            <p className="text-xs text-zinc-400 mt-1">Quality Gate Tracking</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#fecaca]/10 border border-[#fecaca]/30 flex items-center justify-center text-[#fecaca]">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#99f6e4]/5 border border-[#99f6e4]/20 hover:border-[#99f6e4]/40 transition-colors flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-[#99f6e4]">Traceability Links</p>
            <h3 className="text-xl font-bold text-[#ccfbf1] mt-1">
              {summary?.metrics?.linkedRelationships ?? 4}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Requirement → Code</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#99f6e4]/10 border border-[#99f6e4]/30 flex items-center justify-center text-[#99f6e4]">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Two Column Grid: Tasks & Concerns vs Traceability Pulse */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Recent Tasks */}
        <div className="p-5 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-zinc-300" />
              <span>Project Tasks</span>
            </h3>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-[#121212] border border-[#202020] flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{task.title}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300">
                      {task.priority}
                    </span>
                    <span className="text-xs text-zinc-500">{task.status}</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 font-mono">
                  {new Date(task.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-6">No tasks yet</p>
            )}
          </div>
        </div>

        {/* Right Column: Open Concerns */}
        <div className="p-5 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-zinc-300" />
              <span>Open Concerns & Quality Gate</span>
            </h3>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
            >
              <span>Track lifecycle</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {concerns.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg bg-[#121212] border border-[#202020] flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{c.title}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300">
                      {c.status}
                    </span>
                    <span className="text-xs text-zinc-400">
                      by{' '}
                      <span className="font-semibold" style={{ color: signatureColorFor(c.reporter) }}>
                        {c.reporter?.displayName || 'Developer'}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#242424] text-xs font-semibold text-zinc-300"
                >
                  Verify
                </button>
              </div>
            ))}

            {concerns.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400">All concerns verified and clear</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Raise concerns from discussions or code review
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
