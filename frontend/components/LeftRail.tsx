'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Users,
  KeyRound,
  Compass,
  Check,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useWorkspaceStore, Band } from '../lib/store';
import { api } from '../lib/api';

export default function LeftRail() {
  const { bands, setBands, activeBand, setActiveBand } = useWorkspaceStore();
  const [crew, setCrew] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);

  // Form states
  const [newBandName, setNewBandName] = useState('');
  const [newBandDesc, setNewBandDesc] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [crewUsernameInput, setCrewUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch bands & crew
  useEffect(() => {
    loadBands();
    loadCrew();
  }, []);

  async function loadBands() {
    try {
      const data = await api.get('/bands/my');
      setBands(data);
      if (data.length > 0 && !activeBand) {
        setActiveBand(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load bands', err);
    }
  }

  async function loadCrew() {
    try {
      const data = await api.get('/crew');
      setCrew(data);
    } catch (err: any) {
      console.error('Failed to load crew', err);
    }
  }

  async function handleCreateBand(e: React.FormEvent) {
    e.preventDefault();
    if (!newBandName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const band = await api.post('/bands', {
        name: newBandName,
        description: newBandDesc,
      });
      setBands([...bands, band]);
      setActiveBand(band);
      setIsCreateModalOpen(false);
      setNewBandName('');
      setNewBandDesc('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinBand(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/bands/join', {
        joinCode: joinCodeInput.trim().toUpperCase(),
      });
      await loadBands();
      setIsJoinModalOpen(false);
      setJoinCodeInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCrew(e: React.FormEvent) {
    e.preventDefault();
    if (!crewUsernameInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/crew/request', { username: crewUsernameInput.trim() });
      await loadCrew();
      setIsCrewModalOpen(false);
      setCrewUsernameInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="w-60 border-r border-[#1e293b] bg-[#0a0f1d] flex flex-col justify-between shrink-0 select-none">
      {/* Top: Bands Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
            Bands ({bands.length})
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              title="Join Band with code"
              className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800/60"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              title="Create new Band"
              className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800/60"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bands List */}
        <div className="p-2 space-y-1">
          {bands.map((b) => {
            const isSelected = activeBand?.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setActiveBand(b)}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between group transition-all ${
                  isSelected
                    ? 'bg-[#162035] text-white border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {b.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{b.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{b.joinCode}</p>
                  </div>
                </div>
                {isSelected && <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              </button>
            );
          })}

          {bands.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-2">No bands joined</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs text-sky-400 hover:underline"
              >
                + Create your first Band
              </button>
            </div>
          )}
        </div>

        {/* Crew Section */}
        <div className="mt-4 border-t border-slate-800/80">
          <div className="p-3 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Crew Peers ({crew.length})
            </span>
            <button
              onClick={() => setIsCrewModalOpen(true)}
              title="Add peer to Crew"
              className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800/60"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-2 space-y-1 pb-4">
            {crew.map((item) => (
              <div
                key={item.relationshipId}
                className="px-2.5 py-1.5 rounded-md flex items-center space-x-2.5 text-slate-300 hover:bg-slate-900/50"
              >
                <div className="relative">
                  <img
                    src={item.user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.user.username}`}
                    alt={item.user.displayName}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-[#0a0f1d]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs truncate font-medium">{item.user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">@{item.user.username}</p>
                </div>
              </div>
            ))}

            {crew.length === 0 && (
              <p className="text-[11px] text-slate-500 text-center py-2">No peers in Crew</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070b14] flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Supabase Synced</span>
        </span>
        <span className="font-mono">v0.1.0-mvp</span>
      </div>

      {/* Create Band Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-xl border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create New Band</h3>
            <p className="text-xs text-slate-400 mb-4">
              A Band is a dedicated project workspace for your team and code repository.
            </p>

            {error && (
              <div className="mb-3 p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBand} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Band Name
                </label>
                <input
                  type="text"
                  value={newBandName}
                  onChange={(e) => setNewBandName(e.target.value)}
                  placeholder="e.g. Phoenix Engine"
                  className="w-full bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newBandDesc}
                  onChange={(e) => setNewBandDesc(e.target.value)}
                  placeholder="What is this Band building?"
                  className="w-full bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Band'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Band Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 rounded-xl border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Join a Band</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the unique 8-character join code provided by the Band creator.
            </p>

            {error && (
              <div className="mb-3 p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleJoinBand} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="e.g. A0E3-SVY9"
                  className="w-full bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono tracking-wider text-center text-white uppercase placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  {loading ? 'Joining...' : 'Join Band'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Crew Modal */}
      {isCrewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 rounded-xl border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Crew Peer</h3>
            <p className="text-xs text-slate-400 mb-4">
              Connect directly with other developers in Friday for peer DMs and joint projects.
            </p>

            {error && (
              <div className="mb-3 p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleAddCrew} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={crewUsernameInput}
                  onChange={(e) => setCrewUsernameInput(e.target.value)}
                  placeholder="Enter Friday username"
                  className="w-full bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCrewModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
