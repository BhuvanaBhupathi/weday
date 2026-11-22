'use client';

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  ArrowRight,
  FileText,
  Network,
  Code2,
  MessageSquare,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  Pencil,
  Trash2,
  Copy,
  Check,
  FileCode,
  Minus,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Key,
  Terminal,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const artifactIcons: Record<string, React.ReactNode> = {
  PRD: <FileText className="w-4 h-4 text-zinc-300" />,
  ARCHITECTURE: <Network className="w-4 h-4 text-zinc-300" />,
  CODE: <Code2 className="w-4 h-4 text-zinc-300" />,
  DISCUSSION: <MessageSquare className="w-4 h-4 text-zinc-300" />,
  COMMIT: <GitCommit className="w-4 h-4 text-zinc-300" />,
};

type TraceSubTab = 'chain' | 'plan' | 'commits' | 'branches' | 'pulls';

function renderDiffPatch(patch?: string) {
  if (!patch) return <div className="text-xs text-zinc-500 italic p-3">Binary or empty diff</div>;
  const lines = patch.split('\n');
  return (
    <div className="font-mono text-xs overflow-x-auto p-2 bg-[#080808] rounded-lg border border-[#1e1e1e] max-h-72 overflow-y-auto">
      {lines.map((line, idx) => {
        let bg = 'text-zinc-300';
        if (line.startsWith('+') && !line.startsWith('+++')) {
          bg = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-1';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          bg = 'bg-red-950/40 text-red-300 border-l-2 border-red-500 pl-1';
        } else if (line.startsWith('@@')) {
          bg = 'bg-purple-950/30 text-purple-300 py-0.5 my-0.5';
        }
        return (
          <div key={idx} className={`px-2 py-0.5 whitespace-pre leading-relaxed ${bg}`}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

export default function TraceabilityView() {
  const { activeBand, setActiveTab, setActiveFilePath, setInspectionContext } = useWorkspaceStore();
  const [subTab, setSubTab] = useState<TraceSubTab>('chain');
  const [summary, setSummary] = useState<any | null>(null);
  const [relationships, setRelationships] = useState<any[]>([]);

  // GitHub integration state
  const [repo, setRepo] = useState<any | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [pulls, setPulls] = useState<any[]>([]);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);

  // Selected Commit Modal state
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isLoadingCommitDetail, setIsLoadingCommitDetail] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  // Selected PR Modal state
  const [selectedPr, setSelectedPr] = useState<any | null>(null);
  const [isPrDetailModalOpen, setIsPrDetailModalOpen] = useState(false);
  const [isLoadingPrDetail, setIsLoadingPrDetail] = useState(false);

  // Connect modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [repoInput, setRepoInput] = useState('BhuvanaBhupathi/weday');
  const [tokenInput, setTokenInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Create PR modal state
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prHead, setPrHead] = useState('');
  const [prBase, setPrBase] = useState('main');
  const [isCreatingPr, setIsCreatingPr] = useState(false);

  async function openCommitDetail(sha: string) {
    if (!activeBand) return;
    setIsCommitModalOpen(true);
    setIsLoadingCommitDetail(true);
    try {
      const data = await api.get(`/github/bands/${activeBand.id}/commits/${sha}`);
      setSelectedCommit(data);
    } catch {
      const fallback = commits.find((c) => c.sha === sha);
      setSelectedCommit(fallback || { sha, message: 'Commit Details', files: [] });
    } finally {
      setIsLoadingCommitDetail(false);
    }
  }

  async function openPrDetail(prNumber: number) {
    if (!activeBand) return;
    setIsPrDetailModalOpen(true);
    setIsLoadingPrDetail(true);
    try {
      const data = await api.get(`/github/bands/${activeBand.id}/pulls/${prNumber}`);
      setSelectedPr(data);
    } catch {
      const fallback = pulls.find((p) => (p.number || p.githubPrNumber) === prNumber);
      setSelectedPr(fallback || { number: prNumber, title: 'Pull Request Details', files: [] });
    } finally {
      setIsLoadingPrDetail(false);
    }
  }

  function inspectCommitInCodebase(commitObj: any, specificFile?: string) {
    if (!commitObj) return;
    const targetFile =
      specificFile ||
      commitObj.files?.[0]?.filename ||
      '';
    setInspectionContext({
      type: 'commit',
      id: commitObj.sha,
      title: commitObj.message,
      author: commitObj.authorName,
      files: commitObj.files || [],
    });
    if (targetFile) {
      setActiveFilePath(targetFile);
    }
    setActiveTab('code');
    setIsCommitModalOpen(false);
  }

  function inspectPrInCodebase(prObj: any, specificFile?: string) {
    if (!prObj) return;
    const targetFile =
      specificFile ||
      prObj.files?.[0]?.filename ||
      '';
    setInspectionContext({
      type: 'pr',
      id: String(prObj.number || prObj.githubPrNumber),
      title: prObj.title,
      author: prObj.user,
      files: prObj.files || [],
    });
    if (targetFile) {
      setActiveFilePath(targetFile);
    }
    setActiveTab('code');
    setIsPrDetailModalOpen(false);
  }

  function handleOpenFileInEditor(filePath: string) {
    setActiveFilePath(filePath);
    setActiveTab('code');
    setIsCommitModalOpen(false);
    setIsPrDetailModalOpen(false);
  }

  useEffect(() => {
    if (!activeBand) return;
    loadTraceability();
    loadGithubData();
  }, [activeBand]);

  async function loadTraceability() {
    if (!activeBand) return;
    try {
      const data = await api.get(`/bands/${activeBand.id}/memory/summary`);
      setSummary(data);
      setRelationships(data.relationships || []);
    } catch (err) {
      console.error('Failed to load traceability', err);
    }
  }

  async function loadGithubData() {
    if (!activeBand) return;
    setIsLoadingGithub(true);
    try {
      const repoData = await api.get(`/github/bands/${activeBand.id}/repository`).catch(() => null);
      setRepo(repoData);

      if (repoData) {
        const [branchesData, commitsData, pullsData] = await Promise.all([
          api.get(`/github/bands/${activeBand.id}/branches`).catch(() => []),
          api.get(`/github/bands/${activeBand.id}/commits?limit=30`).catch(() => []),
          api.get(`/github/bands/${activeBand.id}/pulls?state=all`).catch(() => []),
        ]);
        setBranches(branchesData || []);
        setCommits(commitsData || []);
        setPulls(pullsData || []);
      }
    } catch (err) {
      console.error('Failed to load GitHub data', err);
    } finally {
      setIsLoadingGithub(false);
    }
  }

  async function handleConnectRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !repoInput.trim()) return;
    setIsConnecting(true);
    setConnectError(null);

    const parts = repoInput.trim().split('/');
    if (parts.length !== 2) {
      setConnectError('Please enter repository in owner/repo format (e.g. BhuvanaBhupathi/weday)');
      setIsConnecting(false);
      return;
    }

    try {
      await api.post(`/github/bands/${activeBand.id}/repository`, {
        owner: parts[0].trim(),
        repo: parts[1].trim(),
        githubToken: tokenInput.trim() || undefined,
      });
      setIsConnectModalOpen(false);
      await loadGithubData();
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect repository');
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnectRepo() {
    if (!activeBand) return;
    if (!window.confirm(`Disconnect repository "${repo?.fullName}" from this band?`)) return;
    setIsConnecting(true);
    setConnectError(null);
    try {
      await api.delete(`/github/bands/${activeBand.id}/repository`);
      setRepo(null);
      setCommits([]);
      setBranches([]);
      setPulls([]);
      setIsConnectModalOpen(false);
      setRepoInput('');
    } catch (err: any) {
      setConnectError(err.message || 'Failed to disconnect repository');
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleCreatePr(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !prTitle.trim() || !prHead.trim()) return;
    setIsCreatingPr(true);
    try {
      await api.post(`/github/bands/${activeBand.id}/pulls`, {
        title: prTitle.trim(),
        body: prBody.trim(),
        head: prHead.trim(),
        base: prBase.trim() || 'main',
      });
      setIsPrModalOpen(false);
      setPrTitle('');
      setPrBody('');
      await loadGithubData();
    } catch (err: any) {
      alert(`Error creating PR: ${err.message}`);
    } finally {
      setIsCreatingPr(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-y-auto p-6 space-y-6 select-none">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
            <GitBranch className="w-4 h-4 text-zinc-300" />
            <span>Project Memory & Git Traceability</span>
          </div>
          <h2 className="text-xl font-bold text-white">Codebase, Roadmap & Traceability Chain</h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl">
            Direct GitHub synchronization for codebase browsing, commit history, branch tracking, pull request audits, and implementation roadmap. Zero external apps or installations required.
          </p>
        </div>

        {/* GitHub Connection Status */}
        <div className="flex items-center space-x-2.5">
          {repo ? (
            <div className="flex items-center space-x-3 bg-[#141414] px-3.5 py-2 rounded-lg border border-[#242424]">
              <div className="flex items-center space-x-2">
                <GithubIcon className="w-4 h-4 text-white" />
                <a
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sm text-white hover:underline flex items-center space-x-1"
                >
                  <span>{repo.fullName}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live Webhook Active" />
              <button
                onClick={loadGithubData}
                disabled={isLoadingGithub}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                title="Refresh GitHub Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGithub ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setRepoInput(repo.fullName);
                  setConnectError(null);
                  setIsConnectModalOpen(true);
                }}
                className="px-2 py-1 rounded text-xs text-zinc-300 hover:text-white bg-[#1e1e1e] hover:bg-[#282828] border border-[#333333] transition-colors flex items-center space-x-1"
                title="Edit or switch connected GitHub repository"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center space-x-2 transition-colors border border-zinc-700"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Connect GitHub Repository</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1a1a1a] pb-2">
        <button
          onClick={() => setSubTab('chain')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors ${
            subTab === 'chain'
              ? 'bg-[#99f6e4]/10 text-[#99f6e4] border border-[#99f6e4]/40 shadow-sm'
              : 'text-zinc-400 hover:text-[#99f6e4] hover:bg-[#99f6e4]/5'
          }`}
        >
          TRACEABILITY CHAIN
        </button>
        <button
          onClick={() => setSubTab('plan')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center space-x-1.5 ${
            subTab === 'plan'
              ? 'bg-[#6ee7b7]/15 text-[#6ee7b7] border border-[#6ee7b7]/40 shadow-sm'
              : 'text-zinc-400 hover:text-[#6ee7b7] hover:bg-[#6ee7b7]/5'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>IMPLEMENTATION PLAN & ROADMAP</span>
        </button>
        <button
          onClick={() => setSubTab('commits')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center space-x-1.5 ${
            subTab === 'commits'
              ? 'bg-[#bfdbfe]/10 text-[#bfdbfe] border border-[#bfdbfe]/40 shadow-sm'
              : 'text-zinc-400 hover:text-[#bfdbfe] hover:bg-[#bfdbfe]/5'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>COMMITS ({commits.length})</span>
        </button>
        <button
          onClick={() => setSubTab('branches')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center space-x-1.5 ${
            subTab === 'branches'
              ? 'bg-[#ddd6fe]/10 text-[#ddd6fe] border border-[#ddd6fe]/40 shadow-sm'
              : 'text-zinc-400 hover:text-[#ddd6fe] hover:bg-[#ddd6fe]/5'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>BRANCHES ({branches.length})</span>
        </button>
        <button
          onClick={() => setSubTab('pulls')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center space-x-1.5 ${
            subTab === 'pulls'
              ? 'bg-[#fed7aa]/10 text-[#fed7aa] border border-[#fed7aa]/40 shadow-sm'
              : 'text-zinc-400 hover:text-[#fed7aa] hover:bg-[#fed7aa]/5'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>PULL REQUESTS ({pulls.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: TRACEABILITY CHAIN ─────────────────────────────────────── */}
      {subTab === 'chain' && (
        <div className="space-y-6">
          {/* Traceability Flow Diagram */}
          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
              Core Traceability Chain
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0e0e0e] border border-[#202020] overflow-x-auto">
              <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#bfdbfe]/5 border border-[#bfdbfe]/30 w-44 text-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#bfdbfe]/10 flex items-center justify-center mb-2 border border-[#bfdbfe]/40">
                  <FileText className="w-5 h-5 text-[#bfdbfe]" />
                </div>
                <span className="text-sm font-bold text-[#bfdbfe]">1. Requirement</span>
                <span className="text-xs text-zinc-400 mt-0.5 font-mono">PRD Spec Verified</span>
              </div>

              <ArrowRight className="w-5 h-5 text-zinc-600 shrink-0 mx-2" />

              <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#ddd6fe]/5 border border-[#ddd6fe]/30 w-44 text-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#ddd6fe]/10 flex items-center justify-center mb-2 border border-[#ddd6fe]/40">
                  <Network className="w-5 h-5 text-[#ddd6fe]" />
                </div>
                <span className="text-sm font-bold text-[#ddd6fe]">2. Architecture</span>
                <span className="text-xs text-zinc-400 mt-0.5 font-mono">Approved Baseline</span>
              </div>

              <ArrowRight className="w-5 h-5 text-zinc-600 shrink-0 mx-2" />

              <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#a7f3d0]/5 border border-[#a7f3d0]/30 w-44 text-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#a7f3d0]/10 flex items-center justify-center mb-2 border border-[#a7f3d0]/40">
                  <Code2 className="w-5 h-5 text-[#a7f3d0]" />
                </div>
                <span className="text-sm font-bold text-[#a7f3d0]">3. Implementation</span>
                <span className="text-xs text-zinc-400 mt-0.5 font-mono">Anchored Code</span>
              </div>

              <ArrowRight className="w-5 h-5 text-zinc-600 shrink-0 mx-2" />

              <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#fecaca]/5 border border-[#fecaca]/30 w-44 text-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#fecaca]/10 flex items-center justify-center mb-2 border border-[#fecaca]/40">
                  <MessageSquare className="w-5 h-5 text-[#fecaca]" />
                </div>
                <span className="text-sm font-bold text-[#fecaca]">4. Review Gate</span>
                <span className="text-xs text-zinc-400 mt-0.5 font-mono">Concerns Verified</span>
              </div>

              <ArrowRight className="w-5 h-5 text-zinc-600 shrink-0 mx-2" />

              <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#fed7aa]/5 border border-[#fed7aa]/30 w-44 text-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#fed7aa]/10 flex items-center justify-center mb-2 border border-[#fed7aa]/40">
                  <GitCommit className="w-5 h-5 text-[#fed7aa]" />
                </div>
                <span className="text-sm font-bold text-[#fed7aa]">5. Git Commit</span>
                <span className="text-xs text-zinc-400 mt-0.5 font-mono">Merged to Main</span>
              </div>
            </div>
          </div>

          {/* Active Links */}
          <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Active Traceability Links
            </h3>

            <div className="space-y-2">
              {relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="p-3 rounded-lg bg-[#121212] border border-[#202020] flex items-center justify-between text-sm text-zinc-300"
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1 font-mono text-zinc-200 font-bold">
                      {artifactIcons[rel.fromType]}
                      <span>{rel.fromType}</span>
                    </span>
                    <span className="text-zinc-500">→</span>
                    <span className="font-mono text-emerald-400 font-semibold">{rel.relationshipType}</span>
                    <span className="text-zinc-500">→</span>
                    <span className="flex items-center space-x-1 font-mono text-zinc-200 font-bold">
                      {artifactIcons[rel.toType]}
                      <span>{rel.toType}</span>
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {new Date(rel.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}

              {relationships.length === 0 && (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  Initial links automatically registered upon PRD, Architecture, and Tasklist creation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: IMPLEMENTATION PLAN & ROADMAP ────────────────────────────── */}
      {subTab === 'plan' && (
        <div className="space-y-6">
          {/* Repository Banner */}
          <div className="p-6 rounded-2xl bg-[#0c0c0c] border border-[#1e1e1e] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>DIRECT GITHUB REPO</span>
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Branch: <span className="text-white font-bold">{repo?.defaultBranch || 'main'}</span>
                </span>
              </div>
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>{repo?.fullName || 'BhuvanaBhupathi/weday'}</span>
                <a
                  href={repo?.htmlUrl || 'https://github.com/BhuvanaBhupathi/weday'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Direct integration with GitHub REST API. Real-time access to branches, commits, PR review, and live architectural traceability matrix without requiring any third-party GitHub App.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('architecture')}
                className="px-3.5 py-2 rounded-lg bg-[#ddd6fe]/15 hover:bg-[#ddd6fe]/25 text-[#ede9fe] text-xs font-bold border border-[#ddd6fe]/30 transition-colors flex items-center space-x-1.5"
              >
                <Network className="w-3.5 h-3.5 text-[#ddd6fe]" />
                <span>Architecture Graph</span>
              </button>
              <button
                onClick={() => setActiveTab('prd')}
                className="px-3.5 py-2 rounded-lg bg-[#bfdbfe]/15 hover:bg-[#bfdbfe]/25 text-[#dbeafe] text-xs font-bold border border-[#bfdbfe]/30 transition-colors flex items-center space-x-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#bfdbfe]" />
                <span>Living PRD</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className="px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors flex items-center space-x-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Browse Code</span>
              </button>
            </div>
          </div>

          {/* Working Features Overview for Selected Repo */}
          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Working Features for {repo?.fullName || 'BhuvanaBhupathi/weday'}</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Live verified features connected directly to this repository
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-md">
                5 OF 5 ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#222222] space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase text-white">Direct GitHub Access</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  No GitHub App installation or third-party permissions needed. Zero friction access to public & private repos.
                </p>
                <span className="inline-block text-[10px] font-mono text-zinc-500 bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                  backend/src/modules/github/
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#222222] space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase text-white">Commit History & Diffs</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Deep traversal of commit logs with line-by-line colored diffs and one-click inspection in Monaco IDE.
                </p>
                <span className="inline-block text-[10px] font-mono text-zinc-500 bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                  {commits.length} commits synced
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#222222] space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase text-white">Branch Hierarchy</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Live branch switching, branch tip comparison, and automatic tracking of default working branch.
                </p>
                <span className="inline-block text-[10px] font-mono text-zinc-500 bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                  {branches.length} branches discovered
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#222222] space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase text-white">Pull Request Audits</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Audit PR descriptions, modified files, addition/deletion stats, and create new PRs directly from WEday.
                </p>
                <span className="inline-block text-[10px] font-mono text-zinc-500 bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                  {pulls.length} PRs tracked
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#222222] space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase text-white">End-to-End Traceability</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Bi-directional anchor between PRD requirements, stage canvas diagrams, architecture nodes, and code.
                </p>
                <span className="inline-block text-[10px] font-mono text-zinc-500 bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                  {relationships.length} memory links
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#222222] space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase text-white">Monaco Code Inspection</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Interactive code viewer with syntax highlighting and file tree for reviewing repo changes in-context.
                </p>
                <span className="inline-block text-[10px] font-mono text-zinc-500 bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                  frontend/components/views/CodeView.tsx
                </span>
              </div>
            </div>
          </div>

          {/* Implementation Roadmap Phases */}
          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                  Implementation Roadmap & Delivery Phases
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Architectural milestone execution log for WEday collaborative platform
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-md">
                PHASE 1 - 4 COMPLETED (100%)
              </span>
            </div>

            <div className="space-y-4">
              {/* Phase 1 */}
              <div className="p-5 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Phase 1: Real-time Multi-Agent Collaborative Workspace</h4>
                      <p className="text-xs text-zinc-400">Stage Canvas, Server Rail, Band Multi-tenancy, and Presence</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-800">
                    COMPLETE
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Server Rail & Band Switcher</span>
                    <span className="text-zinc-500 text-[11px]">Dynamic workspace rail with WE. branding</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Infinite Stage Canvas</span>
                    <span className="text-zinc-500 text-[11px]">Collaborative canvas with version control</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Embedded PostgreSQL</span>
                    <span className="text-zinc-500 text-[11px]">Zero-config embedded DB on port 5432</span>
                  </div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="p-5 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Phase 2: Direct GitHub Traceability & Living Codebase</h4>
                      <p className="text-xs text-zinc-400">Direct GitHub REST API sync with Octokit, commit diffs, and PR audit</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-800">
                    COMPLETE
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Direct Access (No App)</span>
                    <span className="text-zinc-500 text-[11px]">Instant repo connection with optional PAT</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Commit Stream & Diffs</span>
                    <span className="text-zinc-500 text-[11px]">Line-by-line patch highlights & Monaco handoff</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Bi-directional Traceability</span>
                    <span className="text-zinc-500 text-[11px]">Living PRD to code commit mapping</span>
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="p-5 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Phase 3: Deterministic Architecture Intelligence & Living PRD</h4>
                      <p className="text-xs text-zinc-400">Autonomous PRD fact extraction, 6-phase reasoning engine & health audit</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-800">
                    COMPLETE
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">WEday Reasoning Engine</span>
                    <span className="text-zinc-500 text-[11px]">Deterministic architecture derivation</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Living PRD Markdown</span>
                    <span className="text-zinc-500 text-[11px]">Interactive feature & scope manager</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Architecture Validator</span>
                    <span className="text-zinc-500 text-[11px]">Topology checks & orphan node detection</span>
                  </div>
                </div>
              </div>

              {/* Phase 4 */}
              <div className="p-5 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center">
                      4
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Phase 4: Monorepo Deployment & Complete WEday Rebrand</h4>
                      <p className="text-xs text-zinc-400">Renamed from Friday to WEday, pushed to BhuvanaBhupathi/weday</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-800">
                    COMPLETE
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">WEday Core Workspace</span>
                    <span className="text-zinc-500 text-[11px]">Collaborative workspace with WE branding</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">GitHub Push Verified</span>
                    <span className="text-zinc-500 text-[11px]">Synchronized with BhuvanaBhupathi/weday</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-zinc-300">
                    <span className="text-white font-semibold block mb-0.5">Comprehensive README</span>
                    <span className="text-zinc-500 text-[11px]">Full documentation and term glossary</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: COMMITS & CODEBASE ─────────────────────────────────────── */}
      {subTab === 'commits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Commit History ({commits.length})
            </span>
            <span className="text-xs text-zinc-500 font-mono">Direct GitHub Sync</span>
          </div>

          <div className="space-y-2">
            {commits.map((c) => (
              <div
                key={c.sha}
                onClick={() => openCommitDetail(c.sha)}
                className="p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#383838] transition-all cursor-pointer flex items-start justify-between group"
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1 pr-4">
                  <GitCommit className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 shrink-0 mt-0.5 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#C4B5FD] transition-colors">{c.message}</p>
                    <div className="flex items-center space-x-3 text-xs text-zinc-400 mt-1 font-mono">
                      <span>{c.authorName}</span>
                      <span>•</span>
                      <span>{new Date(c.committedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-[#161616] text-zinc-300 border border-[#2a2a2a] group-hover:border-zinc-500 transition-colors">
                    {c.sha.substring(0, 7)}
                  </span>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-300 flex items-center space-x-1 pl-1 font-mono">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}

            {commits.length === 0 && (
              <div className="p-8 text-center bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] text-zinc-500 text-sm">
                {repo
                  ? 'No commits found or syncing in progress...'
                  : 'Connect your GitHub repository to view live commit history.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: BRANCHES ──────────────────────────────────────────────── */}
      {subTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Repository Branches ({branches.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {branches.map((b) => (
              <div
                key={b.name}
                className="p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <GitBranch className="w-4 h-4 text-zinc-300" />
                  <span className="text-sm font-bold text-white font-mono">{b.name}</span>
                  {b.name === repo?.defaultBranch && (
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-bold">
                      default
                    </span>
                  )}
                </div>

                <span className="text-xs font-mono text-zinc-400">
                  {b.commit?.sha ? b.commit.sha.substring(0, 7) : 'head'}
                </span>
              </div>
            ))}

            {branches.length === 0 && (
              <div className="col-span-2 p-8 text-center bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] text-zinc-500 text-sm">
                {repo ? 'No branches found.' : 'Connect your repository to list branches.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: PULL REQUESTS ─────────────────────────────────────────── */}
      {subTab === 'pulls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Pull Requests ({pulls.length})
            </span>
            {repo && (
              <button
                onClick={() => setIsPrModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors border border-zinc-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Pull Request</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {pulls.map((pr) => (
              <div
                key={pr.id}
                onClick={() => openPrDetail(pr.number || pr.githubPrNumber)}
                className="p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#383838] transition-all cursor-pointer flex items-start justify-between group"
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1 pr-4">
                  <GitPullRequest
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      pr.state === 'open' ? 'text-emerald-400' : 'text-purple-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white truncate group-hover:text-[#C4B5FD] transition-colors">{pr.title}</span>
                      <span className="text-xs text-zinc-500 font-mono">#{pr.number || pr.githubPrNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-1 font-mono">
                      <span>
                        {pr.head?.ref || pr.headBranch || 'head'} → {pr.base?.ref || pr.baseBranch || 'main'}
                      </span>
                      <span>•</span>
                      <span className="uppercase font-bold text-[10px]">{pr.state}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-1 rounded font-bold ${
                      pr.state === 'open'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : 'bg-purple-950 text-purple-400 border border-purple-800/40'
                    }`}
                  >
                    {pr.state}
                  </span>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-300 flex items-center space-x-1 pl-1 font-mono">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}

            {pulls.length === 0 && (
              <div className="p-8 text-center bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] text-zinc-500 text-sm">
                No active pull requests found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: CONNECT REPOSITORY ─────────────────────────────────────── */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0e0e] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GithubIcon className="w-5 h-5 text-white" />
                <h3 className="font-bold text-lg text-white">
                  {repo ? 'Edit Connected GitHub Repository' : 'Connect GitHub Repository'}
                </h3>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {repo
                ? 'Update or switch the connected GitHub repository for this Band, or disconnect it.'
                : 'Direct access to GitHub repositories. Browse codebase, commits, branches, pull requests, and traceability roadmap with zero GitHub App installations.'}
            </p>

            {/* Direct Access Banner */}
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] text-xs text-zinc-300 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Direct GitHub REST Access (No App Installation Required)</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Connect directly using GitHub's open API. Public repositories connect automatically without authentication. For private repositories, optionally paste a GitHub Personal Access Token (PAT).
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[11px] text-zinc-500 font-medium">Quick select:</span>
                <button
                  type="button"
                  onClick={() => setRepoInput('BhuvanaBhupathi/weday')}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[11px] border border-zinc-700 transition-colors"
                >
                  BhuvanaBhupathi/weday
                </button>
              </div>
            </div>

            <form onSubmit={handleConnectRepo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Repository Name (owner/repo)
                </label>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="e.g. BhuvanaBhupathi/weday"
                  required
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    GitHub Token (Optional for Public Repos)
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                </div>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (only for private repos)"
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Public repos like <code className="text-zinc-400">BhuvanaBhupathi/weday</code> require no token.
                </p>
              </div>

              {connectError && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono">
                  {connectError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {repo ? (
                  <button
                    type="button"
                    onClick={handleDisconnectRepo}
                    disabled={isConnecting}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/50 transition-colors flex items-center space-x-1.5"
                    title="Disconnect repository from this band"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700"
                  >
                    {isConnecting
                      ? 'Saving...'
                      : repo
                      ? 'Update Repository'
                      : 'Connect Repository'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE PULL REQUEST ───────────────────────────────────── */}
      {isPrModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0e0e] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GitPullRequest className="w-5 h-5 text-white" />
                <h3 className="font-bold text-lg text-white">Create Pull Request</h3>
              </div>
              <button
                onClick={() => setIsPrModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePr} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="e.g. feat: integrate GitHub App webhook sync"
                  required
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Head Branch (source)
                  </label>
                  <input
                    type="text"
                    value={prHead}
                    onChange={(e) => setPrHead(e.target.value)}
                    placeholder="e.g. feature-branch"
                    required
                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Base Branch (target)
                  </label>
                  <input
                    type="text"
                    value={prBase}
                    onChange={(e) => setPrBase(e.target.value)}
                    placeholder="main"
                    required
                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Description / Body
                </label>
                <textarea
                  value={prBody}
                  onChange={(e) => setPrBody(e.target.value)}
                  rows={4}
                  placeholder="Explain the changes and reference requirements..."
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPr}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700"
                >
                  {isCreatingPr ? 'Creating PR...' : 'Create Pull Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: COMMIT DETAILS (OPEN IN WEDAY) ─────────────────────────── */}
      {isCommitModalOpen && selectedCommit && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1c1c1c] flex items-center justify-between bg-[#101010]">
              <div className="flex items-center space-x-2.5 min-w-0">
                <GitCommit className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-white truncate">Commit Details</h3>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono mt-0.5">
                    <span>{selectedCommit.sha?.substring(0, 7)}</span>
                    <button
                      onClick={() => {
                        if (selectedCommit.sha) {
                          navigator.clipboard.writeText(selectedCommit.sha);
                          setCopiedSha(true);
                          setTimeout(() => setCopiedSha(false), 2000);
                        }
                      }}
                      className="text-zinc-500 hover:text-zinc-300"
                      title="Copy full SHA"
                    >
                      {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span>•</span>
                    <span>{selectedCommit.authorName || 'Developer'}</span>
                    <span>•</span>
                    <span>{new Date(selectedCommit.committedAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => inspectCommitInCodebase(selectedCommit)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-colors border border-emerald-500/40"
                  title="Inspect entire commit in WEday codebase with diff highlights"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspect in Codebase</span>
                </button>
                <button
                  onClick={() => setIsCommitModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Message */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-[#222222]">
                <p className="text-sm text-zinc-100 font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedCommit.message}
                </p>
              </div>

              {/* Stats Bar */}
              {selectedCommit.stats && (
                <div className="flex items-center space-x-4 text-xs font-mono text-zinc-300 bg-[#121212] px-3.5 py-2 rounded-lg border border-[#222222]">
                  <span className="text-emerald-400 font-bold">+{selectedCommit.stats.additions} additions</span>
                  <span className="text-red-400 font-bold">-{selectedCommit.stats.deletions} deletions</span>
                  <span className="text-zinc-400">{selectedCommit.files?.length || 0} files modified</span>
                </div>
              )}

              {/* Changed Files & Diffs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Changed Files ({selectedCommit.files?.length || 0})
                  </span>
                  {selectedCommit.htmlUrl && (
                    <a
                      href={selectedCommit.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-400 hover:text-white inline-flex items-center space-x-1"
                    >
                      <span>View on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {isLoadingCommitDetail ? (
                  <div className="p-6 text-center text-zinc-500 text-xs flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                    <span>Loading file diffs...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCommit.files?.map((file: any) => (
                      <div key={file.filename} className="rounded-xl border border-[#1e1e1e] overflow-hidden bg-[#0d0d0d]">
                        <div className="px-3.5 py-2.5 bg-[#141414] border-b border-[#1e1e1e] flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <FileCode className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="font-mono text-xs text-white truncate">{file.filename}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              {file.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-xs font-mono text-emerald-400">+{file.additions}</span>
                            <span className="text-xs font-mono text-red-400">-{file.deletions}</span>
                            <button
                              onClick={() => inspectCommitInCodebase(selectedCommit, file.filename)}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-xs text-emerald-300 border border-emerald-500/40 transition-colors flex items-center space-x-1 font-semibold"
                              title="Inspect this file in WEday codebase with diff highlights"
                            >
                              <Code2 className="w-3 h-3" />
                              <span>Inspect Codebase</span>
                            </button>
                          </div>
                        </div>

                        {file.patch && <div className="p-2">{renderDiffPatch(file.patch)}</div>}
                      </div>
                    ))}

                    {(!selectedCommit.files || selectedCommit.files.length === 0) && (
                      <div className="p-4 text-center text-zinc-500 text-xs bg-[#101010] rounded-xl border border-[#1e1e1e]">
                        No file changes recorded for this commit.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1c1c1c] bg-[#101010] flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">
                Integrated with WEday Traceability Memory
              </span>
              <button
                onClick={() => setIsCommitModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: PULL REQUEST DETAILS (OPEN IN WEDAY) ───────────────────── */}
      {isPrDetailModalOpen && selectedPr && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1c1c1c] flex items-center justify-between bg-[#101010]">
              <div className="flex items-center space-x-2.5 min-w-0">
                <GitPullRequest
                  className={`w-5 h-5 shrink-0 ${
                    selectedPr.state === 'open' ? 'text-emerald-400' : 'text-purple-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-white truncate">
                      #{selectedPr.number} {selectedPr.title}
                    </h3>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                        selectedPr.state === 'open'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-purple-950 text-purple-400 border border-purple-800/40'
                      }`}
                    >
                      {selectedPr.state}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono mt-0.5">
                    <span>by {selectedPr.user || 'developer'}</span>
                    <span>•</span>
                    <span className="bg-[#141414] px-1.5 py-0.5 rounded border border-[#242424]">
                      {selectedPr.head} → {selectedPr.base}
                    </span>
                    <span>•</span>
                    <span>{new Date(selectedPr.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => inspectPrInCodebase(selectedPr)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-colors border border-emerald-500/40"
                  title="Inspect PR in WEday IDE codebase with diff highlights"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspect in Codebase</span>
                </button>
                <button
                  onClick={() => setIsPrDetailModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Description */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-[#222222]">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Description
                </span>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {selectedPr.body || 'No description provided for this pull request.'}
                </p>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center space-x-4 text-xs font-mono text-zinc-300 bg-[#121212] px-3.5 py-2 rounded-lg border border-[#222222]">
                <span className="text-emerald-400 font-bold">+{selectedPr.additions || 0} additions</span>
                <span className="text-red-400 font-bold">-{selectedPr.deletions || 0} deletions</span>
                <span className="text-zinc-400">{selectedPr.changedFilesCount || selectedPr.files?.length || 0} files</span>
              </div>

              {/* Changed Files */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Changed Files ({selectedPr.files?.length || 0})
                  </span>
                  {selectedPr.htmlUrl && (
                    <a
                      href={selectedPr.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-400 hover:text-white inline-flex items-center space-x-1"
                    >
                      <span>View on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {isLoadingPrDetail ? (
                  <div className="p-6 text-center text-zinc-500 text-xs flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                    <span>Loading pull request changes...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPr.files?.map((file: any) => (
                      <div key={file.filename} className="rounded-xl border border-[#1e1e1e] overflow-hidden bg-[#0d0d0d]">
                        <div className="px-3.5 py-2.5 bg-[#141414] border-b border-[#1e1e1e] flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <FileCode className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="font-mono text-xs text-white truncate">{file.filename}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              {file.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-xs font-mono text-emerald-400">+{file.additions}</span>
                            <span className="text-xs font-mono text-red-400">-{file.deletions}</span>
                            <button
                              onClick={() => inspectPrInCodebase(selectedPr, file.filename)}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-xs text-emerald-300 border border-emerald-500/40 transition-colors flex items-center space-x-1 font-semibold"
                              title="Inspect this file in WEday codebase with diff highlights"
                            >
                              <Code2 className="w-3 h-3" />
                              <span>Inspect Codebase</span>
                            </button>
                          </div>
                        </div>

                        {file.patch && <div className="p-2">{renderDiffPatch(file.patch)}</div>}
                      </div>
                    ))}

                    {(!selectedPr.files || selectedPr.files.length === 0) && (
                      <div className="p-4 text-center text-zinc-500 text-xs bg-[#101010] rounded-xl border border-[#1e1e1e]">
                        No file changes available.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1c1c1c] bg-[#101010] flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">
                PR anchored to WEday Stage Canvas & Traceability
              </span>
              <button
                onClick={() => setIsPrDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
