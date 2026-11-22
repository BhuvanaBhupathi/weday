'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

interface FileNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: FileNode[];
}

function buildTreeFromGitItems(items: Array<{ path: string; type: 'blob' | 'tree' }>): FileNode[] {
  const root: { [key: string]: any } = {};

  for (const item of items) {
    if (!item.path || item.path.startsWith('.git/')) continue;
    const parts = item.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      if (!current[part]) {
        current[part] = {
          name: part,
          path: currentPath,
          type: isLast && item.type === 'blob' ? 'file' : 'folder',
          childrenMap: {},
        };
      }
      current = current[part].childrenMap;
    }
  }

  function mapToArray(obj: any): FileNode[] {
    const list: FileNode[] = Object.values(obj).map((node: any) => {
      const result: FileNode = {
        name: node.name,
        path: node.path,
        type: node.type,
      };
      if (node.type === 'folder') {
        result.children = mapToArray(node.childrenMap);
      }
      return result;
    });

    return list.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }

  return mapToArray(root);
}

interface IdeFileTreeProps {
  width?: number;
}

export default function IdeFileTree({ width }: IdeFileTreeProps) {
  const {
    bands,
    setBands,
    activeBand,
    setActiveBand,
    setIsHomeView,
    activeTab,
    setActiveTab,
    activeFilePath,
    setActiveFilePath,
  } = useWorkspaceStore();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isProtectedBand =
    activeBand?.slug === 'friday-core' ||
    activeBand?.slug === 'weday-core' ||
    activeBand?.name?.toLowerCase() === 'friday core' ||
    activeBand?.name?.toLowerCase() === 'weday core';

  async function handleDeleteBand() {
    if (!activeBand || isProtectedBand) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/bands/${activeBand.id}`);
      const updatedBands = bands.filter((b) => b.id !== activeBand.id);
      setBands(updatedBands);
      setIsDeleteModalOpen(false);

      if (updatedBands.length > 0) {
        setActiveBand(updatedBands[0]);
      } else {
        setIsHomeView(true);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete band');
    } finally {
      setIsDeleting(false);
    }
  }

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    backend: true,
    'backend/src': true,
    'backend/src/modules': true,
    frontend: true,
    src: true,
    app: true,
  });

  const [copiedCode, setCopiedCode] = useState(false);

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  function handleFileClick(filePath: string) {
    setActiveFilePath(filePath);
    setActiveTab('code');
  }

  function copyJoinCode() {
    if (activeBand?.joinCode) {
      navigator.clipboard.writeText(activeBand.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  const [connectedRepo, setConnectedRepo] = useState<any | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [gitTree, setGitTree] = useState<FileNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  React.useEffect(() => {
    if (!activeBand) return;
    loadRepoData();
  }, [activeBand]);

  async function fetchTree(branchName?: string) {
    if (!activeBand) return;
    setIsLoadingTree(true);
    try {
      const branch = branchName || selectedBranch || 'main';
      const items = await api.get(`/github/bands/${activeBand.id}/tree?ref=${encodeURIComponent(branch)}`);
      if (Array.isArray(items) && items.length > 0) {
        const built = buildTreeFromGitItems(items);
        setGitTree(built);
        setExpandedFolders((prev) => {
          const next = { ...prev };
          for (const node of built) {
            if (node.type === 'folder') {
              next[node.path] = true;
              if (node.children) {
                for (const child of node.children) {
                  if (child.type === 'folder') {
                    next[child.path] = true;
                  }
                }
              }
            }
          }
          return next;
        });
      } else {
        setGitTree([]);
      }
    } catch {
      setGitTree([]);
    } finally {
      setIsLoadingTree(false);
    }
  }

  async function loadRepoData() {
    if (!activeBand) return;
    try {
      const repo = await api.get(`/github/bands/${activeBand.id}/repository`).catch(() => null);
      setConnectedRepo(repo);
      if (repo) {
        const defBranch = repo.defaultBranch || 'main';
        setSelectedBranch(defBranch);
        const b = await api.get(`/github/bands/${activeBand.id}/branches`).catch(() => []);
        setBranches(b || []);
        await fetchTree(defBranch);
      } else {
        setGitTree([]);
      }
    } catch {
      setGitTree([]);
    }
  }

  function handleBranchChange(b: string) {
    setSelectedBranch(b);
    fetchTree(b);
  }

  function renderTree(nodes: FileNode[], depth = 0) {
    return nodes.map((node) => {
      const isFolder = node.type === 'folder';
      const isExpanded = expandedFolders[node.path];
      const isSelectedFile = activeTab === 'code' && activeFilePath === node.path;

      return (
        <div key={node.path}>
          <button
            onClick={() => (isFolder ? toggleFolder(node.path) : handleFileClick(node.path))}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            className={`w-full text-left py-1.5 pr-2.5 flex items-center space-x-2 text-sm transition-colors rounded group ${
              isSelectedFile
                ? 'bg-[#222222] text-white font-medium'
                : 'text-zinc-300 hover:text-white hover:bg-[#151515]'
            }`}
          >
            {isFolder ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-zinc-300 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-4" />
                <FileCode className="w-4 h-4 text-zinc-400 shrink-0 group-hover:text-zinc-200" />
              </>
            )}
            <span className="truncate">{node.name}</span>
          </button>

          {isFolder && isExpanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  return (
    <aside
      style={{ width: width ? `${width}px` : undefined }}
      className="w-64 bg-[#080808] border-r border-[#1a1a1a] flex flex-col shrink-0 select-none overflow-hidden"
    >
      {/* Band Header */}
      <div className="h-12 border-b border-[#1a1a1a] px-3.5 flex items-center justify-between bg-[#0e0e0e] shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-sm text-white truncate">
            {activeBand?.name || 'Band Workspace'}
          </h2>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="text-xs text-zinc-400 font-mono">Code: {activeBand?.joinCode}</span>
            <button
              onClick={copyJoinCode}
              className="text-zinc-400 hover:text-white transition-colors p-0.5"
              title="Copy Join Code"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Delete Band button (for custom bands only, Friday Core protected) */}
        {!isProtectedBand && activeBand && (
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all ml-1 shrink-0"
            title="Delete this Band"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Repository File Explorer (planning views live in the top navigation) */}
      <div className="flex-1 overflow-y-auto py-2.5">
        <div className="border-t border-[#1a1a1a] pt-3">
          <div className="flex items-center justify-between px-3.5 pb-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Repository Files
              </span>
              {isLoadingTree && <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin" />}
            </div>
            {connectedRepo ? (
              <button
                onClick={() => setActiveTab('traceability')}
                className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate max-w-[120px] transition-colors"
                title={`Connected: ${connectedRepo.fullName} (Click to open Git & Traceability)`}
              >
                {connectedRepo.name || connectedRepo.fullName}
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('traceability')}
                className="text-[10px] text-zinc-400 hover:text-white flex items-center space-x-1 transition-colors"
                title="Connect GitHub App repo"
              >
                <GitBranch className="w-3 h-3" />
                <span>Connect</span>
              </button>
            )}
          </div>

          {/* Branch selector if repo is connected */}
          {connectedRepo && branches.length > 0 && (
            <div className="px-3 pb-2">
              <div className="flex items-center justify-between space-x-1.5 bg-[#121212] border border-[#262626] rounded px-2 py-1 text-xs text-zinc-300">
                <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                  <GitBranch className="w-3 h-3 text-zinc-400 shrink-0" />
                  <select
                    value={selectedBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 outline-none w-full cursor-pointer truncate"
                  >
                    {branches.map((b) => (
                      <option key={b.name} value={b.name} className="bg-[#141414] text-zinc-200">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => fetchTree()}
                  className="text-zinc-500 hover:text-white p-0.5 transition-colors"
                  title="Refresh Repository Files"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingTree ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          )}

          <div className="py-1">
            {connectedRepo && gitTree.length > 0 ? (
              renderTree(gitTree)
            ) : (
              <div className="px-3 py-4 text-center space-y-2">
                <GitBranch className="w-5 h-5 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-500">
                  {connectedRepo
                    ? 'No files loaded for this branch.'
                    : 'No repository connected to this Band.'}
                </p>
                {!connectedRepo && (
                  <button
                    onClick={() => setActiveTab('traceability')}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Connect a GitHub repository →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Band Confirmation Modal */}
      {isDeleteModalOpen && (
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
              Are you sure you want to permanently delete <strong className="text-white">{activeBand?.name}</strong>? All associated PRDs, requirements, stage canvases, tasks, and discussions will be deleted.
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
                  setIsDeleteModalOpen(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white border border-[#222222] hover:bg-[#181818] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBand}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Band'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
