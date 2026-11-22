'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Paintbrush,
  Plus,
  Layout,
  Save,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

// Dynamic import of Tldraw to avoid SSR window errors
const TldrawComponent = dynamic(
  () => import('@tldraw/tldraw').then((mod) => mod.Tldraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#000000] text-zinc-400 space-y-2">
        <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center animate-pulse">
          <Paintbrush className="w-4 h-4 text-zinc-300" />
        </div>
        <p className="text-xs font-mono text-zinc-500">Loading interactive planning canvas...</p>
      </div>
    ),
  },
);

import '@tldraw/tldraw/tldraw.css';

interface StageBoard {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tlDrawData?: any;
  order: number;
}

export default function StageView() {
  const { activeBand } = useWorkspaceStore();
  const [boards, setBoards] = useState<StageBoard[]>([]);
  const [activeBoard, setActiveBoard] = useState<StageBoard | null>(null);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeBand) return;
    loadStage();
  }, [activeBand]);

  async function loadStage() {
    if (!activeBand) return;
    setIsLoading(true);
    try {
      const stage = await api.get(`/bands/${activeBand.id}/stage`);
      if (stage && stage.boards) {
        setBoards(stage.boards);
        if (stage.boards.length > 0) {
          // Keep current active board if it still exists, otherwise set first
          setActiveBoard((prev) => {
            if (prev) {
              const matched = stage.boards.find((b: any) => b.id === prev.id);
              if (matched) return matched;
            }
            return stage.boards[0];
          });
        }
      }
    } catch (err) {
      console.error('Failed to load stage', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !newBoardName.trim()) return;
    try {
      const newBoard = await api.post<StageBoard>(`/bands/${activeBand.id}/stage/boards`, {
        name: newBoardName.trim(),
        description: newBoardDesc.trim(),
      });
      setBoards([...boards, newBoard]);
      setActiveBoard(newBoard);
      setIsCreateBoardOpen(false);
      setNewBoardName('');
      setNewBoardDesc('');
    } catch (err: any) {
      alert(`Failed to create board: ${err.message}`);
    }
  }

  const handleMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;

      if (activeBoard && activeBoard.tlDrawData) {
        try {
          editor.loadSnapshot(activeBoard.tlDrawData);
        } catch {
          // ignore snapshot restore error
        }
      }

      const unlisten = editor.store.listen(
        () => {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            saveCanvasState(editor);
          }, 1500);
        },
        { scope: 'document' },
      );

      return () => {
        unlisten();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      };
    },
    [activeBoard],
  );

  async function saveCanvasState(editor: any) {
    if (!activeBand || !activeBoard) return;
    try {
      const snapshot = editor.getSnapshot();
      await api.patch(`/bands/${activeBand.id}/stage/boards/${activeBoard.id}`, {
        tlDrawData: snapshot,
      });
      // Update in-memory board state
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoard.id ? { ...b, tlDrawData: snapshot } : b)),
      );
      setSaveStatus('Autosaved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Failed to autosave board', err);
    }
  }

  async function handleManualSave() {
    if (!editorRef.current || !activeBand || !activeBoard) return;
    try {
      const snapshot = editorRef.current.getSnapshot();
      await api.patch(`/bands/${activeBand.id}/stage/boards/${activeBoard.id}`, {
        tlDrawData: snapshot,
      });
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoard.id ? { ...b, tlDrawData: snapshot } : b)),
      );
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-hidden select-text">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-[#1a1a1a] px-4 flex items-center justify-between bg-[#0a0a0a] shrink-0 select-none z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Paintbrush className="w-4 h-4 text-zinc-300" />
            <span>STAGE</span>
          </div>

          <span className="text-zinc-600">|</span>

          {/* Board Selector Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-md">
            {boards.map((b) => {
              const isActive = activeBoard?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBoard(b)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    isActive
                      ? 'bg-[#fbcfe8]/15 text-[#fce7f3] border border-[#fbcfe8]/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-[#141414] border border-transparent'
                  }`}
                >
                  <Layout className={`w-3.5 h-3.5 ${isActive ? 'text-[#fbcfe8]' : 'text-zinc-400'}`} />
                  <span>{b.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsCreateBoardOpen(true)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#141414] transition-colors"
            title="Create new board"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {saveStatus && (
            <span className="text-xs text-[#a7f3d0] flex items-center space-x-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#a7f3d0]" />
              <span>{saveStatus}</span>
            </span>
          )}

          <button
            onClick={loadStage}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all bg-[#141414] hover:bg-[#202020] text-zinc-300 hover:text-white border border-[#262626] disabled:opacity-50"
            title="Refresh Stage from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#fbcfe8] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleManualSave}
            className="px-3.5 py-1.5 rounded-md bg-[#fbcfe8]/15 hover:bg-[#fbcfe8]/25 text-[#fce7f3] border border-[#fbcfe8]/40 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <Save className="w-3.5 h-3.5 text-[#fbcfe8]" />
            <span>Save Canvas</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-[#000000]">
        {activeBoard ? (
          <TldrawComponent key={activeBoard.id} onMount={handleMount} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
            <Layout className="w-8 h-8 text-zinc-600" />
            <p className="text-sm">No active board selected</p>
          </div>
        )}
      </div>

      {/* Modal: Create Board */}
      {isCreateBoardOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-[#0e0e0e] border border-[#262626] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <span className="text-sm font-bold text-white flex items-center space-x-2">
                <Layout className="w-4 h-4 text-zinc-400" />
                <span>New Stage Board</span>
              </span>
              <button
                onClick={() => setIsCreateBoardOpen(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Board Name
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. User Journey, Checkout Flow"
                  required
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  placeholder="Purpose of this planning board..."
                  rows={2}
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setIsCreateBoardOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-xs text-zinc-300 hover:bg-[#242424]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBoardName.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shadow-md disabled:opacity-50"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
