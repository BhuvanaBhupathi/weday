'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Connection,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network,
  ShieldCheck,
  Boxes,
  Database,
  Server,
  Monitor,
  HardDrive,
  Save,
  Link as LinkIcon,
  X,
  RefreshCw,
  Sparkles,
  Search,
  Maximize2,
  Minimize2,
  Compass,
  Layers,
  HelpCircle,
  Activity,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  SlidersHorizontal,
  ChevronRight,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';
import { getLayoutedElements } from '../../lib/architecture-layout';
import type {
  ArchitectureComponentStatus,
  ArchitectureViewMode,
  ArchitectureValidationReport,
  ArchitectureDiffResult,
} from '@friday/types';

const NODE_THEMES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  frontend: { border: 'rgba(191, 219, 254, 0.45)', bg: 'rgba(191, 219, 254, 0.08)', text: '#dbeafe', badge: '#bfdbfe' },
  page: { border: 'rgba(125, 211, 252, 0.45)', bg: 'rgba(125, 211, 252, 0.08)', text: '#e0f2fe', badge: '#7dd3fc' },
  backend: { border: 'rgba(221, 214, 254, 0.45)', bg: 'rgba(221, 214, 254, 0.08)', text: '#ede9fe', badge: '#ddd6fe' },
  module: { border: 'rgba(196, 181, 253, 0.45)', bg: 'rgba(196, 181, 253, 0.08)', text: '#ede9fe', badge: '#c4b5fd' },
  api: { border: 'rgba(167, 243, 208, 0.45)', bg: 'rgba(167, 243, 208, 0.08)', text: '#d1fae5', badge: '#a7f3d0' },
  service: { border: 'rgba(153, 246, 228, 0.45)', bg: 'rgba(153, 246, 228, 0.08)', text: '#ccfbf1', badge: '#99f6e4' },
  database: { border: 'rgba(254, 240, 138, 0.45)', bg: 'rgba(254, 240, 138, 0.08)', text: '#fef9c3', badge: '#fef08a' },
  entity: { border: 'rgba(52, 211, 153, 0.45)', bg: 'rgba(52, 211, 153, 0.08)', text: '#d1fae5', badge: '#6ee7b7' },
  queue: { border: 'rgba(254, 215, 170, 0.45)', bg: 'rgba(254, 215, 170, 0.08)', text: '#ffedd5', badge: '#fed7aa' },
  storage: { border: 'rgba(251, 207, 232, 0.45)', bg: 'rgba(251, 207, 232, 0.08)', text: '#fce7f3', badge: '#fbcfe8' },
  auth: { border: 'rgba(254, 202, 202, 0.45)', bg: 'rgba(254, 202, 202, 0.08)', text: '#fee2e2', badge: '#fecaca' },
  default: { border: 'rgba(203, 213, 225, 0.45)', bg: 'rgba(203, 213, 225, 0.08)', text: '#f1f5f9', badge: '#cbd5e1' },
};

interface ArchitectureNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  description?: string;
  technology?: string;
  purpose?: string;
  status?: ArchitectureComponentStatus;
  source?: string;
  sourceRequirements?: string[];
  sourceFeatures?: string[];
  sourcePages?: string[];
  sourceFlows?: string[];
  sourceEntities?: string[];
  sourceDecisions?: string[];
  apis?: string[];
  data?: string[];
  reason?: string;
  evidence?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  assumptions?: string[];
  requirementIdentifier?: string;
  isInspected?: boolean;
  isSecondary?: boolean;
}

type ArchitectureNode = Node<ArchitectureNodeData>;

