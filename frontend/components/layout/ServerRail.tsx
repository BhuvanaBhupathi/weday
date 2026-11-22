'use client';

import React, { useState } from 'react';
import {
  Radio,
  Plus,
  KeyRound,
  User as UserIcon,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

export default function ServerRail() {
  const {
    user,
    bands,
    setBands,
    activeBand,
    setActiveBand,
    isHomeView,
    setIsHomeView,
    setActiveTab,
  } = useWorkspaceStore();

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [newBandName, setNewBandName] = useState('');
  const [newBandDesc, setNewBandDesc] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Band Deletion state
  const [bandToDelete, setBandToDelete] = useState<any | null>(null);
  const [isDeletingBand, setIsDeletingBand] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteBand(bandId: string) {
    setIsDeletingBand(true);
    setDeleteError(null);
    try {
      await api.delete(`/bands/${bandId}`);
      const updated = bands.filter((b) => b.id !== bandId);
      setBands(updated);
      setBandToDelete(null);

      if (activeBand?.id === bandId) {
        if (updated.length > 0) {
          setActiveBand(updated[0]);
        } else {
          setIsHomeView(true);
        }
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete band');
    } finally {
      setIsDeletingBand(false);
    }
  }

  async function handleCreateBand(e: React.FormEvent) {
    e.preventDefault();
    if (!newBandName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const band = await api.post('/bands', {
        name: newBandName.trim(),
        description: newBandDesc.trim() || undefined,
      });
      setBands([...bands, band]);
      setActiveBand(band);
      setActiveTab('prd');
      setIsHomeView(false);
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
      await api.post('/bands/join', {
        joinCode: joinCodeInput.trim().toUpperCase(),
      });
      const updatedBands = await api.get('/bands/my');
      setBands(updatedBands);
      setIsJoinModalOpen(false);
      setJoinCodeInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <nav
        aria-label="Servers"
        className="w-[68px] bg-[#000000] border-r border-[#1a1a1a] flex flex-col items-center py-3 shrink-0 select-none z-40 h-full overflow-hidden"
      >
        {/* Direct Messages & Home Icon */}
        <div
          className="relative group flex items-center justify-center w-full"
          onMouseEnter={() => setHoveredId('home')}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Active Indicator Pill */}
          <div
            className={`server-pill transition-all duration-200 ${
              isHomeView
                ? 'h-10 opacity-100 bg-white'
                : hoveredId === 'home'
                ? 'h-5 opacity-100 bg-white/70'
                : 'h-0 opacity-0'
            }`}
          />

          <button
            onClick={() => setIsHomeView(true)}
            title="Crewmates"
            className={`w-12 h-12 flex items-center justify-center transition-all duration-200 ${
              isHomeView
                ? 'rounded-2xl bg-[#262626] text-white ring-1 ring-[#3b3b3b]'
                : 'rounded-[24px] bg-[#0f0f0f] text-neutral-300 hover:rounded-2xl hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-0.5">
              <span className="font-inconsolata font-black text-2xl tracking-tighter text-white">fri</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] shadow-[0_0_8px_#C4B5FD] mt-1" />
            </div>
          </button>

          {/* Tooltip */}
          <div className="absolute left-[76px] px-3 py-1.5 rounded-md bg-[#141414] text-white text-[13px] font-semibold whitespace-nowrap shadow-2xl border border-[#2a2a2a] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Crewmates
          </div>
        </div>

        {/* Divider below "fri" logo */}
        <div className="w-8 h-[2px] bg-[#1f1f1f] rounded my-2 shrink-0" />

        {/* Bands List */}
        <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto no-scrollbar">
          {bands.map((b) => {
            const isActive = !isHomeView && activeBand?.id === b.id;
            const isHovered = hoveredId === b.id;
            const initials = b.name.substring(0, 2).toUpperCase();

            return (
              <div
                key={b.id}
                className="relative group flex items-center justify-center w-full"
                onMouseEnter={() => setHoveredId(b.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Active Indicator Pill */}
                <div
                  className={`server-pill transition-all duration-200 ${
                    isActive
                      ? 'h-10 opacity-100 bg-white'
                      : isHovered
                      ? 'h-5 opacity-100 bg-white/70'
                      : 'h-0 opacity-0'
                  }`}
                />

                <button
                  onClick={() => setActiveBand(b)}
                  className={`w-12 h-12 flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                    isActive
                      ? 'rounded-2xl bg-[#222222] text-white ring-1 ring-purple-500/40 shadow-sm'
                      : 'rounded-[24px] bg-[#0f0f0f] text-neutral-300 hover:rounded-2xl hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  {initials}
                </button>

                {/* Tooltip & Actions */}
                <div className="absolute left-[76px] px-3 py-2 rounded-xl bg-[#141414] text-white text-[13px] font-semibold whitespace-nowrap shadow-2xl border border-[#2a2a2a] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 flex items-center space-x-3">
                  <div>
                    <p className="font-bold text-white">{b.name}</p>
                    <p className="text-xs text-neutral-400 font-mono font-normal">Join Code: {b.joinCode}</p>
                  </div>
                  {b.slug !== 'friday-core' && b.name.toLowerCase() !== 'friday core' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBandToDelete(b);
                      }}
                      className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Delete this Band"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Band Button (+) */}
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              title="Create a Band"
              className="w-12 h-12 rounded-[24px] bg-[#0f0f0f] text-neutral-400 hover:rounded-2xl hover:bg-[#1c1c1c] hover:text-white flex items-center justify-center transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="absolute left-[76px] px-3 py-1.5 rounded-md bg-[#141414] text-white text-[13px] font-semibold whitespace-nowrap shadow-2xl border border-[#2a2a2a] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Create New Band
            </div>
          </div>

          {/* Join Band with Code */}
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              title="Join a Band"
              className="w-12 h-12 rounded-[24px] bg-[#0f0f0f] text-neutral-400 hover:rounded-2xl hover:bg-[#1c1c1c] hover:text-white flex items-center justify-center transition-all duration-200"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <div className="absolute left-[76px] px-3 py-1.5 rounded-md bg-[#141414] text-white text-[13px] font-semibold whitespace-nowrap shadow-2xl border border-[#2a2a2a] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Join Band with Code
            </div>
          </div>
        </div>

        {/* User Mini Avatar at bottom */}
        {user && (
          <div className="pt-2.5 mt-2 border-t border-[#1a1a1a] w-full flex items-center justify-center shrink-0">
            <div className="relative group">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full border border-[#262626] hover:border-[#404040] transition-colors"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-neutral-300">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#000000]" />
              <div className="absolute left-[76px] bottom-0 px-3 py-1.5 rounded-md bg-[#141414] text-white text-[13px] font-semibold whitespace-nowrap shadow-2xl border border-[#2a2a2a] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                <p className="font-bold">{user.displayName}</p>
                <p className="text-xs text-emerald-400 font-mono">Online</p>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Create Band Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0e0e0e] border border-[#262626] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white mb-1">Create a Band</h3>
            <p className="text-sm text-neutral-400 mb-4">
              A Band is a dedicated project workspace for your team, planning artifacts, and code repository.
            </p>

            {error && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBand} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Band Name
                </label>
                <input
                  type="text"
                  value={newBandName}
                  onChange={(e) => setNewBandName(e.target.value)}
                  placeholder="e.g. Phoenix Engine"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newBandDesc}
                  onChange={(e) => setNewBandDesc(e.target.value)}
                  placeholder="What is this project building?"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-sm font-semibold text-black transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[#0e0e0e] border border-[#262626] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white mb-1">Join a Band</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Enter the unique join code provided by the Band lead.
            </p>

            {error && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleJoinBand} className="space-y-3">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="e.g. A0E3-SVY9"
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-base font-mono tracking-wider text-center text-white uppercase placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                required
              />

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-sm font-semibold text-black transition-colors"
                >
                  {loading ? 'Joining...' : 'Join Band'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Band Confirmation Modal */}
      {bandToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-[#0e0e0e] border border-[#2c2c2c] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Band</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{bandToDelete.name}</strong>? All associated PRDs, requirements, stage canvases, tasks, and discussions will be removed.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBandToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeletingBand}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white border border-[#222222] hover:bg-[#181818] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBand(bandToDelete.id)}
                disabled={isDeletingBand}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingBand ? 'Deleting...' : 'Delete Band'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
