'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  AlertOctagon,
  Plus,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Target,
  FileText,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

const CONCERN_STEPS = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'];

type TabMode = 'kanban' | 'milestones' | 'coverage';

export default function TasksView() {
  const { activeBand, setActiveTab } = useWorkspaceStore();
  const [activeSubTab, setActiveSubTab] = useState<TabMode>('kanban');

  const [tasks, setTasks] = useState<any[]>([]);
  const [concerns, setConcerns] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [alignment, setAlignment] = useState<any>(null);

  // Column Resizing for Concerns Drawer
  const [concernsWidth, setConcernsWidth] = useState(320);
  const isDraggingConcernsRef = useRef(false);
  const dragStartXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDraggingConcernsRef.current) {
        const delta = dragStartXRef.current - e.clientX;
        const newWidth = Math.max(220, Math.min(520, startWidthRef.current + delta));
        setConcernsWidth(newWidth);
      }
    }

    function handleMouseUp() {
      if (isDraggingConcernsRef.current) {
        isDraggingConcernsRef.current = false;
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

  function startConcernsResize(e: React.MouseEvent) {
    isDraggingConcernsRef.current = true;
    dragStartXRef.current = e.clientX;
    startWidthRef.current = concernsWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskMilestoneId, setTaskMilestoneId] = useState('');
  const [taskRequirementId, setTaskRequirementId] = useState('');

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneStatus, setMilestoneStatus] = useState('PLANNED');

  const [isConcernModalOpen, setIsConcernModalOpen] = useState(false);
  const [concernTitle, setConcernTitle] = useState('');
  const [concernPriority, setConcernPriority] = useState('HIGH');

  useEffect(() => {
    if (!activeBand) return;
    loadData();
  }, [activeBand]);

  async function loadData() {
    if (!activeBand) return;
    try {
      const [tasksRes, concernsRes, milestonesRes, reqsRes, alignRes] = await Promise.all([
        api.get(`/bands/${activeBand.id}/tasks`),
        api.get(`/bands/${activeBand.id}/concerns`),
        api.get(`/bands/${activeBand.id}/milestones`),
        api.get(`/bands/${activeBand.id}/requirements`),
        api.get(`/bands/${activeBand.id}/tasks/alignment`),
      ]);
      setTasks(tasksRes || []);
      setConcerns(concernsRes || []);
      setMilestones(milestonesRes || []);
      setRequirements(reqsRes || []);
      setAlignment(alignRes || null);
    } catch (err) {
      console.error('Failed to load tasks/milestones data', err);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !taskTitle.trim()) return;
    try {
      const created = await api.post(`/bands/${activeBand.id}/tasks`, {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        milestoneId: taskMilestoneId || undefined,
        relatedArtifactId: taskRequirementId || undefined,
      });
      setTasks([created, ...tasks]);
      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      loadData();
    } catch (err: any) {
      alert(`Failed to create task: ${err.message}`);
    }
  }

  async function handleTaskStatus(taskId: string, status: string) {
    if (!activeBand) return;
    try {
      const updated = await api.patch(`/bands/${activeBand.id}/tasks/${taskId}`, { status });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
      loadData();
    } catch (err: any) {
      alert(`Failed to update task: ${err.message}`);
    }
  }

  async function handleCreateMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !milestoneTitle.trim()) return;
    try {
      const created = await api.post(`/bands/${activeBand.id}/milestones`, {
        title: milestoneTitle.trim(),
        description: milestoneDesc.trim(),
        status: milestoneStatus,
        targetDate: milestoneDate ? new Date(milestoneDate).toISOString() : undefined,
      });
      setMilestones([...milestones, created]);
      setIsMilestoneModalOpen(false);
      setMilestoneTitle('');
      setMilestoneDesc('');
      loadData();
    } catch (err: any) {
      alert(`Failed to create milestone: ${err.message}`);
    }
  }

  async function handleCreateConcern(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !concernTitle.trim()) return;
    try {
      const created = await api.post(`/bands/${activeBand.id}/concerns`, {
        title: concernTitle.trim(),
        priority: concernPriority,
      });
      setConcerns([created, ...concerns]);
      setIsConcernModalOpen(false);
      setConcernTitle('');
      loadData();
    } catch (err: any) {
      alert(`Failed to raise concern: ${err.message}`);
    }
  }

  async function handleAdvanceConcern(concernId: string, currentStatus: string) {
    if (!activeBand) return;
    const currentIdx = CONCERN_STEPS.indexOf(currentStatus);
    if (currentIdx === -1 || currentIdx >= CONCERN_STEPS.length - 1) return;
    const nextStatus = CONCERN_STEPS[currentIdx + 1];

    try {
      const updated = await api.patch(`/bands/${activeBand.id}/concerns/${concernId}`, {
        status: nextStatus,
      });
      setConcerns(concerns.map((c) => (c.id === concernId ? updated : c)));
    } catch (err: any) {
      alert(`Failed to advance concern: ${err.message}`);
    }
  }

  function openCreateTaskForRequirement(reqIdentifier: string) {
    setTaskRequirementId(reqIdentifier);
    setIsTaskModalOpen(true);
  }

  const columns = [
    { id: 'TODO', label: 'To Do', color: 'text-zinc-400' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'text-zinc-200' },
    { id: 'DONE', label: 'Completed', color: 'text-emerald-400' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-[#1a1a1a] px-4 flex items-center justify-between bg-[#0a0a0a] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-zinc-300" />
            <span className="text-sm font-bold text-white">Tasks & Delivery</span>
          </div>

          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center bg-[#101010] p-1 rounded-lg border border-[#222222] space-x-1">
            <button
              onClick={() => setActiveSubTab('kanban')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'kanban'
                  ? 'bg-[#fed7aa]/15 text-[#ffedd5] border border-[#fed7aa]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setActiveSubTab('milestones')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'milestones'
                  ? 'bg-[#a7f3d0]/15 text-[#d1fae5] border border-[#a7f3d0]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Milestones ({milestones.length})
            </button>
            <button
              onClick={() => setActiveSubTab('coverage')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'coverage'
                  ? 'bg-[#ddd6fe]/15 text-[#ede9fe] border border-[#ddd6fe]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Coverage Matrix
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMilestoneModalOpen(true)}
            className="px-3 py-1.5 rounded-md bg-[#a7f3d0]/10 hover:bg-[#a7f3d0]/20 text-[#d1fae5] border border-[#a7f3d0]/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-[#a7f3d0]" />
            <span>New Milestone</span>
          </button>
          <button
            onClick={() => setIsConcernModalOpen(true)}
            className="px-3 py-1.5 rounded-md bg-[#fecaca]/10 hover:bg-[#fecaca]/20 text-[#fee2e2] border border-[#fecaca]/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-[#fecaca]" />
            <span>Raise Concern</span>
          </button>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#fed7aa]/15 hover:bg-[#fed7aa]/25 text-[#ffedd5] border border-[#fed7aa]/40 text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#fed7aa]" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Alignment Metric Bar */}
      {alignment && (
        <div className="bg-[#0c0c0c] border-b border-[#1a1a1a] px-4 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400">Requirement Coverage:</span>
              <div className="w-28 bg-[#1a1a1a] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${alignment.coveragePercentage}%` }}
                />
              </div>
              <span className="font-mono font-bold text-emerald-400">
                {alignment.coveragePercentage}%
              </span>
              <span className="text-zinc-500 font-mono">
                ({alignment.coveredRequirementsCount}/{alignment.totalRequirements} PRD reqs)
              </span>
            </div>

            {alignment.uncoveredRequirementsCount > 0 && (
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#1c1c1c] border border-zinc-700 text-zinc-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {alignment.uncoveredRequirementsCount} requirements lack implementation tasks
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-zinc-400">
            <span>TODO: <strong className="text-zinc-200">{alignment.tasksByStatus?.TODO || 0}</strong></span>
            <span>IN_PROGRESS: <strong className="text-zinc-200">{alignment.tasksByStatus?.IN_PROGRESS || 0}</strong></span>
            <span>DONE: <strong className="text-emerald-400">{alignment.tasksByStatus?.DONE || 0}</strong></span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden bg-[#000000]">
        {/* SUB-VIEW 1: KANBAN BOARD */}
        {activeSubTab === 'kanban' && (
          <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-y-auto">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-xl bg-[#080808] border border-[#1a1a1a] p-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1a1a1a]">
                    <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#161616] text-zinc-300">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-lg bg-[#121212] border border-[#202020] shadow-sm space-y-2 select-text"
                      >
                        <p className="text-sm font-semibold text-zinc-100 leading-snug">{t.title}</p>

                        {/* Metadata Pills: Milestone and Requirement */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {t.milestone && (
                            <span className="inline-flex items-center space-x-1 text-xs font-medium px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                              <Target className="w-3 h-3 text-zinc-400" />
                              <span>{t.milestone.title}</span>
                            </span>
                          )}
                          {t.relatedArtifactId && (
                            <button
                              onClick={() => setActiveTab('prd')}
                              className="inline-flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c] hover:bg-[#242424] transition-colors"
                              title="Jump to Living PRD"
                            >
                              <FileText className="w-3 h-3 text-zinc-400" />
                              <span>{t.relatedArtifactId}</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300">
                            {t.priority}
                          </span>

                          <div className="flex items-center space-x-1 select-none">
                            {col.id !== 'TODO' && (
                              <button
                                onClick={() => handleTaskStatus(t.id, 'TODO')}
                                className="px-2 py-0.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-zinc-300"
                              >
                                ←
                              </button>
                            )}
                            {col.id !== 'DONE' && (
                              <button
                                onClick={() =>
                                  handleTaskStatus(t.id, col.id === 'TODO' ? 'IN_PROGRESS' : 'DONE')
                                }
                                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white"
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="h-32 flex items-center justify-center text-xs text-zinc-600">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SUB-VIEW 2: MILESTONES & ROADMAP */}
        {activeSubTab === 'milestones' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Target className="w-4 h-4 text-zinc-300" />
                  <span>Release Milestones & Roadmap</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Milestones package software planning requirements into concrete release phases.
                </p>
              </div>

              <button
                onClick={() => setIsMilestoneModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            <div className="space-y-4">
              {milestones.map((m) => {
                const mTasks = tasks.filter((t) => t.milestoneId === m.id);
                const completedCount = mTasks.filter((t) => t.status === 'DONE').length;
                const percent = mTasks.length > 0 ? Math.round((completedCount / mTasks.length) * 100) : 0;

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white">{m.title}</h3>
                          <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                            {m.status}
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{m.description}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-emerald-400">
                          {percent}% complete
                        </span>
                        <div className="w-32 bg-[#1a1a1a] h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 font-mono mt-1">
                          {completedCount} of {mTasks.length} tasks done
                        </p>
                      </div>
                    </div>

                    {/* Milestone Tasks list */}
                    <div className="border-t border-[#1a1a1a] pt-3">
                      <span className="text-xs font-semibold text-zinc-400 mb-2 block">
                        Assigned Tasks:
                      </span>
                      {mTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {mTasks.map((t) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-lg bg-[#141414] border border-[#202020] flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2 overflow-hidden">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    t.status === 'DONE'
                                      ? 'bg-emerald-400'
                                      : t.status === 'IN_PROGRESS'
                                      ? 'bg-zinc-300'
                                      : 'bg-zinc-600'
                                  }`}
                                />
                                <span className="font-medium text-zinc-200 truncate">{t.title}</span>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                {t.relatedArtifactId && (
                                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300">
                                    {t.relatedArtifactId}
                                  </span>
                                )}
                                <span className="text-xs text-zinc-400 uppercase font-mono">
                                  {t.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">No tasks assigned to this milestone yet.</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {milestones.length === 0 && (
                <div className="p-8 text-center text-zinc-500 border border-dashed border-[#222222] rounded-xl">
                  <Target className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">No milestones created yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Group requirements and tasks into release targets.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW 3: REQUIREMENTS COVERAGE MATRIX */}
        {activeSubTab === 'coverage' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Requirements Execution Coverage Matrix</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect every requirement from the Living PRD to ensure engineering tasks exist and are progressing.
              </p>
            </div>

            <div className="border border-[#1a1a1a] rounded-xl overflow-hidden bg-[#0c0c0c]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#121212] border-b border-[#1a1a1a] text-zinc-400 uppercase font-mono text-xs">
                  <tr>
                    <th className="py-2.5 px-4">Stable ID</th>
                    <th className="py-2.5 px-4">Requirement Title</th>
                    <th className="py-2.5 px-4">PRD Status</th>
                    <th className="py-2.5 px-4">Priority</th>
                    <th className="py-2.5 px-4">Execution Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {requirements.map((req) => {
                    const linkedTasks = tasks.filter(
                      (t) =>
                        t.relatedArtifactId === req.identifier ||
                        t.relatedArtifactId === req.id,
                    );
                    const isCovered = linkedTasks.length > 0;
                    const doneTasks = linkedTasks.filter((t) => t.status === 'DONE').length;

                    return (
                      <tr key={req.id} className="hover:bg-[#141414] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-200">
                          {req.identifier}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-200">{req.title}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-zinc-400 uppercase">
                          {req.priority}
                        </td>
                        <td className="py-3 px-4">
                          {isCovered ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-emerald-400 font-semibold text-xs">
                                {doneTasks}/{linkedTasks.length} tasks done
                              </span>
                              <div className="w-16 bg-[#1a1a1a] h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full"
                                  style={{
                                    width: `${Math.round((doneTasks / linkedTasks.length) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-zinc-400 font-semibold text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span>No tasks assigned</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openCreateTaskForRequirement(req.identifier)}
                            className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#242424] text-zinc-200 border border-[#2c2c2c] font-medium text-xs transition-colors"
                          >
                            + Link Task
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Drag Resizer Handle between Main Tasks and Concerns */}
        <div
          onMouseDown={startConcernsResize}
          className="w-1 bg-[#1a1a1a] hover:bg-zinc-500 cursor-col-resize active:bg-white transition-colors shrink-0 z-10"
          title="Drag to resize concerns"
        />

        {/* Concerns Quality Gate Drawer */}
        <div
          style={{ width: `${concernsWidth}px` }}
          className="bg-[#080808] border-l border-[#1a1a1a] flex flex-col shrink-0 p-4 space-y-3 overflow-y-auto select-none"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-zinc-400" />
              <span>Concerns Quality Gate ({concerns.length})</span>
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Strict lifecycle progression: OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → VERIFIED.
          </p>

          <div className="space-y-3">
            {concerns.map((c) => {
              const currentStepIdx = CONCERN_STEPS.indexOf(c.status);
              const isVerified = c.status === 'VERIFIED';
              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-100">{c.title}</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                      {c.priority}
                    </span>
                  </div>

                  {/* Step Tracker */}
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-500 py-1">
                    {CONCERN_STEPS.map((step, idx) => (
                      <span
                        key={step}
                        className={`font-semibold ${
                          idx <= currentStepIdx ? 'text-zinc-200' : 'text-zinc-600'
                        }`}
                      >
                        {step.substring(0, 3)}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-zinc-400 font-mono">{c.status}</span>
                    {!isVerified && (
                      <button
                        onClick={() => handleAdvanceConcern(c.id, c.status)}
                        className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#242424] border border-[#2c2c2c] text-zinc-200 text-xs font-bold flex items-center space-x-1 transition-colors"
                      >
                        <span>Advance</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {isVerified && (
                      <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {concerns.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-500">
                <ShieldCheck className="w-8 h-8 text-zinc-600 mb-1" />
                <p className="text-xs">No active concerns</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-md p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Create Task</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Link this task directly to a PRD requirement and target milestone.
            </p>
            <form onSubmit={handleCreateTask} className="space-y-3 mt-3">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title (e.g. Implement OAuth JWT strategy)..."
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Description / acceptance criteria..."
                rows={2}
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Target Milestone
                  </label>
                  <select
                    value={taskMilestoneId}
                    onChange={(e) => setTaskMilestoneId(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="">None</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Link to Requirement (Living PRD)
                </label>
                <select
                  value={taskRequirementId}
                  onChange={(e) => setTaskRequirementId(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400 font-mono"
                >
                  <option value="">None (Unlinked)</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.identifier}>
                      {r.identifier} - {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Milestone Modal */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-md p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Create Release Milestone</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Define a roadmap target to bundle requirements and execution tasks.
            </p>
            <form onSubmit={handleCreateMilestone} className="space-y-3">
              <input
                type="text"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="e.g. Sprint 2 - Realtime Engine"
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <textarea
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                placeholder="Scope and release targets..."
                rows={2}
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Status
                  </label>
                  <select
                    value={milestoneStatus}
                    onChange={(e) => setMilestoneStatus(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DELAYED">Delayed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={milestoneDate}
                    onChange={(e) => setMilestoneDate(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Concern Modal */}
      {isConcernModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-sm p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Raise Quality Concern</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Concerns prevent merge until explicitly resolved and verified.
            </p>
            <form onSubmit={handleCreateConcern} className="space-y-3">
              <input
                type="text"
                value={concernTitle}
                onChange={(e) => setConcernTitle(e.target.value)}
                placeholder="e.g. Ensure transaction pooling does not hold advisory locks"
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Priority</label>
                <select
                  value={concernPriority}
                  onChange={(e) => setConcernPriority(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                >
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setIsConcernModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Raise Concern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
