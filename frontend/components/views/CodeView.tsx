'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import {
  MessageSquarePlus,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  GitCommit,
  GitPullRequest,
  FileCode,
  X,
  Search,
  Send,
  Trash2,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';
import { signatureColorFor } from '../../lib/signature-colors';

function detectLanguage(filePath: string): string {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.mjs')) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.prisma')) return 'prisma';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return 'yaml';
  return 'plaintext';
}

export default function CodeView() {
  const {
    activeBand,
    activeFilePath,
    setActiveFilePath,
    inspectionContext,
    setInspectionContext,
    user,
    setActiveTab,
  } = useWorkspaceStore();

  const selectedFile =
    activeFilePath || inspectionContext?.files?.[0]?.filename || null;

  const [repo, setRepo] = useState<any | null>(null);
  const [repoChecked, setRepoChecked] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [viewMode, setViewMode] = useState<'diff' | 'code'>('diff');
  const [discussions, setDiscussions] = useState<any[]>([]);

  // Monaco editor instance + live selection (for selection-based anchoring)
  const editorRef = useRef<any>(null);
  const selectionRef = useRef<{ startLine: number; endLine: number; text: string } | null>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorSelection(() => {
      const sel = editor.getSelection();
      const model = editor.getModel();
      if (sel && !sel.isEmpty() && model) {
        selectionRef.current = {
          startLine: sel.startLineNumber,
          endLine: sel.endLineNumber,
          text: model.getValueInRange(sel),
        };
      } else {
        selectionRef.current = null;
      }
    });
  };

  /** Scroll the editor to a discussion's anchored lines and select them. */
  function jumpToLines(start: number, end: number) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(start);
    editor.setSelection({
      startLineNumber: start,
      startColumn: 1,
      endLineNumber: end,
      endColumn: Number.MAX_SAFE_INTEGER,
    });
    editor.focus();
  }

  // Discussion thread chat window
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [thread, setThread] = useState<any | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const threadScrollRef = useRef<HTMLDivElement>(null);

  // Chat search across anchored discussions + their replies
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setActiveSearch(value.trim()), 300);
  }

  // Band role of the current user — only the creator/Crew Lead (ADMIN) may
  // delete anchored discussions.
  const [myBandRole, setMyBandRole] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBand || !user) {
      setMyBandRole(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/bands/${activeBand.id}/members`)
      .then((res: any[]) => {
        if (cancelled) return;
        const me = (res || []).find((m) => m.user?.id === user.id);
        setMyBandRole(me?.role || null);
      })
      .catch(() => {
        if (!cancelled) setMyBandRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBand, user]);

  const canDeleteDiscussions = myBandRole === 'ADMIN';

  async function handleDeleteDiscussion(d: any) {
    if (!activeBand) return;
    const replyCount = d._count?.replies ?? 0;
    const ok = window.confirm(
      `Delete the anchored discussion “${d.title}”${replyCount ? ` and its ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : ''}? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await api.delete(`/bands/${activeBand.id}/discussions/${d.id}`);
      setDiscussions((prev) => prev.filter((x) => x.id !== d.id));
      if (activeThreadId === d.id) closeThread();
    } catch (err: any) {
      alert(`Could not delete discussion: ${err.message}`);
    }
  }

  const activeFileDiff = inspectionContext?.files?.find((f) => f.filename === selectedFile)?.patch;

  // Column Resizing for Discussions Panel
  const [discussionsWidth, setDiscussionsWidth] = useState(320);
  const isDraggingDiscussionsRef = useRef(false);
  const dragStartXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDraggingDiscussionsRef.current) {
        const delta = dragStartXRef.current - e.clientX;
        const newWidth = Math.max(220, Math.min(520, startWidthRef.current + delta));
        setDiscussionsWidth(newWidth);
      }
    }

    function handleMouseUp() {
      if (isDraggingDiscussionsRef.current) {
        isDraggingDiscussionsRef.current = false;
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

  function startDiscussionsResize(e: React.MouseEvent) {
    isDraggingDiscussionsRef.current = true;
    dragStartXRef.current = e.clientX;
    startWidthRef.current = discussionsWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // Check whether this Band has a connected GitHub repository
  useEffect(() => {
    if (!activeBand) {
      setRepo(null);
      setRepoChecked(true);
      return;
    }
    let cancelled = false;
    setRepoChecked(false);
    api
      .get(`/github/bands/${activeBand.id}/repository`)
      .then((res: any) => !cancelled && setRepo(res))
      .catch(() => !cancelled && setRepo(null))
      .finally(() => !cancelled && setRepoChecked(true));
    return () => {
      cancelled = true;
    };
  }, [activeBand]);

  useEffect(() => {
    let isCancelled = false;
    async function fetchLiveFile() {
      if (!activeBand || !selectedFile) {
        setFileContent('');
        setFileError(null);
        setIsLoadingFile(false);
        return;
      }
      setIsLoadingFile(true);
      setFileError(null);
      try {
        const res = await api.get(`/github/bands/${activeBand.id}/file?path=${encodeURIComponent(selectedFile)}`);
        if (!isCancelled) {
          setFileContent(typeof res === 'string' ? res : res.content || '');
          setIsLoadingFile(false);
        }
      } catch (err: any) {
        // No fabricated fallbacks — surface the real error state
        if (!isCancelled) {
          setFileContent('');
          setFileError(err?.message || 'Could not load this file from the connected repository.');
          setIsLoadingFile(false);
        }
      }
    }

    fetchLiveFile();
    return () => {
      isCancelled = true;
    };
  }, [selectedFile, activeBand]);

  // Discussion create modal
  const [isDiscussionModalOpen, setIsDiscussionModalOpen] = useState(false);
  const [discussionTitle, setDiscussionTitle] = useState('');
  const [discussionSnippet, setDiscussionSnippet] = useState('');
  const [startLine, setStartLine] = useState(1);
  const [endLine, setEndLine] = useState(5);

  // AI Code Explanation
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    if (!activeBand) return;
    loadDiscussions(activeSearch);
  }, [activeBand, selectedFile, activeSearch]);

  async function loadDiscussions(search?: string) {
    if (!activeBand) return;
    try {
      const params = new URLSearchParams();
      if (selectedFile) params.set('filePath', selectedFile);
      if (search) params.set('search', search);
      const data = await api.get(`/bands/${activeBand.id}/discussions?${params.toString()}`);
      setDiscussions(data || []);
    } catch (err) {
      console.error('Failed to load discussions', err);
    }
  }

  /**
   * Opens the "Anchor Code Discussion" modal. Prefills the snippet and line
   * range from the current Monaco selection when one exists; otherwise
   * defaults to the first 10 lines of the file.
   */
  function openDiscussionModal() {
    const selection = selectionRef.current;
    if (selection && selection.text.trim()) {
      setDiscussionSnippet(selection.text);
      setStartLine(selection.startLine);
      setEndLine(selection.endLine);
    } else {
      const lines = fileContent.split('\n');
      const count = Math.min(10, Math.max(lines.length, 1));
      setDiscussionSnippet(lines.slice(0, count).join('\n'));
      setStartLine(1);
      setEndLine(count);
    }
    setIsDiscussionModalOpen(true);
  }

  async function openThread(discussion: any) {
    if (!activeBand) return;
    setActiveThreadId(discussion.id);
    setThread(discussion);
    setThreadLoading(true);
    setReplyInput('');
    try {
      const full = await api.get(`/bands/${activeBand.id}/discussions/${discussion.id}`);
      setThread(full);
    } catch (err) {
      console.error('Failed to load discussion thread', err);
    } finally {
      setThreadLoading(false);
    }
  }

  function closeThread() {
    setActiveThreadId(null);
    setThread(null);
    setReplyInput('');
  }

  // Keep the open thread scrolled to the latest message
  useEffect(() => {
    if (activeThreadId && !threadLoading) {
      requestAnimationFrame(() => {
        threadScrollRef.current?.scrollTo({ top: threadScrollRef.current.scrollHeight });
      });
    }
  }, [activeThreadId, threadLoading, thread?.replies?.length]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !activeThreadId || !replyInput.trim() || isSendingReply) return;
    setIsSendingReply(true);
    try {
      const reply = await api.post(`/bands/${activeBand.id}/discussions/${activeThreadId}/replies`, {
        content: replyInput.trim(),
      });
      setThread((prev: any) => (prev ? { ...prev, replies: [...(prev.replies || []), reply] } : prev));
      setReplyInput('');
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === activeThreadId
            ? { ...d, _count: { ...d._count, replies: (d._count?.replies || 0) + 1 } }
            : d,
        ),
      );
      requestAnimationFrame(() => {
        threadScrollRef.current?.scrollTo({ top: threadScrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    } catch (err: any) {
      alert(`Reply error: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  }

  async function handleCreateDiscussion(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !discussionTitle.trim()) return;
    if (!Number.isFinite(startLine) || !Number.isFinite(endLine) || startLine < 1 || endLine < startLine) {
      alert('Line range is invalid: start line must be at least 1 and end line must be ≥ start line.');
      return;
    }

    try {
      const created = await api.post(`/bands/${activeBand.id}/discussions`, {
        title: discussionTitle.trim(),
        filePath: selectedFile,
        startLine,
        endLine,
        codeContext: discussionSnippet,
        type: 'DISCUSSION',
        priority: 'MEDIUM',
      });
      setDiscussions([created, ...discussions]);
      setIsDiscussionModalOpen(false);
      setDiscussionTitle('');
      setDiscussionSnippet('');
    } catch (err: any) {
      alert(`Discussion error: ${err.message}`);
    }
  }

  async function handleExplainCode() {
    setIsExplaining(true);
    try {
      const res = await api.post('/ai/explain-code', {
        code: fileContent,
        language: detectLanguage(selectedFile || ''),
      });
      setAiExplanation(res.explanation);
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    } finally {
      setIsExplaining(false);
    }
  }

function renderUnifiedDiff(patch: string) {
  const lines = patch.split('\n');
  return (
    <div className="font-mono text-xs overflow-auto h-full p-4 select-text bg-[#030303] text-zinc-300">
      {lines.map((line, idx) => {
        let lineClass = 'text-zinc-400 hover:bg-[#0c0c0c]';
        let gutter = ' ';
        if (line.startsWith('+') && !line.startsWith('+++')) {
          lineClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500';
          gutter = '+';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          lineClass = 'bg-red-950/40 text-red-300 border-l-2 border-red-500';
          gutter = '-';
        } else if (line.startsWith('@@')) {
          lineClass = 'bg-purple-950/30 text-purple-300 py-1 my-1 border-y border-purple-900/30 font-bold';
          gutter = '@';
        }
        return (
          <div key={idx} className={`flex items-start px-2 py-0.5 font-mono leading-relaxed ${lineClass}`}>
            <span className="w-9 text-zinc-600 text-right pr-3 select-none text-[11px] shrink-0">{idx + 1}</span>
            <span className="w-4 select-none font-bold text-center shrink-0">{gutter}</span>
            <span className="whitespace-pre flex-1">{line.slice(1) || ' '}</span>
          </div>
        );
      })}
    </div>
  );
}

  // No repository connected and no inspection context — show the honest
  // empty state instead of fabricated content (Code is VIEW-ONLY).
  if (repoChecked && !repo && !inspectionContext) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#000000] p-6 select-none">
        <div className="p-8 rounded-2xl bg-[#0c0c0c] border border-[#262626] max-w-md text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#cbd5e1]/10 border border-[#cbd5e1]/30 text-zinc-300 flex items-center justify-center mx-auto">
            <Code2 className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white mb-1">Code unavailable</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect or configure a GitHub repository to view the project's codebase here.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('traceability')}
            className="px-4 py-2 rounded-lg bg-[#161616] hover:bg-[#1e1e1e] text-xs font-semibold text-zinc-200 border border-[#262626] transition-colors"
          >
            Connect a repository →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full bg-[#000000] overflow-hidden select-none">
      {/* Monaco Editor Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">
        {/* Inspection Banner (if inspecting commit or PR) */}
        {inspectionContext && (
          <div className="border-b border-[#222222] bg-[#0c0c0c] px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
              <div className="flex items-center space-x-2 shrink-0">
                {inspectionContext.type === 'commit' ? (
                  <GitCommit className="w-4 h-4 text-emerald-400" />
                ) : (
                  <GitPullRequest className="w-4 h-4 text-purple-400" />
                )}
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Inspecting {inspectionContext.type === 'commit' ? 'Commit' : 'Pull Request'} [{inspectionContext.id.substring(0, 7)}]
                </span>
              </div>
              <span className="text-xs text-zinc-400 truncate max-w-sm">"{inspectionContext.title}"</span>

              {/* Files in this commit/PR pill strip */}
              {inspectionContext.files && inspectionContext.files.length > 1 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto shrink-0 pl-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Files:</span>
                  {inspectionContext.files.map((f) => (
                    <button
                      key={f.filename}
                      onClick={() => setActiveFilePath(f.filename)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        selectedFile === f.filename
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#161616] text-zinc-400 hover:text-white border border-[#262626]'
                      }`}
                      title={f.filename}
                    >
                      {f.filename.split('/').pop()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {activeFileDiff && (
                <div className="flex items-center bg-[#161616] rounded-md border border-[#2a2a2a] p-0.5 text-xs font-mono">
                  <button
                    onClick={() => setViewMode('diff')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      viewMode === 'diff' ? 'bg-[#262626] text-white font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Diff Highlights
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      viewMode === 'code' ? 'bg-[#262626] text-white font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Full File
                  </button>
                </div>
              )}

              <button
                onClick={() => setInspectionContext(null)}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors flex items-center space-x-1 border border-zinc-700"
                title="Exit inspection and return to live codebase"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit Inspection</span>
              </button>
            </div>
          </div>
        )}

        {/* Editor Tab bar */}
        <div className="h-11 border-b border-[#1a1a1a] px-4 flex items-center justify-between bg-[#0a0a0a] shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-sm font-mono text-zinc-200">{selectedFile || 'No file selected'}</span>
            {selectedFile && (
              <span className="text-xs text-zinc-500 font-mono">
                ({detectLanguage(selectedFile)})
              </span>
            )}
            {isLoadingFile && <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin" />}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={openDiscussionModal}
              className="px-3 py-1 rounded-md bg-[#bfdbfe]/10 hover:bg-[#bfdbfe]/20 border border-[#bfdbfe]/30 text-xs font-semibold text-[#bfdbfe] flex items-center space-x-1.5 transition-colors"
              title="Anchor a discussion on the selected lines (select code first, or lines 1–10 by default)"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-[#bfdbfe]" />
              <span>Discuss Code</span>
            </button>

            <button
              onClick={handleExplainCode}
              disabled={isExplaining}
              className="px-3 py-1 rounded-md bg-[#ddd6fe]/10 hover:bg-[#ddd6fe]/20 border border-[#ddd6fe]/30 text-xs font-semibold text-[#ddd6fe] flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ddd6fe]" />
              <span>{isExplaining ? 'Thinking...' : 'AI Explain'}</span>
            </button>
          </div>
        </div>

        {/* Editor or Diff View */}
        <div className="flex-1 relative bg-[#000000] overflow-hidden font-editor">
          {inspectionContext && viewMode === 'diff' && activeFileDiff ? (
            renderUnifiedDiff(activeFileDiff)
          ) : fileError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <p className="text-sm text-zinc-300">{fileError}</p>
              <p className="text-xs text-zinc-500 max-w-sm text-center">
                The file may not exist on the connected branch, or the repository connection needs
                to be refreshed in Git &amp; Traceability.
              </p>
            </div>
          ) : !selectedFile ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 p-6">
              <FileCode className="w-6 h-6 text-zinc-600" />
              <p className="text-sm text-zinc-400">Select a file from the repository tree to view it.</p>
            </div>
          ) : (
            <Editor
              height="100%"
              theme="vs-dark"
              language={detectLanguage(selectedFile || '')}
              value={fileContent}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: 'var(--font-inconsolata), monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
                readOnly: true,
              }}
            />
          )}
        </div>

        {/* AI Explanation Drawer (if active) */}
        {aiExplanation && (
          <div className="h-40 border-t border-[#1a1a1a] bg-[#0c0c0c] p-3.5 overflow-y-auto shrink-0 select-text">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-zinc-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>AI Code Analysis</span>
              </span>
              <button
                onClick={() => setAiExplanation(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
              {aiExplanation}
            </p>
          </div>
        )}
      </div>

      {/* Drag Resizer Handle for Discussions Panel */}
      <div
        onMouseDown={startDiscussionsResize}
        className="w-1 bg-[#1a1a1a] hover:bg-zinc-500 cursor-col-resize active:bg-white transition-colors shrink-0 z-10"
        title="Drag to resize discussions"
      />

      {/* Right Column: Code-Anchored Discussions */}
      <div
        style={{ width: `${discussionsWidth}px` }}
        className="border-l border-[#1a1a1a] bg-[#080808] flex flex-col shrink-0 select-none"
      >
        <div className="p-3 border-b border-[#1a1a1a] bg-[#0e0e0e] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Anchored Discussions ({discussions.length})
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">{(selectedFile || '').split('/').pop()}</span>
          </div>
          {/* Chat search: matches discussion text and replies */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search discussions & chat…"
              className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {discussions.map((d) => {
            const authorColor = signatureColorFor(d.author);
            return (
            <div
              key={d.id}
              onClick={() => openThread(d)}
              className="p-3.5 rounded-lg bg-[#121212] border border-[#222222] space-y-2 select-text cursor-pointer hover:bg-[#161616] transition-colors"
              style={{ borderLeft: `3px solid ${authorColor}` }}
              title="Open discussion chat"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-100 truncate pr-2">{d.title}</span>
                <span className="flex items-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (d.startLine && d.endLine) jumpToLines(d.startLine, d.endLine);
                    }}
                    className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[#bfdbfe] border border-[#2c2c2c] hover:bg-[#252525] hover:border-[#3a3a3a]"
                    title="Jump to anchored lines in editor"
                  >
                    L{d.startLine}-{d.endLine}
                  </button>
                  {canDeleteDiscussions && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDiscussion(d);
                      }}
                      className="ml-1 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete discussion (creator / crew lead)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              </div>
              {d.codeContext && (
                <pre className="text-xs font-mono p-2 rounded bg-[#090909] text-zinc-300 overflow-x-auto border border-[#1f1f1f] max-h-28">
                  {d.codeContext}
                </pre>
              )}
              {d.description && (
                <p className="text-xs text-zinc-400 line-clamp-2">{d.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center space-x-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: authorColor }}
                  />
                  <span className="font-semibold" style={{ color: authorColor }}>
                    {d.author?.displayName || 'User'}
                  </span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1 text-zinc-400">
                    <MessageSquare className="w-3 h-3" />
                    <span>{d._count?.replies ?? 0}</span>
                  </span>
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Anchored</span>
                  </span>
                </span>
              </div>
            </div>
            );
          })}

          {discussions.length === 0 && (
            <div className="h-44 flex flex-col items-center justify-center text-center text-zinc-500 p-4">
              <p className="text-sm">
                {activeSearch
                  ? `No discussions match “${activeSearch}”`
                  : 'No discussions anchored on this file'}
              </p>
              {!activeSearch && (
                <button
                  onClick={openDiscussionModal}
                  className="mt-2 text-xs text-zinc-400 hover:text-white underline"
                >
                  Start a discussion
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Discussion Modal */}
      {isDiscussionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-md p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Anchor Code Discussion</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Anchor this discussion to lines {startLine}-{endLine} of {selectedFile}.
            </p>
            <form onSubmit={handleCreateDiscussion} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Discussion Topic
                </label>
                <input
                  type="text"
                  value={discussionTitle}
                  onChange={(e) => setDiscussionTitle(e.target.value)}
                  placeholder="e.g. Ensure TLS support for cloud redis pool"
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                  required
                />
              </div>

              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Start Line
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={startLine}
                    onChange={(e) => setStartLine(Number(e.target.value))}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    End Line
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={endLine}
                    onChange={(e) => setEndLine(Number(e.target.value))}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Anchored Code Snippet
                </label>
                <textarea
                  value={discussionSnippet}
                  onChange={(e) => setDiscussionSnippet(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg p-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-400 h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDiscussionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Create Anchor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discussion Chat Window */}
      {activeThreadId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-lg h-[70vh] flex flex-col rounded-xl shadow-2xl overflow-hidden">
            {/* Thread header */}
            <div className="p-3.5 border-b border-[#222222] bg-[#0c0c0c] flex items-start justify-between shrink-0">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white truncate">{thread?.title}</span>
                  {thread?.startLine && thread?.endLine && (
                    <button
                      onClick={() => jumpToLines(thread.startLine, thread.endLine)}
                      className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[#bfdbfe] border border-[#2c2c2c] hover:bg-[#252525] shrink-0"
                      title="Jump to anchored lines in editor"
                    >
                      L{thread.startLine}-{thread.endLine}
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1 text-xs text-zinc-400">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: signatureColorFor(thread?.author) }}
                  />
                  <span className="font-semibold" style={{ color: signatureColorFor(thread?.author) }}>
                    {thread?.author?.displayName || 'User'}
                  </span>
                  <span className="font-mono text-zinc-500">{selectedFile}</span>
                  <span
                    className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      thread?.status === 'RESOLVED'
                        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                        : 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                    }`}
                  >
                    {thread?.status || 'OPEN'}
                  </span>
                </div>
              </div>
              <button
                onClick={closeThread}
                className="text-zinc-500 hover:text-white p-1 rounded transition-colors shrink-0"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thread messages */}
            <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 select-text">
              {threadLoading && !thread?.replies?.length ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Opening post */}
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <img
                        src={
                          thread?.author?.avatarUrl ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${thread?.author?.username}`
                        }
                        alt={thread?.author?.displayName}
                        className="w-6 h-6 rounded-full border-2"
                        style={{ borderColor: signatureColorFor(thread?.author) }}
                      />
                      <span
                        className="text-xs font-bold"
                        style={{ color: signatureColorFor(thread?.author) }}
                      >
                        {thread?.author?.displayName || 'User'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {thread?.createdAt
                          ? new Date(thread.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    {thread?.codeContext && (
                      <pre className="text-xs font-mono p-2.5 rounded-lg bg-[#090909] text-zinc-300 overflow-x-auto border border-[#1f1f1f]">
                        {thread.codeContext}
                      </pre>
                    )}
                    {thread?.description && (
                      <p className="text-sm text-zinc-300 leading-relaxed">{thread.description}</p>
                    )}
                  </div>

                  {thread?.replies?.length ? (
                    thread.replies.map((r: any) => (
                      <div key={r.id} className="flex items-start space-x-2">
                        <img
                          src={
                            r.author?.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${r.author?.username}`
                          }
                          alt={r.author?.displayName}
                          className="w-6 h-6 rounded-full mt-0.5 border-2 shrink-0"
                          style={{ borderColor: signatureColorFor(r.author) }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline space-x-2">
                            <span
                              className="text-xs font-bold"
                              style={{ color: signatureColorFor(r.author) }}
                            >
                              {r.author?.displayName || 'User'}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(r.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed break-words mt-0.5 bg-[#141414] border border-[#222222] rounded-lg p-2.5">
                            {r.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-zinc-500 italic py-4">
                      No replies yet — start the conversation.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSendReply} className="p-2.5 border-t border-[#222222] bg-[#0c0c0c] shrink-0">
              <div className="flex items-end space-x-2">
                <textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e as any);
                    }
                  }}
                  placeholder="Reply to this discussion… (Enter to send, Shift+Enter for a new line)"
                  rows={2}
                  className="flex-1 bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 resize-none"
                />
                <button
                  type="submit"
                  disabled={!replyInput.trim() || isSendingReply}
                  className="h-9 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white flex items-center space-x-1.5 text-xs font-semibold transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
