'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileText,
  Save,
  History,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Network,
  Plus,
  Search,
  CheckSquare,
  ListFilter,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

type PrdMode = 'document' | 'map' | 'requirements';

interface Requirement {
  id: string;
  identifier: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'IMPLEMENTED' | 'DEPRECATED';
  changeState: 'NEW' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED' | 'AT_RISK' | 'BLOCKED';
  acceptanceCriteria: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export default function PrdView() {
  const { activeBand, setActiveTab } = useWorkspaceStore();
  const [activeMode, setActiveMode] = useState<PrdMode>('document');

  // PRD Document & Version State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Requirements Domain State
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);

  // Column Resizing States
  const [historyWidth, setHistoryWidth] = useState(250);
  const [reqListWidth, setReqListWidth] = useState(360);
  const isDraggingHistoryRef = useRef(false);
  const isDraggingReqListRef = useRef(false);
  const dragStartXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDraggingHistoryRef.current) {
        const delta = e.clientX - dragStartXRef.current;
        const newWidth = Math.max(180, Math.min(460, startWidthRef.current + delta));
        setHistoryWidth(newWidth);
      } else if (isDraggingReqListRef.current) {
        const delta = e.clientX - dragStartXRef.current;
        const newWidth = Math.max(240, Math.min(550, startWidthRef.current + delta));
        setReqListWidth(newWidth);
      }
    }

    function handleMouseUp() {
      if (isDraggingHistoryRef.current || isDraggingReqListRef.current) {
        isDraggingHistoryRef.current = false;
        isDraggingReqListRef.current = false;
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

  function startHistoryResize(e: React.MouseEvent) {
    isDraggingHistoryRef.current = true;
    dragStartXRef.current = e.clientX;
    startWidthRef.current = historyWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function startReqListResize(e: React.MouseEvent) {
    isDraggingReqListRef.current = true;
    dragStartXRef.current = e.clientX;
    startWidthRef.current = reqListWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // Create Requirement Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newCriteriaText, setNewCriteriaText] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // Gemini AI Sketch & Generator State
  const [isSketchModalOpen, setIsSketchModalOpen] = useState(false);
  const [sketchInput, setSketchInput] = useState('');
  const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);
  const [sketchError, setSketchError] = useState<string | null>(null);
  const [lineageMeta, setLineageMeta] = useState<{
    problem: string;
    targetUsers: string;
    coreCapabilities: string;
  } | null>(null);

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSketchModalOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!activeBand) return;
    loadPrd();
    loadRequirements();
  }, [activeBand]);

  async function loadPrd() {
    if (!activeBand) return;
    try {
      const data = await api.get(`/bands/${activeBand.id}/prd`);
      if (data) {
        setTitle(data.title || 'Product Requirements Document');
        const loadedContent = data.currentVersion?.content || data.content || '';
        setContent(loadedContent);
        setVersions(data.versions || []);
        if (data.versions && data.versions.length > 0) {
          setSelectedVersion(data.versions[0]);
        }

        // Reconstruct visual lineage meta from PRD markdown if present
        if (loadedContent) {
          const problemMatch = loadedContent.match(/##\s*2\.\s*Problem Statement\s*\n+([\s\S]*?)(?=\n##|$)/i);
          const usersMatch = loadedContent.match(/##\s*3\.\s*Target Personas?\s*\n+([\s\S]*?)(?=\n##|$)/i);
          const capMatch = loadedContent.match(/##\s*4\.\s*Functional Scope\s*\n+([\s\S]*?)(?=\n##|$)/i);

          const cleanText = (str?: string) =>
            str ? str.replace(/[-*#>`]/g, '').trim().split('\n')[0].substring(0, 140) : '';

          setLineageMeta({
            problem: cleanText(problemMatch?.[1]) || '',
            targetUsers: cleanText(usersMatch?.[1]) || '',
            coreCapabilities: cleanText(capMatch?.[1]) || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load PRD', err);
    }
  }

  async function loadRequirements() {
    if (!activeBand) return;
    try {
      const reqs = await api.get(`/bands/${activeBand.id}/requirements`);
      setRequirements(reqs || []);
      if (reqs && reqs.length > 0 && !selectedRequirement) {
        setSelectedRequirement(reqs[0]);
      }
    } catch (err) {
      console.error('Failed to load requirements', err);
    }
  }

  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefreshDiagram() {
    setIsRefreshing(true);
    try {
      await Promise.all([loadPrd(), loadRequirements()]);
      setSuccessMessage('Refreshed PRD diagram');
      setTimeout(() => setSuccessMessage(null), 2500);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleGenerateFromSketch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!activeBand || !sketchInput.trim()) return;
    setIsGeneratingSketch(true);
    setSketchError(null);
    try {
      const res = await api.post(`/ai/bands/${activeBand.id}/generate-from-sketch`, {
        sketch: sketchInput.trim(),
      });
      setTitle(res.prd?.title || `${activeBand.name} — PRD`);
      setContent(res.prd?.content || '');
      setLineageMeta({
        problem: res.prd?.problem || '',
        targetUsers: res.prd?.targetUsers || '',
        coreCapabilities: res.prd?.coreCapabilities || '',
      });
      setIsSketchModalOpen(false);
      setSketchInput('');
      setSuccessMessage('Project Spec, Requirements & Architecture generated via Gemini');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadPrd();
      await loadRequirements();
    } catch (err: any) {
      setSketchError(err.message || 'Generation failed');
    } finally {
      setIsGeneratingSketch(false);
    }
  }

  // Visual Map ReactFlow nodes & edges
  const [mapNodes, setMapNodes] = useState<Node[]>([]);
  const [mapEdges, setMapEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const isFridayCore = activeBand?.slug === 'friday-core' || activeBand?.slug === 'weday-core' || activeBand?.name === 'Friday Core' || activeBand?.name === 'WEday Core';

    if (isFridayCore) {
      const nodes: Node[] = [
        {
          id: 'node-problem',
          position: { x: 50, y: 150 },
          data: {
            label: (
              <div className="p-2">
                <div className="text-xs font-mono uppercase text-zinc-400 font-bold mb-1">
                  Problem
                </div>
                <div className="text-sm font-semibold text-white">Disjointed Planning & Code</div>
                <p className="text-xs text-zinc-400 mt-1 leading-tight">
                  Specs drift away from active codebase without live linkage.
                </p>
              </div>
            ),
          },
          style: {
            background: '#111111',
            border: '1px solid #333333',
            borderRadius: '10px',
            width: 220,
          },
        },
        {
          id: 'node-users',
          position: { x: 340, y: 60 },
          data: {
            label: (
              <div className="p-2">
                <div className="text-xs font-mono uppercase text-zinc-400 font-bold mb-1">
                  Primary Users
                </div>
                <div className="text-sm font-semibold text-white">Founding Engineers & Clients</div>
                <p className="text-xs text-zinc-400 mt-1 leading-tight">
                  Engineers seeking tight specs and clients tracking milestones.
                </p>
              </div>
            ),
          },
          style: {
            background: '#111111',
            border: '1px solid #333333',
            borderRadius: '10px',
            width: 220,
          },
        },
        {
          id: 'node-features',
          position: { x: 340, y: 240 },
          data: {
            label: (
              <div className="p-2">
                <div className="text-xs font-mono uppercase text-zinc-400 font-bold mb-1">
                  Core Capabilities
                </div>
                <div className="text-sm font-semibold text-white">Living Planning Engine</div>
                <p className="text-xs text-zinc-400 mt-1 leading-tight">
                  Traceability, Realtime Presence, Visual Architecture, Git Context.
                </p>
              </div>
            ),
          },
          style: {
            background: '#111111',
            border: '1px solid #333333',
            borderRadius: '10px',
            width: 220,
          },
        },
      ];

      const edges: Edge[] = [
        {
          id: 'edge-prob-users',
          source: 'node-problem',
          target: 'node-users',
          animated: true,
          style: { stroke: '#555555' },
        },
        {
          id: 'edge-prob-feat',
          source: 'node-problem',
          target: 'node-features',
          animated: true,
          style: { stroke: '#555555' },
        },
      ];

      requirements.forEach((req, idx) => {
        const nodeId = `node-req-${req.id}`;
        const yOffset = 40 + idx * 130;

        nodes.push({
          id: nodeId,
          position: { x: 640, y: yOffset },
          data: {
            label: (
              <div
                className="p-2 cursor-pointer"
                onClick={() => {
                  setSelectedRequirement(req);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                    {req.identifier}
                  </span>
                  <span className="text-xs font-mono uppercase px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300">
                    {req.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white truncate">{req.title}</div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{req.description}</p>
              </div>
            ),
          },
          style: {
            background: '#111111',
            border: '1px solid #333333',
            borderRadius: '10px',
            width: 240,
          },
        });

        edges.push({
          id: `edge-feat-req-${req.id}`,
          source: 'node-features',
          target: nodeId,
          style: { stroke: '#444444' },
        });
      });

      setMapNodes(nodes);
      setMapEdges(edges);
      return;
    }

    // Dynamic Lineage for other bands
    if (requirements.length === 0 && !lineageMeta && !content.trim()) {
      setMapNodes([]);
      setMapEdges([]);
      return;
    }

    const problemText = lineageMeta?.problem || `Solves workflow and engineering challenges for ${activeBand?.name || 'this project'}`;
    const usersText = lineageMeta?.targetUsers || 'Target users, system operators, and stakeholders';
    const capText =
      lineageMeta?.coreCapabilities ||
      (requirements.length > 0
        ? requirements.slice(0, 3).map((r) => r.title).join(', ')
        : 'Core system features and APIs');

    const nodes: Node[] = [
      {
        id: 'node-problem',
        position: { x: 50, y: 140 },
        data: {
          label: (
            <div className="p-2.5">
              <div className="text-[11px] font-mono uppercase text-[#ddd6fe] font-bold mb-1 tracking-wider">Step 1: Problem</div>
              <div className="text-sm font-semibold text-white truncate">{activeBand?.name} Goal</div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{problemText}</p>
            </div>
          ),
        },
        style: { background: 'rgba(221, 214, 254, 0.06)', border: '1px solid rgba(221, 214, 254, 0.35)', borderRadius: '10px', width: 230 },
      },
      {
        id: 'node-users',
        position: { x: 330, y: 140 },
        data: {
          label: (
            <div className="p-2.5">
              <div className="text-[11px] font-mono uppercase text-[#bfdbfe] font-bold mb-1 tracking-wider">Step 2: Audience</div>
              <div className="text-sm font-semibold text-white">Target Users</div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{usersText}</p>
            </div>
          ),
        },
        style: { background: 'rgba(191, 219, 254, 0.06)', border: '1px solid rgba(191, 219, 254, 0.35)', borderRadius: '10px', width: 230 },
      },
      {
        id: 'node-features',
        position: { x: 610, y: 140 },
        data: {
          label: (
            <div className="p-2.5">
              <div className="text-[11px] font-mono uppercase text-[#a7f3d0] font-bold mb-1 tracking-wider">Step 3: Core Scope</div>
              <div className="text-sm font-semibold text-white">Main Features</div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{capText}</p>
            </div>
          ),
        },
        style: { background: 'rgba(167, 243, 208, 0.06)', border: '1px solid rgba(167, 243, 208, 0.35)', borderRadius: '10px', width: 230 },
      },
    ];

    const edges: Edge[] = [
      { id: 'edge-prob-users', source: 'node-problem', target: 'node-users', animated: true, style: { stroke: '#475569' } },
      { id: 'edge-users-features', source: 'node-users', target: 'node-features', animated: true, style: { stroke: '#475569' } },
    ];

    requirements.forEach((req, idx) => {
      const nodeId = `node-req-${req.id}`;
      const yOffset = requirements.length === 1 ? 140 : 40 + idx * 130;
      nodes.push({
        id: nodeId,
        position: { x: 890, y: yOffset },
        data: {
          label: (
            <div className="p-2.5 cursor-pointer" onClick={() => setSelectedRequirement(req)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#1c1c1c] text-emerald-300 border border-[#2c2c2c]">
                  {req.identifier}
                </span>
                <span className="text-xs font-mono uppercase px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300">
                  {req.priority}
                </span>
              </div>
              <div className="text-sm font-semibold text-white truncate">{req.title}</div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{req.description}</p>
            </div>
          ),
        },
        style: { background: 'rgba(191, 219, 254, 0.04)', border: '1px solid rgba(191, 219, 254, 0.25)', borderRadius: '10px', width: 240 },
      });

      edges.push({
        id: `edge-feat-req-${req.id}`,
        source: 'node-features',
        target: nodeId,
        style: { stroke: '#444444' },
      });
    });

    setMapNodes(nodes);
    setMapEdges(edges);
  }, [requirements, activeBand, lineageMeta, content]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setMapNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setMapEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  async function handleSaveVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !content.trim()) return;
    setIsSaving(true);
    setSuccessMessage(null);
    try {
      const newVersion = await api.post(`/bands/${activeBand.id}/prd/versions`, {
        title: title || 'Product Requirements Document',
        content,
        changeSummary: changeSummary || 'Updated requirements document',
      });
      setVersions([newVersion, ...versions]);
      setSelectedVersion(newVersion);
      setChangeSummary('');
      setSuccessMessage(`Saved version v${newVersion.versionNumber}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Auto-synthesize system architecture from PRD in the background
      api.post(`/ai/bands/${activeBand.id}/generate-architecture-from-prd`, { content }).catch((err) => {
        console.warn('Auto architecture synthesis background notice:', err);
      });
    } catch (err: any) {
      alert(`Error saving version: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !newTitle.trim() || !newDesc.trim()) return;
    setIsSubmittingReq(true);
    try {
      const criteriaList = newCriteriaText
        .split('\n')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const created = await api.post<Requirement>(`/bands/${activeBand.id}/requirements`, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        acceptanceCriteria: criteriaList,
      });

      setRequirements([...requirements, created]);
      setSelectedRequirement(created);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewCriteriaText('');
      setSuccessMessage(`Created requirement ${created.identifier}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Failed to create requirement: ${err.message}`);
    } finally {
      setIsSubmittingReq(false);
    }
  }

  async function handleUpdateRequirementStatus(reqId: string, status: Requirement['status']) {
    if (!activeBand) return;
    try {
      const updated = await api.patch<Requirement>(
        `/bands/${activeBand.id}/requirements/${reqId}`,
        { status },
      );
      setRequirements(requirements.map((r) => (r.id === reqId ? updated : r)));
      if (selectedRequirement?.id === reqId) {
        setSelectedRequirement(updated);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  }

  async function handleAnalyzeAi() {
    if (!content.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await api.post('/ai/analyze-prd', { content });
      setAiAnalysis(result);
    } catch (err: any) {
      alert(`AI Analysis error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        r.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requirements, statusFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-hidden select-none">
      {/* Top Action Bar */}
      <div className="h-12 border-b border-[#1a1a1a] px-4 flex items-center justify-between bg-[#0a0a0a] shrink-0 overflow-x-auto gap-4 scrollbar-thin">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2 shrink-0">
            <FileText className="w-4 h-4 text-zinc-300 shrink-0" />
            <span className="text-sm font-bold text-white tracking-wide uppercase whitespace-nowrap">PRODUCT REQUIREMENTS</span>
          </div>

          {/* Mode Pill Switcher */}
          <div className="flex items-center bg-[#101010] p-1 rounded-lg border border-[#222222] space-x-1 shrink-0">
            <button
              onClick={() => setActiveMode('document')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                activeMode === 'document'
                  ? 'bg-[#bfdbfe]/15 text-[#dbeafe] border border-[#bfdbfe]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 shrink-0 ${activeMode === 'document' ? 'text-[#bfdbfe]' : ''}`} />
              <span className="whitespace-nowrap">Living Doc</span>
            </button>
            <button
              onClick={() => setActiveMode('requirements')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                activeMode === 'requirements'
                  ? 'bg-[#a7f3d0]/15 text-[#d1fae5] border border-[#a7f3d0]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <ListFilter className={`w-3.5 h-3.5 shrink-0 ${activeMode === 'requirements' ? 'text-[#a7f3d0]' : ''}`} />
              <span className="whitespace-nowrap">Requirements ({requirements.length})</span>
            </button>
            <button
              onClick={() => setActiveMode('map')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                activeMode === 'map'
                  ? 'bg-[#ddd6fe]/15 text-[#ede9fe] border border-[#ddd6fe]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Network className={`w-3.5 h-3.5 shrink-0 ${activeMode === 'map' ? 'text-[#ddd6fe]' : ''}`} />
              <span className="whitespace-nowrap">Visual PRD Map</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          {successMessage && (
            <span className="text-xs text-[#a7f3d0] flex items-center space-x-1 mr-2 font-medium shrink-0 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#a7f3d0] shrink-0" />
              <span>{successMessage}</span>
            </span>
          )}

          {/* Refresh Diagram Button */}
          <button
            onClick={handleRefreshDiagram}
            disabled={isRefreshing}
            className="h-8 px-3.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-zinc-300 hover:text-white border border-[#2a2a2a] text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all disabled:opacity-50 shrink-0"
            title="Reload PRD spec and requirements from database and redraw diagram"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#a7f3d0] shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">Refresh</span>
          </button>

          {/* AI Generator Button (Clean pastel mint fill and border) */}
          <button
            onClick={() => setIsSketchModalOpen(true)}
            className="h-8 px-4 rounded-lg bg-[#a7f3d0]/10 hover:bg-[#a7f3d0]/20 text-[#d1fae5] border border-[#a7f3d0]/35 text-xs font-semibold flex items-center space-x-2 shadow-sm transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
            title="Press ⌘K or Ctrl+K to activate AI generator"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#a7f3d0] shrink-0" />
            <span className="whitespace-nowrap">What are we building today?</span>
            <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/40 border border-[#a7f3d0]/30 rounded text-[#a7f3d0] shrink-0">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 px-3.5 rounded-lg bg-[#bfdbfe]/10 hover:bg-[#bfdbfe]/20 text-[#dbeafe] border border-[#bfdbfe]/35 text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#bfdbfe] shrink-0" />
            <span className="whitespace-nowrap">New Requirement</span>
          </button>

          <button
            onClick={handleAnalyzeAi}
            disabled={isAnalyzing || !content.trim()}
            className="h-8 px-3.5 rounded-lg bg-[#ddd6fe]/10 hover:bg-[#ddd6fe]/20 text-[#ede9fe] border border-[#ddd6fe]/35 text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-colors disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ddd6fe] shrink-0" />
            <span className="whitespace-nowrap">{isAnalyzing ? 'Analyzing...' : 'AI PRD Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area based on Active Mode */}
      <div className="flex-1 flex overflow-hidden bg-[#000000]">
        {/* MODE 1: LIVING DOCUMENT VIEW */}
        {activeMode === 'document' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Version History */}
            <div
              style={{ width: `${historyWidth}px` }}
              className="border-r border-[#1a1a1a] bg-[#080808] flex flex-col shrink-0 select-none"
            >
              <div className="p-3 border-b border-[#1a1a1a] bg-[#0e0e0e] flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Version History ({versions.length})</span>
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {versions.map((v) => {
                  const isSelected = selectedVersion?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVersion(v);
                        setContent(v.content);
                        setTitle(v.title);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-[#1e1e1e] text-white border border-zinc-600'
                          : 'text-zinc-400 hover:bg-[#141414] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-mono">v{v.versionNumber}</span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 truncate">
                        {v.changeSummary || 'Requirement update'}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        by {v.createdBy?.displayName || 'User'}
                      </p>
                    </button>
                  );
                })}

                {versions.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-6">No versions recorded yet</p>
                )}
              </div>
            </div>

            {/* Drag Handle between History and Editor */}
            <div
              onMouseDown={startHistoryResize}
              className="w-1 bg-[#1a1a1a] hover:bg-zinc-500 cursor-col-resize active:bg-white transition-colors shrink-0 z-10"
              title="Drag to resize history"
            />

            {/* Center: Living PRD Document Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">
              <div className="flex-1 flex flex-col p-4 bg-[#000000] overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    PRD Content (Markdown Specification)
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {requirements.length} linked requirements in this Band
                  </span>
                </div>

                <div className="relative flex-1 flex flex-col">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="# 1. Problem Statement&#10;&#10;Describe the software planning challenges...&#10;&#10;# 2. Product Objectives&#10;- Unify fragmented workflows&#10;&#10;# 3. Living Requirements&#10;FR-001 Authentication Flow&#10;FR-002 Realtime Presence"
                    className="flex-1 w-full bg-[#0a0a0a] border border-[#222222] rounded-xl p-4 text-sm font-inconsolata font-mono text-zinc-200 leading-relaxed placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                  />

                  {!content.trim() && (
                    <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center border border-[#222222] z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
                        <Sparkles className="w-7 h-7 text-emerald-400 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        What are we building today?
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-md mb-5 leading-relaxed">
                        Start with a simple sketch or raw problem description. Gemini will synthesize a full PRD, living requirements, PRD lineage map, and initial system architecture.
                      </p>
                      <button
                        onClick={() => setIsSketchModalOpen(true)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Formulate with AI</span>
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-black/25 rounded text-black/90 font-bold ml-1">
                          ⌘K
                        </kbd>
                      </button>
                      <button
                        onClick={() =>
                          setContent(
                            `# ${activeBand?.name || 'Project'} PRD\n\n## 1. Problem Statement\n\n## 2. Target Audience\n\n## 3. Core Capabilities\n\n## 4. Key Functional Requirements\n`
                          )
                        }
                        className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
                      >
                        or start writing from a blank template
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Save Bar */}
                <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex items-center justify-between select-none">
                  <div className="flex items-center space-x-2 flex-1 max-w-md mr-4">
                    <input
                      type="text"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="Version change summary (e.g. Added real-time sync requirements)..."
                      className="w-full bg-[#121212] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  <button
                    onClick={handleSaveVersion}
                    disabled={isSaving || !content.trim()}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white flex items-center space-x-1.5 disabled:opacity-50 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save New Version'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: AI Blueprint / Suggestions Panel */}
            {aiAnalysis && (
              <div className="w-80 bg-[#080808] flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 border-l border-[#1a1a1a]">
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-300 uppercase tracking-wider pb-2 border-b border-[#1a1a1a]">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>AI Architecture Blueprint</span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Executive Summary
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{aiAnalysis.summary}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Key Features Extracted
                  </h4>
                  <div className="space-y-1.5">
                    {aiAnalysis.keyFeatures?.map((feat: string, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs text-zinc-300 p-2.5 rounded bg-[#121212] border border-[#222222] flex items-start space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveMode('requirements')}
                  className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Convert into Structured Requirements</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: STRUCTURED REQUIREMENTS MATRIX */}
        {activeMode === 'requirements' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Requirements List & Filter */}
            <div
              style={{ width: `${reqListWidth}px` }}
              className="border-r border-[#1a1a1a] bg-[#080808] flex flex-col shrink-0 select-none"
            >
              {/* Filter / Search toolbar */}
              <div className="p-3 border-b border-[#1a1a1a] bg-[#0e0e0e] space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search requirements (e.g. FR-001)..."
                    className="w-full bg-[#141414] border border-[#222222] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="flex items-center space-x-1 text-xs overflow-x-auto pb-1">
                  {['ALL', 'DRAFT', 'REVIEW_REQUIRED', 'APPROVED', 'IMPLEMENTED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all shrink-0 ${
                        statusFilter === st
                          ? 'bg-[#222222] text-white border border-zinc-600'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement Cards List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {filteredRequirements.map((req) => {
                  const isSelected = selectedRequirement?.id === req.id;
                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequirement(req)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1a1a1a] border-zinc-500 shadow-md'
                          : 'bg-[#121212] border-[#222222] hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                          {req.identifier}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-[#1a1a1a] text-zinc-300 border border-[#2c2c2c]">
                            {req.status}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white mt-2 truncate">{req.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1f1f1f] text-xs text-zinc-500">
                        <span>{req.acceptanceCriteria?.length || 0} criteria</span>
                        <span className="font-mono">Priority: {req.priority}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredRequirements.length === 0 && (
                  <div className="p-8 text-center text-zinc-500 space-y-2">
                    <p className="text-sm">No requirements match filter</p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3 py-1.5 rounded bg-zinc-800 text-white text-xs font-semibold"
                    >
                      Create First Requirement
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drag Handle between Requirements List and Inspector */}
            <div
              onMouseDown={startReqListResize}
              className="w-1 bg-[#1a1a1a] hover:bg-zinc-500 cursor-col-resize active:bg-white transition-colors shrink-0 z-10"
              title="Drag to resize list"
            />

            {/* Right: Requirement Detail Inspector */}
            <div className="flex-1 flex flex-col bg-[#000000] overflow-y-auto p-6">
              {selectedRequirement ? (
                <div className="max-w-3xl w-full space-y-6">
                  {/* Title & Stable Identifier Banner */}
                  <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#1f1f1f] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-md bg-[#1c1c1c] text-zinc-200 border border-[#2c2c2c]">
                          {selectedRequirement.identifier}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md font-semibold uppercase bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                          {selectedRequirement.status}
                        </span>
                      </div>

                      {/* Status Transition Action Buttons */}
                      <div className="flex items-center space-x-2">
                        {selectedRequirement.status !== 'APPROVED' && (
                          <button
                            onClick={() =>
                              handleUpdateRequirementStatus(selectedRequirement.id, 'APPROVED')
                            }
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Approve</span>
                          </button>
                        )}
                        {selectedRequirement.status !== 'REVIEW_REQUIRED' && (
                          <button
                            onClick={() =>
                              handleUpdateRequirementStatus(selectedRequirement.id, 'REVIEW_REQUIRED')
                            }
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center space-x-1"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Request Review</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-white">{selectedRequirement.title}</h2>
                    <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                      {selectedRequirement.description}
                    </p>
                  </div>

                  {/* Acceptance Criteria Checklist */}
                  <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#1f1f1f] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <CheckSquare className="w-4 h-4 text-zinc-400" />
                        <span>Acceptance Criteria</span>
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {selectedRequirement.acceptanceCriteria?.length || 0} items
                      </span>
                    </div>

                    <div className="space-y-2">
                      {selectedRequirement.acceptanceCriteria?.map((criteria, idx) => (
                        <div
                          key={idx}
                          className="flex items-start space-x-3 p-3 rounded-lg bg-[#141414] border border-[#222222] text-sm text-zinc-200"
                        >
                          <div className="w-5 h-5 rounded border border-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs text-zinc-400 font-mono">{idx + 1}</span>
                          </div>
                          <span className="leading-relaxed">{criteria}</span>
                        </div>
                      ))}

                      {(!selectedRequirement.acceptanceCriteria ||
                        selectedRequirement.acceptanceCriteria.length === 0) && (
                        <p className="text-sm text-zinc-500 italic py-2">
                          No explicit acceptance criteria specified yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Connected Planning Domain Context */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1f1f1f] space-y-2">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Network className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Architecture Linkage</span>
                      </span>
                      <p className="text-xs text-zinc-400">
                        Mapped to system architecture components.
                      </p>
                      <button
                        onClick={() => setActiveTab('architecture')}
                        className="text-xs text-zinc-200 hover:text-white flex items-center space-x-1 font-semibold mt-1"
                      >
                        <span>Inspect in Architecture View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1f1f1f] space-y-2">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Implementation Tracking</span>
                      </span>
                      <p className="text-xs text-zinc-400">
                        Linked tasks and verified milestone delivery.
                      </p>
                      <button
                        onClick={() => setActiveTab('tasks')}
                        className="text-xs text-zinc-200 hover:text-white flex items-center space-x-1 font-semibold mt-1"
                      >
                        <span>View Linked Tasks</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <ListFilter className="w-8 h-8 text-zinc-600" />
                  <p className="text-sm">Select a requirement from the list to inspect</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 3: VISUAL PRD MAP */}
        {activeMode === 'map' && (
          <div className="flex-1 relative w-full h-full bg-[#000000]">
            {mapNodes.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
                  <Network className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  No PRD Lineage Map Yet
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mb-5 leading-relaxed">
                  Generate your project specification with Gemini to automatically construct the Problem → Users → Capabilities → Requirements lineage graph.
                </p>
                <button
                  onClick={() => setIsSketchModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Activate AI Generator</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-black/25 rounded text-black/90 font-bold ml-1">
                    ⌘K
                  </kbd>
                </button>
              </div>
            ) : (
              <ReactFlow
                nodes={mapNodes}
                edges={mapEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                className="bg-[#000000]"
              >
                <Background color="#222222" gap={20} size={1} />
                <Controls className="bg-[#121212] border border-[#262626] text-zinc-300 fill-zinc-300" />
              </ReactFlow>
            )}

            {/* Map Legend Overlay */}
            {mapNodes.length > 0 && (
              <>
                <div className="absolute top-4 left-4 p-3 rounded-xl bg-[#0e0e0e]/90 border border-[#222222] backdrop-blur-md text-xs space-y-1.5 pointer-events-none select-none z-10">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <Network className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Visual PRD Lineage</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Problem Statement → Users → Features → Requirements (FR-xxx)
                  </p>
                </div>

                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={handleRefreshDiagram}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 rounded-xl bg-[#0e0e0e]/90 hover:bg-[#1a1a1a] border border-[#262626] backdrop-blur-md text-xs font-semibold text-zinc-300 hover:text-white flex items-center space-x-1.5 shadow-lg transition-all disabled:opacity-50"
                    title="Reload and re-render PRD lineage diagram"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Refresh Diagram</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create Requirement */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-[#0e0e0e] border border-[#262626] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2 text-sm font-bold text-white">
                <Plus className="w-4 h-4 text-zinc-300" />
                <span>Create New Requirement</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Realtime Collaborative Canvas"
                  required
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detailed specification of what must be built and why..."
                  required
                  rows={3}
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Acceptance Criteria (One per line)
                </label>
                <textarea
                  value={newCriteriaText}
                  onChange={(e) => setNewCriteriaText(e.target.value)}
                  placeholder="Must support multiplayer cursors&#10;Must persist canvas state with debouncing&#10;Must survive network disconnects"
                  rows={3}
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 resize-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#222222] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#242424] text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq || !newTitle.trim() || !newDesc.trim()}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shadow-md disabled:opacity-50"
                >
                  {isSubmittingReq ? 'Creating...' : 'Create Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI "What are we building today?" Generator */}
      {isSketchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#0c0c0c] border border-emerald-500/30 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl shadow-emerald-950/40 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>What are we building today?</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Gemini Powered
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    For <span className="text-zinc-200 font-semibold">{activeBand?.name}</span>. Enter a rough sketch, feature wish-list, or user problem.
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isGeneratingSketch && setIsSketchModalOpen(false)}
                disabled={isGeneratingSketch}
                className="text-zinc-400 hover:text-white text-sm p-1 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Describe your concept or sketch</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Markdown / Natural language
                  </span>
                </label>
                <textarea
                  value={sketchInput}
                  onChange={(e) => setSketchInput(e.target.value)}
                  placeholder="e.g. A real-time crypto portfolio tracker and alert system with wallet connection, automated price divergence alerts, simulated trade backtesting, and Telegram notifications..."
                  rows={6}
                  disabled={isGeneratingSketch}
                  className="w-full bg-[#141414] border border-[#282828] rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 leading-relaxed resize-none disabled:opacity-50"
                  autoFocus
                />
              </div>

              {/* Quick inspiration chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Quick Starter Ideas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Realtime crypto arbitrage tracker with price alerts & wallet connect',
                    'Autonomous customer support agent synced with Notion & Zendesk',
                    'Collaborative design sprint canvas with voting dots & Figma export',
                    'Developer observability platform tracking microservice latency anomalies',
                  ].map((idea, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isGeneratingSketch}
                      onClick={() => setSketchInput(idea)}
                      className="px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] hover:border-emerald-500/40 text-[11px] text-zinc-300 hover:text-white transition-all text-left truncate max-w-full"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              {sketchError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-xs text-red-300">
                  {sketchError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] text-xs text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>What Gemini will generate for you:</span>
                </div>
                <ul className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 pl-4 list-disc text-zinc-400">
                  <li>Structured PRD (Problem, Audience, Scope)</li>
                  <li>Living Requirements Table (FR-001..FR-005)</li>
                  <li>Visual PRD Lineage Graph</li>
                  <li>Interactive System Architecture Canvas</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#181818] border border-[#2a2a2a] rounded text-zinc-400">
                  ESC
                </kbd>
                <span>to cancel</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSketchModalOpen(false)}
                  disabled={isGeneratingSketch}
                  className="px-4 py-2 rounded-lg bg-[#181818] hover:bg-[#222222] text-xs font-semibold text-zinc-300 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFromSketch}
                  disabled={isGeneratingSketch || !sketchInput.trim()}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isGeneratingSketch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Synthesize Project</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
