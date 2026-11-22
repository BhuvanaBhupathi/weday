'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  Save,
  X,
  Search,
  GitBranch,
  GitCommitHorizontal,
  Plus,
  Minus,
  ArrowLeftRight,
  PenLine,
  Trash2,
  RotateCcw,
  ChevronRight,
  Eye,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Pencil,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useCanvasStore, relativeTime } from '../../lib/canvas-store';
import { useWorkspaceStore } from '../../lib/store';
import type { CanvasVersionDetail, CanvasVersionSummary } from '../../lib/canvas-types';

const CHANGE_META: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  ADDED: { icon: <Plus className="w-3 h-3" />, cls: 'text-emerald-300', label: 'Added' },
  REMOVED: { icon: <Minus className="w-3 h-3" />, cls: 'text-rose-300', label: 'Removed' },
  MODIFIED: { icon: <PenLine className="w-3 h-3" />, cls: 'text-amber-300', label: 'Modified' },
  MOVED: { icon: <ArrowLeftRight className="w-3 h-3" />, cls: 'text-sky-300', label: 'Moved' },
};

interface VersionControlPanelProps {
  bandId: string;
  role: string;
  onCompare: (versionId: string) => void;
  onRestored: () => void;
}

export default function VersionControlPanel({ bandId, role, onCompare, onRestored }: VersionControlPanelProps) {
  const {
    vcOpen,
    setVcOpen,
    versions,
    versionsLoading,
    loadVersions,
    dirty,
    lastSavedAt,
    presence,
    canvas,
  } = useCanvasStore();

  const [search, setSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [detail, setDetail] = useState<CanvasVersionDetail | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [renaming, setRenaming] = useState<CanvasVersionSummary | null>(null);
  const [, forceTick] = useState(0);

  const { user } = useWorkspaceStore();
  const otherMembers = presence.filter((m) => m.userId !== user?.id);

  // Keep "saved Xs ago" fresh
  useEffect(() => {
    if (!vcOpen || !lastSavedAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [vcOpen, lastSavedAt]);

  // Cross-component signal to open the save-version modal (keyboard ⌘S, node menu)
  useEffect(() => {
    const handler = () => setSaveOpen(true);
    window.addEventListener('friday:open-save-version', handler);
    return () => window.removeEventListener('friday:open-save-version', handler);
  }, []);

  useEffect(() => {
    if (vcOpen && versions.length === 0 && !versionsLoading) {
      loadVersions(bandId, search || undefined);
    }
  }, [vcOpen, bandId]);

  function handleSearch(v: string) {
    setSearch(v);
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => loadVersions(bandId, v || undefined), 300));
  }

  async function openDetail(v: CanvasVersionSummary) {
    try {
      const full = await api.get<CanvasVersionDetail>(`/bands/${bandId}/canvas/versions/${v.id}`);
      setDetail(full);
    } catch {
      setDetail(v as CanvasVersionDetail);
    }
  }

  async function handleRestore() {
    if (!detail) return;
    try {
      const res: any = await api.post(`/bands/${bandId}/canvas/versions/${detail.id}/restore`);
      setRestoreOpen(false);
      setDetail(null);
      await Promise.all([onRestored(), loadVersions(bandId, search || undefined)]);
      console.info('Version restored', res);
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }
  }

  async function handleDelete(v: CanvasVersionSummary) {
    const ok = window.confirm(
      `Permanently delete version "${v.name}" (v${v.versionNumber})?\n\nDeleted content remains recoverable through any other version whose snapshot still contains it.`,
    );
    if (!ok) return;
    try {
      await api.delete(`/bands/${bandId}/canvas/versions/${v.id}`);
      if (detail?.id === v.id) setDetail(null);
      loadVersions(bandId, search || undefined);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const nextVersionNumber = (versions[0]?.versionNumber ?? 0) + 1;

  // ── Closed ────────────────────────────────────────────────────────────────
  if (!vcOpen) {
    return null;
  }

  // ── Expanded panel ────────────────────────────────────────────────────────
  return (
    <aside className="w-[300px] shrink-0 border-l border-[#1a1a1a] bg-[#080808] flex flex-col select-none animate-fade-in">
      {/* Header */}
      <div className="h-11 border-b border-[#1a1a1a] px-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold text-white tracking-wide">VERSION CONTROL</span>
        </div>
        <button
          onClick={() => setVcOpen(false)}
          title="Collapse panel"
          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-[#161616]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Current draft state */}
      <div className="px-3.5 py-3 border-b border-[#1a1a1a] space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          {dirty ? (
            <>
              <CircleDot className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">
                {lastSavedAt ? `Saved ${relativeTime(lastSavedAt)}` : 'Saved'}
              </span>
            </>
          )}
          <span className="text-[10px] text-zinc-600 font-mono ml-auto">DRAFT</span>
        </div>
        <button
          onClick={() => setSaveOpen(true)}
          disabled={role === 'VIEWER' || role === 'CLIENT'}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-40 text-violet-200 text-xs font-semibold border border-violet-500/30 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save version
        </button>
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Autosaves keep your draft safe. Versions are immutable historical snapshots.
        </p>
      </div>

      {/* Search */}
      <div className="px-3.5 py-2.5 border-b border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2 h-8 rounded-lg bg-[#101010] border border-[#222222] px-2.5 focus-within:border-zinc-500">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search versions…"
            className="flex-1 min-w-0 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* History timeline */}
      <div className="flex-1 overflow-y-auto py-2">
        {versionsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="px-4 py-8 text-center space-y-1.5">
            <History className="w-6 h-6 text-zinc-700 mx-auto" />
            <p className="text-xs text-zinc-500">No versions yet</p>
            <p className="text-[10px] text-zinc-600">
              Save your first version to start the planning history.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[22px] top-2 bottom-2 w-px bg-[#1e1e1e]" />
            {versions.map((v) => {
              const counts = v._count?.changes ?? 0;
              return (
                <button
                  key={v.id}
                  onClick={() => openDetail(v)}
                  className={`relative w-full text-left pl-8 pr-3 py-2.5 hover:bg-[#101010] transition-colors group ${
                    detail?.id === v.id ? 'bg-[#101010]' : ''
                  }`}
                >
                  <span
                    className={`absolute left-[18px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-[#080808] ${
                      detail?.id === v.id ? 'bg-violet-400' : 'bg-zinc-600 group-hover:bg-zinc-400'
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-100 truncate flex-1">
                      v{v.versionNumber} · {v.name}
                    </span>
                    {counts > 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-zinc-500 shrink-0">
                        {counts}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500">
                    <span>{v.creator?.displayName || 'Crew'}</span>
                    <span className="text-zinc-700">·</span>
                    <span>{relativeTime(v.createdAt)}</span>
                    {v.gitBranch && (
                      <span className="flex items-center gap-0.5 text-zinc-600 font-mono ml-auto">
                        <GitBranch className="w-2.5 h-2.5" />
                        {v.gitBranch}
                      </span>
                    )}
                  </div>
                  {v.changeSummary && (
                    <div className="text-[10px] text-zinc-600 truncate mt-0.5">{v.changeSummary}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Version detail drawer */}
      {detail && (
        <div className="border-t border-[#1a1a1a] bg-[#0a0a0a] max-h-[46%] overflow-y-auto shrink-0 animate-fade-in">
          <div className="px-3.5 py-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  Version {detail.versionNumber}
                </div>
                <div className="text-xs text-zinc-300 truncate">{detail.name}</div>
              </div>
              <button onClick={() => setDetail(null)} className="text-zinc-500 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {detail.description && (
              <p className="text-[11px] text-zinc-400 leading-relaxed">{detail.description}</p>
            )}

            <div className="text-[10px] text-zinc-500 space-y-0.5">
              <div>Created by {detail.creator?.displayName || 'Crew'}</div>
              <div>{new Date(detail.createdAt).toLocaleString()}</div>
              {detail.gitBranch && (
                <div className="flex items-center gap-1.5 font-mono">
                  <GitBranch className="w-3 h-3" /> {detail.gitBranch}
                  {detail.gitCommitSha && (
                    <span className="flex items-center gap-1">
                      <GitCommitHorizontal className="w-3 h-3" /> {detail.gitCommitSha.slice(0, 7)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Changes */}
            {detail.changes?.length > 0 ? (
              <div className="space-y-1 max-h-44 overflow-y-auto rounded-lg border border-[#1e1e1e] bg-[#0c0c0c] p-2">
                {detail.changes.map((c, i) => {
                  const meta = CHANGE_META[c.changeType] || CHANGE_META.MODIFIED;
                  return (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <span className={`shrink-0 mt-0.5 ${meta.cls}`}>{meta.icon}</span>
                      <span className={`shrink-0 mt-0.5 ${meta.cls} w-14 text-[10px] font-mono uppercase`}>
                        {meta.label}
                      </span>
                      <span className="text-zinc-300 truncate">{c.targetLabel}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-600">No recorded changes (initial snapshot).</div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => onCompare(detail.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#161616] hover:bg-[#1e1e1e] text-zinc-200 text-[11px] font-medium border border-[#262626] transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Compare
              </button>
              <button
                onClick={() => setRestoreOpen(true)}
                disabled={role === 'VIEWER' || role === 'CLIENT'}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 text-amber-200 text-[11px] font-semibold border border-amber-500/30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
              {role === 'ADMIN' && (
                <button
                  onClick={() => setRenaming(detail)}
                  title="Rename version"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#161616] border border-[#262626]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {role === 'ADMIN' && (
                <button
                  onClick={() => handleDelete(detail)}
                  title="Delete version permanently"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 border border-[#262626]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save version modal */}
      {saveOpen && (
        <SaveVersionModal
          bandId={bandId}
          defaultName={`Version ${nextVersionNumber}`}
          hasRepo={!!canvas?.repository}
          repoBranch={canvas?.repository?.defaultBranch}
          onCancel={() => setSaveOpen(false)}
          onSaved={async () => {
            setSaveOpen(false);
            await loadVersions(bandId, search || undefined);
          }}
        />
      )}

      {/* Restore confirmation */}
      {restoreOpen && detail && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#2c2c2c] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Restore Version {detail.versionNumber}?</h3>
                <p className="text-[11px] text-zinc-500">“{detail.name}”</p>
              </div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This will replace the current draft state with Version {detail.versionNumber}. Your
              current draft will be <strong className="text-white">preserved automatically</strong> as
              a pre-restore checkpoint and can be recovered from version history.
            </p>
            {otherMembers.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  This Band has active edits from other Crew members ({otherMembers
                    .map((m) => m.username)
                    .join(', ')}). Restoring this version will change the shared draft.
                </span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setRestoreOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white border border-[#222222] hover:bg-[#181818] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renaming && (
        <RenameVersionModal
          bandId={bandId}
          version={renaming}
          onCancel={() => setRenaming(null)}
          onSaved={() => {
            setRenaming(null);
            loadVersions(bandId, search || undefined);
            if (detail) openDetail({ ...detail, name: renaming.name });
          }}
        />
      )}
    </aside>
  );
}

// ─── Save version modal ─────────────────────────────────────────────────────

function SaveVersionModal({
  bandId,
  defaultName,
  hasRepo,
  repoBranch,
  onCancel,
  onSaved,
}: {
  bandId: string;
  defaultName: string;
  hasRepo: boolean;
  repoBranch?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [commitSha, setCommitSha] = useState<string | null>(null);
  const [commitChecked, setCommitChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [include, setInclude] = useState({ canvas: true, prd: true, architecture: true, pages: true });

  useEffect(() => {
    if (!hasRepo) return;
    let cancelled = false;
    api
      .get<Array<{ sha: string }>>(
        `/github/bands/${bandId}/commits?branch=${encodeURIComponent(repoBranch || 'main')}&limit=1`,
      )
      .then((commits) => {
        if (!cancelled && commits?.[0]?.sha) setCommitSha(commits[0].sha);
      })
      .catch(() => setCommitSha(null))
      .finally(() => !cancelled && setCommitChecked(true));
    return () => {
      cancelled = true;
    };
  }, [bandId, hasRepo, repoBranch]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/bands/${bandId}/canvas/versions`, {
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        gitBranch: hasRepo ? repoBranch || undefined : undefined,
        gitCommitSha: commitSha || undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(`Version could not be created. Your current draft has not been deleted. — ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0e0e] border border-[#2c2c2c] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Save className="w-4 h-4 text-violet-300" /> Save new version
          </h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Version name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MVP architecture"
              autoFocus
              className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What changed in this version?"
              rows={2}
              className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Include</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['canvas', 'Canvas'],
                  ['prd', 'PRD'],
                  ['architecture', 'Architecture'],
                  ['pages', 'Page structure'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={include[key]}
                    onChange={(e) => setInclude((p) => ({ ...p, [key]: e.target.checked }))}
                    className="accent-violet-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
              GitHub context
            </label>
            {hasRepo ? (
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-[#161616] border border-[#262626] rounded-lg px-3 py-2">
                <GitBranch className="w-3.5 h-3.5" /> {repoBranch || 'main'}
                {commitSha ? (
                  <span className="flex items-center gap-1">
                    <GitCommitHorizontal className="w-3.5 h-3.5" /> {commitSha.slice(0, 7)}
                  </span>
                ) : commitChecked ? (
                  <span className="text-zinc-600">commit: —</span>
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-600 bg-[#161616] border border-[#262626] rounded-lg px-3 py-2">
                Not available — no GitHub repository connected
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-[11px] text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white border border-[#222222] hover:bg-[#181818] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save version
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rename modal ────────────────────────────────────────────────────────────

function RenameVersionModal({
  bandId,
  version,
  onCancel,
  onSaved,
}: {
  bandId: string;
  version: CanvasVersionSummary;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(version.name);
  const [description, setDescription] = useState(version.description || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/bands/${bandId}/canvas/versions/${version.id}`, {
        name: name.trim() || undefined,
        description: description.trim() || null,
      });
      onSaved();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0e0e] border border-[#2c2c2c] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Rename Version {version.versionNumber}</h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50 resize-none"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white border border-[#222222]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