function ArchitectureCanvas() {
  const { activeBand, setActiveTab } = useWorkspaceStore();
  const reactFlowInstance = useReactFlow();

  // Graph state
  const [allNodes, setAllNodes] = useState<ArchitectureNode[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [nodes, setNodes] = useState<ArchitectureNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Versions and Views
  const [versions, setVersions] = useState<any[]>([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(1);
  const [viewMode, setViewMode] = useState<ArchitectureViewMode>('system_overview');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Inspector & Context State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectIsolatedNodeId, setInspectIsolatedNodeId] = useState<string | null>(null);
  const [contextTab, setContextTab] = useState<'overview' | 'why' | 'impact'>('overview');
  const [whyTracingData, setWhyTracingData] = useState<any | null>(null);
  const [impactData, setImpactData] = useState<any | null>(null);
  const [isLoadingWhy, setIsLoadingWhy] = useState(false);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [edgeVisibilityMode, setEdgeVisibilityMode] = useState<'all' | 'dependencies' | 'data' | 'api'>('all');
  const [selectedFeatureFlow, setSelectedFeatureFlow] = useState<string | null>(null);

  // Node right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Saved Boards popover
  const [isBoardsOpen, setIsBoardsOpen] = useState(false);

  // Status & Health validation
  const [isApproved, setIsApproved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<ArchitectureValidationReport | null>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  // Version Comparison
  const [isComparingVersions, setIsComparingVersions] = useState(false);
  const [diffResult, setDiffResult] = useState<ArchitectureDiffResult | null>(null);

  // Boards
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoardName, setActiveBoardName] = useState<string | null>(null);

  // Requirements for linking
  const [requirements, setRequirements] = useState<any[]>([]);

  // Column Resizing for Inspector
  const [inspectorWidth, setInspectorWidth] = useState(360);
  const isDraggingInspectorRef = useRef(false);
  const dragStartXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Keyboard shortcut listener (Cmd+F for search, Esc for exit inspect)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        if (inspectIsolatedNodeId) {
          exitInspectMode();
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectIsolatedNodeId, isSearchOpen]);

  // Inspector resize logic
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDraggingInspectorRef.current) {
        const delta = dragStartXRef.current - e.clientX;
        const newWidth = Math.max(260, Math.min(600, startWidthRef.current + delta));
        setInspectorWidth(newWidth);
      }
    }

    function handleMouseUp() {
      if (isDraggingInspectorRef.current) {
        isDraggingInspectorRef.current = false;
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

  function startInspectorResize(e: React.MouseEvent) {
    isDraggingInspectorRef.current = true;
    dragStartXRef.current = e.clientX;
    startWidthRef.current = inspectorWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  useEffect(() => {
    if (!activeBand) return;
    loadArchitecture();
    loadRequirements();
  }, [activeBand]);

  async function loadArchitecture() {
    if (!activeBand) return;
    setIsLoading(true);
    try {
      const arch = await api.get(`/bands/${activeBand.id}/architecture`);
      if (arch) {
        setIsApproved(arch.isApproved || false);
        setVersions(arch.versions || []);
        setBoards(arch.boards || []);

        const targetVer = arch.currentVersion || (arch.versions && arch.versions.length > 0 ? arch.versions[0] : null);
        if (targetVer && targetVer.nodes && targetVer.nodes.length > 0) {
          applyVersionToCanvas(targetVer);
        } else {
          setAllNodes([]);
          setAllEdges([]);
          setNodes([]);
          setEdges([]);
        }
      }
    } catch (err) {
      console.error('Failed to load architecture', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRequirements() {
    if (!activeBand) return;
    try {
      const reqs = await api.get(`/bands/${activeBand.id}/requirements`);
      setRequirements(reqs || []);
    } catch (err) {
      console.error('Failed to load requirements', err);
    }
  }

  // Pure filter: reduce the full node/edge set to what a given View Mode shows.
  // Does NOT re-layout — callers decide whether to run dagre or keep saved positions.
  function filterByViewMode(
    mode: ArchitectureViewMode,
    allN: ArchitectureNode[],
    allE: Edge[],
    feature?: string | null,
  ): { nodes: ArchitectureNode[]; edges: Edge[]; direction: 'TB' | 'LR' } {
    let visibleNodes = allN;
    let direction: 'TB' | 'LR' = 'TB';

    if (mode === 'system_overview') {
      visibleNodes = allN.filter(
        (n) => ['frontend', 'backend', 'database', 'auth'].includes(n.data.type) || n.id === 'node-frontend',
      );
    } else if (mode === 'data_flow') {
      visibleNodes = allN.filter((n) => ['backend', 'database', 'entity', 'queue', 'storage'].includes(n.data.type));
      direction = 'LR';
    } else if (mode === 'feature_flow' && feature) {
      // Nodes directly tied to the feature, plus their immediate neighbours so the
      // behavioural path reads start -> ... -> end.
      const featureNodeIds = new Set(
        allN.filter((n) => (n.data.sourceFeatures || []).includes(feature)).map((n) => n.id),
      );
      const withNeighbors = new Set(featureNodeIds);
      allE.forEach((e) => {
        if (featureNodeIds.has(e.source)) withNeighbors.add(e.target);
        if (featureNodeIds.has(e.target)) withNeighbors.add(e.source);
      });
      visibleNodes = allN.filter((n) => withNeighbors.has(n.id));
    } else {
      // application_flow / default: the full graph
      visibleNodes = allN;
    }

    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = allE.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
    return { nodes: visibleNodes, edges: visibleEdges, direction };
  }

  // All distinct features referenced by any architecture component.
  function collectFeatures(): string[] {
    const set = new Set<string>();
    allNodes.forEach((n) => (n.data.sourceFeatures || []).forEach((f) => set.add(f)));
    return Array.from(set).sort();
  }

  // Render the behavioural sub-graph for a single feature (dagre-laid-out).
  function applyFeatureFlow(feature: string | null) {
    const filtered = filterByViewMode('feature_flow', allNodes, allEdges, feature);
    setLayoutDirection('TB');
    const layouted = getLayoutedElements(filtered.nodes, filtered.edges, 'TB');
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }

  function applyVersionToCanvas(targetVer: any) {
    if (!targetVer) return;
    setCurrentVersionNumber(targetVer.versionNumber);

    const mappedNodes: ArchitectureNode[] = (targetVer.nodes || []).map((n: any) => {
      const theme = NODE_THEMES[n.type] || NODE_THEMES.default;
      const data = n.data || {};
      const status: ArchitectureComponentStatus = data.status || 'CONFIRMED';

      return {
        id: n.nodeId,
        position: { x: n.positionX, y: n.positionY },
        data: {
          label: n.label,
          type: n.type,
          description: n.description || '',
          technology: n.technology || '',
          purpose: data.purpose,
          status,
          source: data.source,
          sourceRequirements: data.sourceRequirements || [],
          sourceFeatures: data.sourceFeatures || [],
          sourcePages: data.sourcePages || [],
          sourceFlows: data.sourceFlows || [],
          sourceEntities: data.sourceEntities || [],
          sourceDecisions: data.sourceDecisions || [],
          apis: data.apis || [],
          data: data.data || [],
          reason: data.reason,
          evidence: data.evidence,
          confidence: data.confidence || 'HIGH',
          assumptions: data.assumptions || [],
          requirementIdentifier: data.requirementIdentifier || data.sourceRequirements?.[0],
        },
        style: {
          background: theme.bg,
          border: `1px solid ${status === 'UNRESOLVED' ? '#f59e0b' : status === 'AI_SUGGESTED' ? '#818cf8' : theme.border}`,
          borderRadius: '12px',
          padding: '14px',
          fontSize: '13px',
          width: 240,
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
        },
      };
    });

    const mappedEdges: Edge[] = (targetVer.edges || []).map((e: any) => ({
      id: e.edgeId,
      source: e.source,
      target: e.target,
      label: e.label || '',
      animated: e.animated ?? true,
      style: { stroke: '#4b5563', strokeWidth: 1.5 },
      data: {
        relationshipType: e.relationshipType,
        evidence: e.data?.evidence,
        dataFlow: e.data?.dataFlow,
      },
    }));

    setAllNodes(mappedNodes);
    setAllEdges(mappedEdges);

    // Apply the active View Mode so the canvas matches the selected mode on load/switch.
    const filtered = filterByViewMode(viewMode, mappedNodes, mappedEdges, selectedFeatureFlow);
    setLayoutDirection(filtered.direction);
    setNodes(filtered.nodes);
    setEdges(filtered.edges);

    // Fetch initial validation
    fetchValidation();
  }

  async function fetchValidation() {
    if (!activeBand) return;
    try {
      const report = await api.get(`/bands/${activeBand.id}/architecture/validate`);
      setValidationReport(report);
    } catch (err) {
      console.warn('Could not fetch validation', err);
    }
  }

  // Generate directly from PRD using Friday's Reasoning Engine
  async function handleGenerateFromPrd() {
    if (!activeBand) return;
    setIsGenerating(true);
    setSaveStatus('Reasoning through PRD facts...');
    try {
      const res = await api.post(`/bands/${activeBand.id}/architecture/generate-from-prd`);
      if (res?.version) {
        await loadArchitecture();
        setSaveStatus('Architecture reasoned!');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err: any) {
      const msg = err?.message || 'unknown error';
      alert(
        /permission|not a member|unauthorized|forbidden|401|403/i.test(msg)
          ? `You don't have access to this Band's architecture. You must be logged in as a member of the Band ("${activeBand?.name}").\n\nServer said: ${msg}`
          : `Reasoning engine failed: ${msg}`,
      );
      setSaveStatus(null);
    } finally {
      setIsGenerating(false);
    }
  }

  // Automatic Layout using Dagre
  function handleLayout(dir: 'TB' | 'LR' = layoutDirection) {
    setLayoutDirection(dir);
    const layouted = getLayoutedElements(nodes, edges, dir);
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }

  // Inspect mode: Isolate selected node and its direct 1st-degree connections
  function enterInspectMode(nodeId: string) {
    setInspectIsolatedNodeId(nodeId);
    setSelectedNodeId(nodeId);

    const directNeighbors = new Set<string>([nodeId]);
    allEdges.forEach((e) => {
      if (e.source === nodeId) directNeighbors.add(e.target);
      if (e.target === nodeId) directNeighbors.add(e.source);
    });

    const filteredNodes = allNodes.filter((n) => directNeighbors.has(n.id));
    const filteredEdges = allEdges.filter(
      (e) => directNeighbors.has(e.source) && directNeighbors.has(e.target),
    );

    const layouted = getLayoutedElements(filteredNodes, filteredEdges, 'TB');
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.3, duration: 300 });
    }, 50);
  }

  function exitInspectMode() {
    setInspectIsolatedNodeId(null);
    setNodes(allNodes);
    setEdges(allEdges);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }

  // Expand Connected Nodes: reveals +1 structural layer
  function handleExpandConnectedNodes() {
    if (!selectedNodeId) return;
    const currentVisibleIds = new Set(nodes.map((n) => n.id));
    const newNeighborIds = new Set<string>();

    allEdges.forEach((e) => {
      if (currentVisibleIds.has(e.source) && !currentVisibleIds.has(e.target)) {
        newNeighborIds.add(e.target);
      }
      if (currentVisibleIds.has(e.target) && !currentVisibleIds.has(e.source)) {
        newNeighborIds.add(e.source);
      }
    });

    if (newNeighborIds.size === 0) {
      alert('All connected components are already revealed.');
      return;
    }

    const combinedNodeIds = new Set([...currentVisibleIds, ...newNeighborIds]);
    const expandedNodes = allNodes.filter((n) => combinedNodeIds.has(n.id));
    const expandedEdges = allEdges.filter(
      (e) => combinedNodeIds.has(e.source) && combinedNodeIds.has(e.target),
    );

    const layouted = getLayoutedElements(expandedNodes, expandedEdges, layoutDirection);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }

  // Tracing "Why does this exist?"
  async function fetchWhyTracing(nodeId: string) {
    if (!activeBand) return;
    setIsLoadingWhy(true);
    try {
      const data = await api.get(`/bands/${activeBand.id}/architecture/nodes/${nodeId}/why`);
      setWhyTracingData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingWhy(false);
    }
  }

  // "Show Impact" analysis
  async function fetchImpactAnalysis(nodeId: string) {
    if (!activeBand) return;
    setIsLoadingImpact(true);
    try {
      const data = await api.get(`/bands/${activeBand.id}/architecture/nodes/${nodeId}/impact`);
      setImpactData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingImpact(false);
    }
  }

  // Node selection handler
  function handleSelectNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      if (contextTab === 'why') fetchWhyTracing(nodeId);
      if (contextTab === 'impact') fetchImpactAnalysis(nodeId);
    }
  }

  // Version diff comparison
  async function handleCompareVersions() {
    if (!activeBand || versions.length < 2) return;
    setIsComparingVersions(true);
    try {
      const previousVerNum = versions[1]?.versionNumber || 1;
      const currentVerNum = currentVersionNumber;
      const diff = await api.get(
        `/bands/${activeBand.id}/architecture/compare?from=${previousVerNum}&to=${currentVerNum}`,
      );
      setDiffResult(diff);
    } catch (err) {
      console.error('Failed to compare versions', err);
    }
  }

  // Filter graph by View Mode
  function handleChangeViewMode(mode: ArchitectureViewMode) {
    setViewMode(mode);

    if (mode === 'feature_flow') {
      const features = collectFeatures();
      const first = features[0] || null;
      setSelectedFeatureFlow(first);
      applyFeatureFlow(first);
      return;
    }

    setSelectedFeatureFlow(null);
    const filtered = filterByViewMode(mode, allNodes, allEdges);
    setLayoutDirection(filtered.direction);
    const layouted = getLayoutedElements(filtered.nodes, filtered.edges, filtered.direction);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }

  // Save current view as a custom Board
  async function handleSaveBoard() {
    if (!activeBand) return;
    const name = prompt('Enter a name for this Architecture Board (e.g., "Authentication Flow", "System Overview"):');
    if (!name?.trim()) return;

    try {
      const saved = await api.post(`/bands/${activeBand.id}/architecture/boards`, {
        name: name.trim(),
        viewMode,
        visibleNodeIds: nodes.map((n) => n.id),
        visibleEdgeIds: edges.map((e) => e.id),
        layoutDirection,
      });
      setBoards([saved, ...boards.filter((b) => b.id !== saved.id)]);
      setActiveBoardName(saved.name);
      setSaveStatus(`Saved board "${saved.name}"`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Failed to save board: ${err.message}`);
    }
  }

  // Load a saved Board: restore its view mode, layout direction, and visible node/edge subset.
  function handleLoadBoard(board: any) {
    if (!board) return;
    const mode = (board.viewMode as ArchitectureViewMode) || 'system_overview';
    const dir = board.layoutDirection || 'TB';
    setViewMode(mode);
    setLayoutDirection(dir);
    setActiveBoardName(board.name);
    setIsBoardsOpen(false);

    const nodeIds: string[] = board.visibleNodeIds || [];
    const edgeIds: string[] = board.visibleEdgeIds || [];
    const nodeSet = new Set(nodeIds);
    const edgeSet = new Set(edgeIds);

    let targetNodes = allNodes.filter((n) => nodeSet.size === 0 || nodeSet.has(n.id));
    let targetEdges = allEdges.filter((e) => edgeSet.size === 0 || edgeSet.has(e.id));

    // Guard: if a board's saved IDs no longer exist (the model changed), fall back to the
    // full view-mode filter so the board never renders an empty canvas.
    if (targetNodes.length === 0) {
      const fallback = filterByViewMode(mode, allNodes, allEdges);
      targetNodes = fallback.nodes;
      targetEdges = fallback.edges;
    }

    const layouted = getLayoutedElements(targetNodes, targetEdges, dir);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setSaveStatus(`Loaded board "${board.name}"`);
    setTimeout(() => setSaveStatus(null), 3000);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }

  // Delete a saved Board.
  async function handleDeleteBoard(board: any) {
    if (!activeBand || !board) return;
    try {
      await api.delete(`/bands/${activeBand.id}/architecture/boards/${board.id}`);
      setBoards(boards.filter((b) => b.id !== board.id));
      if (activeBoardName === board.name) setActiveBoardName(null);
      setSaveStatus(`Deleted board "${board.name}"`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Failed to delete board: ${err.message}`);
    }
  }

  // Persist the current (possibly manually edited) graph as a new architecture version.
  async function handleSaveVersion() {
    if (!activeBand) return;
    setIsSaving(true);
    try {
      await api.post(`/bands/${activeBand.id}/architecture/versions`, {
        changeSummary: 'Manual architecture edit',
        isAiGenerated: false,
        nodes: nodes.map((n) => ({
          nodeId: n.id,
          label: n.data.label,
          type: n.data.type,
          description: n.data.description,
          technology: n.data.technology,
          positionX: n.position.x,
          positionY: n.position.y,
          data: {
            purpose: n.data.purpose,
            status: n.data.status,
            source: n.data.source,
            sourceRequirements: n.data.sourceRequirements,
            sourceFeatures: n.data.sourceFeatures,
            sourcePages: n.data.sourcePages,
            sourceFlows: n.data.sourceFlows,
            sourceEntities: n.data.sourceEntities,
            sourceDecisions: n.data.sourceDecisions,
            apis: n.data.apis,
            data: n.data.data,
            reason: n.data.reason,
            evidence: n.data.evidence,
            confidence: n.data.confidence,
            assumptions: n.data.assumptions,
            requirementIdentifier: n.data.requirementIdentifier,
          },
        })),
        edges: edges.map((e) => ({
          edgeId: e.id,
          source: e.source,
          target: e.target,
          label: (e.label as string) || undefined,
          relationshipType: (e.data as any)?.relationshipType,
          animated: e.animated,
          data: {
            evidence: (e.data as any)?.evidence,
            dataFlow: (e.data as any)?.dataFlow,
          },
        })),
      });
      setSaveStatus('Saved new architecture version');
      setTimeout(() => setSaveStatus(null), 3000);
      await loadArchitecture();
    } catch (err: any) {
      alert(`Failed to save version: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  // Approve the current architecture version.
  async function handleApprove() {
    if (!activeBand) return;
    try {
      await api.post(`/bands/${activeBand.id}/architecture/approve`);
      setIsApproved(true);
      setSaveStatus('Architecture approved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Failed to approve: ${err.message}`);
    }
  }

  // Structural search across the architecture (debounced) using the backend index.
  useEffect(() => {
    if (!activeBand || !isSearchOpen) return;
    const q = searchQuery.trim();
    if (!q) return; // Results box is hidden while the query is empty.
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsSearching(true);
      try {
        const results = await api.get(`/bands/${activeBand.id}/architecture/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) setSearchResults(results || []);
      } catch (err) {
        console.warn('Architecture search failed', err);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeBand, isSearchOpen, searchQuery]);

  // Select a search result: reveal the full graph, select the node, and centre on it.
  function handleSearchSelect(result: any) {
    if (!result?.nodeId) return;
    if (viewMode !== 'application_flow') {
      setViewMode('application_flow');
      setSelectedFeatureFlow(null);
    }
    setNodes(allNodes);
    setEdges(allEdges);
    setSelectedNodeId(result.nodeId);
    setIsSearchOpen(false);
    const target = allNodes.find((n) => n.id === result.nodeId);
    if (target) {
      reactFlowInstance.setCenter(target.position.x + 120, target.position.y + 45, { zoom: 1.1, duration: 500 });
    }
  }

  // Right-click node context menu
  function handleNodeContextMenu(event: React.MouseEvent, node: ArchitectureNode) {
    event.preventDefault();
    handleSelectNode(node.id);
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  const selectedNode = useMemo(
    () => allNodes.find((n) => n.id === selectedNodeId) || null,
    [allNodes, selectedNodeId],
  );

  // Edge visibility: filter displayed edges by relationship category (visual-only —
  // the underlying relationships are never removed, only how they're shown).
  const displayEdges = useMemo(() => {
    if (edgeVisibilityMode === 'all') return edges;
    const DEPS = ['DEPENDS_ON', 'USES', 'AUTHENTICATES_WITH', 'AFFECTS'];
    const DATA = ['STORES_IN', 'READS_FROM', 'WRITES_TO', 'RECEIVES_FROM'];
    const API = ['CALLS', 'SENDS_TO'];
    return edges.filter((e) => {
      const rt = ((e.data as any)?.relationshipType as string) || '';
      if (edgeVisibilityMode === 'dependencies') return DEPS.includes(rt);
      if (edgeVisibilityMode === 'data') return DATA.includes(rt);
      if (edgeVisibilityMode === 'api') return API.includes(rt);
      return true;
    });
  }, [edges, edgeVisibilityMode]);

  // Distinct features referenced by components (drives the Feature Flow selector).
  const featureList = useMemo(() => collectFeatures(), [allNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as ArchitectureNode[]),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#4b5563', strokeWidth: 1.5 },
          },
          eds,
        ),
      ),
    [],
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-hidden select-none font-sans">
      {/* Top Main Toolbar */}
      <div className="h-12 border-b border-[#1c1c1c] px-4 flex items-center justify-between bg-[#0a0a0a] shrink-0">
        <div className="flex items-center space-x-3">
          {/* Title & Version Selector */}
          <div className="flex items-center space-x-2">
            <Network className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white tracking-tight">Architecture Workspace</span>

            {versions.length > 1 ? (
              <select
                value={currentVersionNumber}
                onChange={(e) => {
                  const targetVer = versions.find((v) => v.versionNumber === Number(e.target.value));
                  if (targetVer) applyVersionToCanvas(targetVer);
                }}
                className="text-xs font-mono px-2 py-0.5 rounded bg-[#161616] text-zinc-300 border border-[#2a2a2a] focus:outline-none cursor-pointer"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.versionNumber}>
                    v{v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#161616] text-zinc-300 border border-[#2a2a2a]">
                v{currentVersionNumber}
              </span>
            )}
          </div>

          <span className="text-zinc-700">|</span>

          {/* View Modes */}
          <div className="flex items-center space-x-1 bg-[#121212] p-0.5 rounded-lg border border-[#222]">
            <button
              onClick={() => handleChangeViewMode('system_overview')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'system_overview' ? 'bg-[#222] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              System
            </button>
            <button
              onClick={() => handleChangeViewMode('application_flow')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'application_flow' ? 'bg-[#222] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Full Graph
            </button>
            <button
              onClick={() => handleChangeViewMode('data_flow')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'data_flow' ? 'bg-[#222] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Data Flow
            </button>
            <button
              onClick={() => handleChangeViewMode('feature_flow')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'feature_flow' ? 'bg-[#222] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Feature Flow
            </button>
          </div>

          {/* Feature selector (Feature Flow mode only) */}
          {viewMode === 'feature_flow' && featureList.length > 0 && (
            <select
              value={selectedFeatureFlow || ''}
              onChange={(e) => {
                const f = e.target.value || null;
                setSelectedFeatureFlow(f);
                applyFeatureFlow(f);
              }}
              className="text-xs font-mono px-2 py-1 rounded bg-[#161616] text-zinc-300 border border-[#2a2a2a] focus:outline-none cursor-pointer max-w-[190px]"
              title="Select a feature to trace its behavioural flow"
            >
              {featureList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}

          {/* Edge visibility modes (visual-only filter) */}
          <div className="flex items-center space-x-1.5" title="Edge visibility mode">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={edgeVisibilityMode}
              onChange={(e) => setEdgeVisibilityMode(e.target.value as 'all' | 'dependencies' | 'data' | 'api')}
              className="text-xs font-mono px-2 py-1 rounded bg-[#161616] text-zinc-300 border border-[#2a2a2a] focus:outline-none cursor-pointer"
            >
              <option value="all">All Edges</option>
              <option value="dependencies">Dependencies</option>
              <option value="data">Data Flow</option>
              <option value="api">API Calls</option>
            </select>
          </div>

          {/* Layout & Reflow Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleLayout('TB')}
              className="px-2 py-1 rounded text-xs bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626]"
              title="Layout Top to Bottom"
            >
              Vertical
            </button>
            <button
              onClick={() => handleLayout('LR')}
              className="px-2 py-1 rounded text-xs bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626]"
              title="Layout Left to Right"
            >
              Horizontal
            </button>
            <button
              onClick={() => {
                reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
              }}
              className="px-2 py-1 rounded text-xs bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626]"
              title="Fit entire graph to screen"
            >
              Fit View
            </button>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center space-x-2">
          {saveStatus && (
            <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1 mr-1">
              <span>{saveStatus}</span>
            </span>
          )}

          {/* Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="px-2.5 py-1.5 rounded-md bg-[#141414] hover:bg-[#202020] text-zinc-300 hover:text-white border border-[#262626] text-xs flex items-center space-x-1.5"
            title="Search architecture (⌘F)"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="text-[10px] text-zinc-500 bg-[#1e1e1e] px-1 rounded">⌘F</kbd>
          </button>

          {/* Validation Report Button */}
          {validationReport && (
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="px-2.5 py-1.5 rounded-md bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626] text-xs flex items-center space-x-1.5"
              title="View Architecture Health and Traceability Report"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Coverage: {validationReport.requirementCoveragePercentage}%</span>
            </button>
          )}

          {/* Version Diff Compare */}
          {versions.length > 1 && (
            <button
              onClick={handleCompareVersions}
              className="px-2.5 py-1.5 rounded-md bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626] text-xs flex items-center space-x-1.5"
              title="Compare with previous version"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Diff</span>
            </button>
          )}

          {/* Save current graph as a new version */}
          <button
            onClick={handleSaveVersion}
            disabled={isSaving || nodes.length === 0}
            className="px-2.5 py-1.5 rounded-md bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626] text-xs flex items-center space-x-1.5 disabled:opacity-50"
            title="Save the current graph as a new architecture version"
          >
            <Save className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isSaving ? 'Saving...' : 'Save Version'}</span>
          </button>

          {/* Saved Boards (list / load / delete) */}
          <div className="relative">
            <button
              onClick={() => setIsBoardsOpen((o) => !o)}
              className="px-2.5 py-1.5 rounded-md bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626] text-xs flex items-center space-x-1.5"
              title="View, load, or manage saved Boards"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-400" />
              <span>Boards</span>
              {boards.length > 0 && (
                <span className="text-[10px] text-zinc-500 bg-[#1e1e1e] px-1 rounded">{boards.length}</span>
              )}
            </button>

            {isBoardsOpen && (
              <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setIsBoardsOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-[#0f0f0f] border border-[#262626] rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#1c1c1c] flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Saved Boards</span>
                    <button
                      onClick={handleSaveBoard}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                      title="Save the current filtered view as a new Board"
                    >
                      + Save current view
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {boards.length === 0 ? (
                      <p className="text-xs text-zinc-500 p-4 text-center">
                        No saved boards yet. Save the current view to create one.
                      </p>
                    ) : (
                      boards.map((b: any) => (
                        <div
                          key={b.id}
                          className={`px-3 py-2 border-b border-[#161616] flex items-center justify-between gap-2 ${
                            activeBoardName === b.name ? 'bg-emerald-950/20' : 'hover:bg-[#161616]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-white truncate">{b.name}</p>
                            <p className="text-[10px] text-zinc-500">
                              {String(b.viewMode || '').replace(/_/g, ' ')} · {b.layoutDirection}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleLoadBoard(b)}
                              className="px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#2c2c2c] text-[11px] text-zinc-200"
                              title="Load this board"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDeleteBoard(b)}
                              className="px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-900/50 text-[11px] text-red-300"
                              title="Delete this board"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Approve / approved status */}
          {isApproved ? (
            <span
              className="px-2.5 py-1.5 rounded-md bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-1.5"
              title="This architecture version has been approved"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved</span>
            </span>
          ) : (
            <button
              onClick={handleApprove}
              className="px-2.5 py-1.5 rounded-md bg-[#141414] hover:bg-[#202020] text-zinc-300 border border-[#262626] text-xs flex items-center space-x-1.5"
              title="Approve the current architecture version"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Approve</span>
            </button>
          )}

          {/* AI Reason from PRD */}
          <button
            onClick={handleGenerateFromPrd}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-md bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
            title="Derive minimal architecture from PRD facts using Friday Reasoning Engine"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isGenerating ? 'Reasoning...' : 'Reason from PRD'}</span>
          </button>
        </div>
      </div>

      {/* Inspect Mode Banner */}
      {inspectIsolatedNodeId && (
        <div className="h-9 bg-emerald-950/60 border-b border-emerald-500/30 px-4 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>
              <strong>Inspect Mode Active:</strong> Isolating 1st-degree dependencies of{' '}
              <span className="underline font-bold">{selectedNode?.data.label}</span>
            </span>
          </div>
          <button
            onClick={exitInspectMode}
            className="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs flex items-center space-x-1"
          >
            <span>Exit Inspect (Esc)</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Search Input Bar (Expandable) + Results */}
      {isSearchOpen && (
        <div className="relative p-3 bg-[#0d0d0d] border-b border-[#222] text-xs z-30">
          <div className="flex items-center space-x-3">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search components, technologies, APIs, data entities, or requirement IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm placeholder-zinc-500 font-sans"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-zinc-300">
                Clear
              </button>
            )}
            <button
              onClick={() => setIsSearchOpen(false)}
              className="px-2 py-1 rounded bg-[#1a1a1a] text-zinc-400 hover:text-white"
            >
              Close
            </button>
          </div>

          {isSearching && searchQuery.trim() && <p className="mt-2 pl-7 text-zinc-500">Searching…</p>}

          {!isSearching && searchQuery && (
            <div className="mt-2 border border-[#222] rounded-lg bg-[#0a0a0a] overflow-hidden">
              {searchResults.length === 0 ? (
                <p className="px-3 py-2.5 text-zinc-500">No matches for “{searchQuery}”.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((r: any) => (
                    <button
                      key={r.nodeId}
                      onClick={() => handleSearchSelect(r)}
                      className="w-full text-left px-3 py-2 hover:bg-[#161616] border-b border-[#161616] last:border-b-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-zinc-100 font-medium">{r.label}</span>
                        <span className="ml-2 text-[10px] text-zinc-500 uppercase">{r.type}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 shrink-0">{r.matchedField}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Canvas & Context Panel */}
      <div className="flex-1 flex overflow-hidden relative bg-[#000000]">
        <div className="flex-1 relative w-full h-full bg-[#000000]">
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => handleSelectNode(node.id)}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneClick={() => {
              handleSelectNode(null);
              closeContextMenu();
            }}
            fitView
            className="bg-[#000000]"
          >
            <Background color="#202020" gap={22} size={1} />
            <Controls className="bg-[#121212] border border-[#262626] text-zinc-300 fill-zinc-300" />
          </ReactFlow>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="p-8 rounded-2xl bg-[#0c0c0c]/95 border border-[#262626] max-w-lg text-center space-y-4 shadow-2xl backdrop-blur-md">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <Network className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">No Architecture Model Synthesized</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                    Transform your product requirements into a minimal, traceable, evidence-grounded architecture.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={handleGenerateFromPrd}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGenerating ? 'Synthesizing...' : 'Reason from PRD'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('prd')}
                    className="px-3 py-2 rounded-xl bg-[#161616] hover:bg-[#202020] text-xs font-semibold text-zinc-200 border border-[#2c2c2c]"
                  >
                    Open PRD
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drag Resizer Handle for Inspector */}
        {selectedNode && (
          <div
            onMouseDown={startInspectorResize}
            className="w-1 bg-[#1a1a1a] hover:bg-emerald-500 cursor-col-resize active:bg-emerald-400 transition-colors shrink-0 z-10"
            title="Drag to resize inspector"
          />
        )}

        {/* Context Information Panel */}
        {selectedNode && (
          <div
            style={{ width: `${inspectorWidth}px` }}
            className="border-l border-[#1c1c1c] bg-[#090909] flex flex-col shrink-0 overflow-y-auto select-none"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {selectedNode.data.type}
                  </span>
                  {selectedNode.data.status && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        selectedNode.data.status === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : selectedNode.data.status === 'UNRESOLVED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {selectedNode.data.status}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mt-1">{selectedNode.data.label}</h3>
              </div>
              <button
                onClick={() => handleSelectNode(null)}
                className="text-zinc-500 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center space-x-2 bg-[#0d0d0d]">
              <button
                onClick={() => enterInspectMode(selectedNode.id)}
                className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#262626] text-zinc-300 text-xs font-semibold flex items-center space-x-1"
                title="Isolate this component and direct neighbors"
              >
                <Compass className="w-3 h-3 text-emerald-400" />
                <span>Inspect</span>
              </button>
              <button
                onClick={handleExpandConnectedNodes}
                className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#262626] text-zinc-300 text-xs font-semibold flex items-center space-x-1"
                title="Reveal one additional layer of connected nodes"
              >
                <Layers className="w-3 h-3 text-blue-400" />
                <span>+1 Layer</span>
              </button>
            </div>

            {/* Context Panel Tabs */}
            <div className="flex border-b border-[#1a1a1a] bg-[#0c0c0c] text-xs font-semibold">
              <button
                onClick={() => setContextTab('overview')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                  contextTab === 'overview'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setContextTab('why');
                  fetchWhyTracing(selectedNode.id);
                }}
                className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                  contextTab === 'why'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Why?
              </button>
              <button
                onClick={() => {
                  setContextTab('impact');
                  fetchImpactAnalysis(selectedNode.id);
                }}
                className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                  contextTab === 'impact'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Impact
              </button>
            </div>

            {/* Tab 1: Overview */}
            {contextTab === 'overview' && (
              <div className="p-4 space-y-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                    Technology Stack
                  </label>
                  <div className="mt-1 font-mono text-zinc-200 bg-[#141414] p-2 rounded-lg border border-[#222]">
                    {selectedNode.data.technology || 'Unspecified'}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                    Description & Purpose
                  </label>
                  <p className="mt-1 text-zinc-300 leading-relaxed bg-[#141414] p-2.5 rounded-lg border border-[#222]">
                    {selectedNode.data.purpose || selectedNode.data.description || 'No description provided.'}
                  </p>
                </div>

                {selectedNode.data.apis && selectedNode.data.apis.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                      APIs / Endpoints
                    </label>
                    <div className="mt-1 space-y-1">
                      {selectedNode.data.apis.map((api, i) => (
                        <div
                          key={i}
                          className="font-mono text-[11px] text-emerald-300 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-500/20"
                        >
                          {api}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.data.sourceRequirements && selectedNode.data.sourceRequirements.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider flex items-center space-x-1">
                      <LinkIcon className="w-3 h-3" />
                      <span>Linked Requirements</span>
                    </label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {selectedNode.data.sourceRequirements.map((reqId) => (
                        <button
                          key={reqId}
                          onClick={() => setActiveTab('prd')}
                          className="px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#2c2c2c] text-zinc-300 text-xs border border-[#333] transition-colors"
                        >
                          {reqId}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Why Does This Exist? */}
            {contextTab === 'why' && (
              <div className="p-4 space-y-4 text-xs">
                {isLoadingWhy ? (
                  <div className="text-center py-8 text-zinc-500">Tracing backward provenance...</div>
                ) : (
                  <>
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                      <div className="font-bold text-emerald-300 flex items-center space-x-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Why does this component exist?</span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">
                        {whyTracingData?.why?.reason || selectedNode.data.reason || 'Derived to satisfy core application user flow.'}
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                        Evidence / Trace Provenance
                      </label>
                      <p className="mt-1 text-zinc-400 bg-[#141414] p-2.5 rounded-lg border border-[#222]">
                        {whyTracingData?.why?.evidence || selectedNode.data.evidence || 'Ground truth identified from PRD requirements.'}
                      </p>
                    </div>

                    {whyTracingData?.traceChain && (
                      <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
                        <span className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                          Backward Lineage
                        </span>
                        <div className="space-y-1.5">
                          <div className="p-2 rounded bg-[#141414] border border-[#222]">
                            <span className="text-[10px] text-zinc-500 block">User Need / Specification</span>
                            <span className="text-zinc-200">{whyTracingData.traceChain.userNeed}</span>
                          </div>
                          <div className="flex justify-center">
                            <ArrowRight className="w-3 h-3 text-zinc-600 rotate-90" />
                          </div>
                          <div className="p-2 rounded bg-[#141414] border border-[#222]">
                            <span className="text-[10px] text-zinc-500 block">Architecture Component</span>
                            <span className="text-emerald-400 font-bold">{selectedNode.data.label}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 3: Impact Analysis */}
            {contextTab === 'impact' && (
              <div className="p-4 space-y-4 text-xs">
                {isLoadingImpact ? (
                  <div className="text-center py-8 text-zinc-500">Calculating system impact...</div>
                ) : (
                  <>
                    <div className="p-3 rounded-lg bg-[#141414] border border-[#222] space-y-2">
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Activity className="w-3.5 h-3.5 text-purple-400" />
                        <span>Downstream Dependent Components</span>
                      </div>
                      {impactData?.impact?.dependentComponents && impactData.impact.dependentComponents.length > 0 ? (
                        <div className="space-y-1">
                          {impactData.impact.dependentComponents.map((d: any) => (
                            <div key={d.nodeId} className="px-2 py-1 rounded bg-[#1e1e1e] text-zinc-300">
                              {d.label}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-500 italic">No downstream dependencies.</p>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-[#141414] border border-[#222] space-y-2">
                      <span className="font-bold text-white block">Affected Requirements</span>
                      {impactData?.impact?.affectedRequirements && impactData.impact.affectedRequirements.length > 0 ? (
                        <div className="space-y-1">
                          {impactData.impact.affectedRequirements.map((r: any) => (
                            <div key={r.id} className="text-zinc-300 flex items-center justify-between">
                              <span>
                                {r.identifier} — {r.title}
                              </span>
                              <span className="text-[10px] text-zinc-500">{r.priority}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-500 italic">No direct requirement bindings.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Health Modal */}
      {isHealthModalOpen && validationReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl select-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Architecture Health & Traceability</h3>
              </div>
              <button onClick={() => setIsHealthModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#161616] border border-[#262626]">
                <span className="text-[10px] font-bold uppercase text-zinc-500">Requirement Coverage</span>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {validationReport.requirementCoveragePercentage}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#161616] border border-[#262626]">
                <span className="text-[10px] font-bold uppercase text-zinc-500">Traceability</span>
                <p className="text-xl font-bold text-blue-400 mt-1">{validationReport.traceabilityRating}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#161616] border border-[#262626]">
                <span className="text-[10px] font-bold uppercase text-zinc-500">Unresolved</span>
                <p className="text-xl font-bold text-amber-400 mt-1">{validationReport.unresolvedComponents}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Architecture Warnings</h4>
              {validationReport.warnings.length === 0 ? (
                <p className="text-xs text-emerald-400 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20">
                  Zero architecture complexity or traceability warnings detected.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {validationReport.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg text-xs flex items-start space-x-2 border ${
                        w.severity === 'CRITICAL'
                          ? 'bg-red-950/30 border-red-500/30 text-red-300'
                          : w.severity === 'WARNING'
                          ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsHealthModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#222] hover:bg-[#333] text-xs font-semibold text-white"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Comparison Modal */}
      {isComparingVersions && diffResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl select-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Version Diff (v{diffResult.previousVersionNumber} → v{diffResult.currentVersionNumber})
                </h3>
              </div>
              <button onClick={() => setIsComparingVersions(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto text-xs">
              {diffResult.newNodes.length > 0 && (
                <div>
                  <span className="font-bold text-emerald-400 block mb-1">NEW COMPONENTS</span>
                  <div className="space-y-1">
                    {diffResult.newNodes.map((n) => (
                      <div key={n.id} className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                        {n.label} ({n.technology})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diffResult.modifiedNodes.length > 0 && (
                <div>
                  <span className="font-bold text-amber-400 block mb-1">MODIFIED COMPONENTS</span>
                  <div className="space-y-1">
                    {diffResult.modifiedNodes.map((m) => (
                      <div key={m.current.id} className="p-2 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300">
                        {m.current.label} — Changed fields: {m.diffKeys.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diffResult.removedNodes.length > 0 && (
                <div>
                  <span className="font-bold text-red-400 block mb-1">REMOVED COMPONENTS</span>
                  <div className="space-y-1">
                    {diffResult.removedNodes.map((r) => (
                      <div key={r.id} className="p-2 rounded bg-red-950/30 border border-red-500/30 text-red-300">
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diffResult.affectedNodes.length > 0 && (
                <div>
                  <span className="font-bold text-purple-400 block mb-1">AFFECTED DEPENDENTS</span>
                  <div className="space-y-1">
                    {diffResult.affectedNodes.map((a) => (
                      <div key={a.node.id} className="p-2 rounded bg-purple-950/30 border border-purple-500/30 text-purple-300">
                        {a.node.label}: {a.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diffResult.newNodes.length === 0 &&
                diffResult.modifiedNodes.length === 0 &&
                diffResult.removedNodes.length === 0 && (
                  <p className="text-zinc-500 text-center py-6">No structural changes detected between versions.</p>
                )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsComparingVersions(false)}
                className="px-4 py-2 rounded-xl bg-[#222] hover:bg-[#333] text-xs font-semibold text-white"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Node right-click context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeContextMenu();
            }}
          />
          <div
            className="fixed z-50 w-56 bg-[#0f0f0f] border border-[#262626] rounded-xl shadow-2xl overflow-hidden py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 border-b border-[#1c1c1c]">
              <p className="text-[11px] font-bold text-white truncate">
                {allNodes.find((n) => n.id === contextMenu.nodeId)?.data.label}
              </p>
            </div>
            <button
              onClick={() => {
                enterInspectMode(contextMenu.nodeId);
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#161616] flex items-center space-x-2"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inspect</span>
            </button>
            <button
              onClick={() => {
                handleExpandConnectedNodes();
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#161616] flex items-center space-x-2"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Expand Connected (+1 Layer)</span>
            </button>
            <button
              onClick={() => {
                setContextTab('impact');
                fetchImpactAnalysis(contextMenu.nodeId);
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#161616] flex items-center space-x-2"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Show Impact</span>
            </button>
            <button
              onClick={() => {
                setContextTab('why');
                fetchWhyTracing(contextMenu.nodeId);
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#161616] flex items-center space-x-2"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Why Does This Exist?</span>
            </button>
            <button
              onClick={() => {
                setContextTab('overview');
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#161616] flex items-center space-x-2"
            >
              <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>View Related Requirements</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ArchitectureView() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvas />
    </ReactFlowProvider>
  );
}
