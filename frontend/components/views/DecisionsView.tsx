'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  GitPullRequest,
  Plus,
  HelpCircle,
  Lightbulb,
  Check,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

type SubTab = 'decisions' | 'change_requests' | 'questions_assumptions';

export default function DecisionsView() {
  const { activeBand, setActiveTab } = useWorkspaceStore();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('decisions');

  const [decisions, setDecisions] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [assumptions, setAssumptions] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);

  // Modals
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [decisionStatus, setDecisionStatus] = useState('ACCEPTED');
  const [decisionReqId, setDecisionReqId] = useState('');

  const [isCrModalOpen, setIsCrModalOpen] = useState(false);
  const [crTitle, setCrTitle] = useState('');
  const [crDesc, setCrDesc] = useState('');
  const [crSource, setCrSource] = useState('INTERNAL');
  const [crTargetReqId, setCrTargetReqId] = useState('');

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionDesc, setQuestionDesc] = useState('');

  const [isAssumptionModalOpen, setIsAssumptionModalOpen] = useState(false);
  const [assumptionTitle, setAssumptionTitle] = useState('');
  const [assumptionDesc, setAssumptionDesc] = useState('');

  useEffect(() => {
    if (!activeBand) return;
    loadData();
  }, [activeBand]);

  async function loadData() {
    if (!activeBand) return;
    try {
      const [decRes, crRes, qRes, aRes, reqsRes] = await Promise.all([
        api.get(`/bands/${activeBand.id}/decisions`),
        api.get(`/bands/${activeBand.id}/change-requests`),
        api.get(`/bands/${activeBand.id}/questions`),
        api.get(`/bands/${activeBand.id}/assumptions`),
        api.get(`/bands/${activeBand.id}/requirements`),
      ]);
      setDecisions(decRes || []);
      setChangeRequests(crRes || []);
      setQuestions(qRes || []);
      setAssumptions(aRes || []);
      setRequirements(reqsRes || []);
    } catch (err) {
      console.error('Failed to load decisions & governance data', err);
    }
  }

  async function handleCreateDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !decisionTitle.trim() || !decisionRationale.trim()) return;
    try {
      const created = await api.post(`/bands/${activeBand.id}/decisions`, {
        title: decisionTitle.trim(),
        rationale: decisionRationale.trim(),
        status: decisionStatus,
        requirementId: decisionReqId || undefined,
      });
      setDecisions([created, ...decisions]);
      setIsDecisionModalOpen(false);
      setDecisionTitle('');
      setDecisionRationale('');
      loadData();
    } catch (err: any) {
      alert(`Decision error: ${err.message}`);
    }
  }

  async function handleCreateCr(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !crTitle.trim() || !crDesc.trim()) return;
    try {
      const created = await api.post(`/bands/${activeBand.id}/change-requests`, {
        title: crTitle.trim(),
        description: crDesc.trim(),
        source: crSource,
        targetRequirementId: crTargetReqId || undefined,
      });
      setChangeRequests([created, ...changeRequests]);
      setIsCrModalOpen(false);
      setCrTitle('');
      setCrDesc('');
      loadData();
    } catch (err: any) {
      alert(`Change request error: ${err.message}`);
    }
  }

  async function handleReviewCr(crId: string, status: string) {
    if (!activeBand) return;
    try {
      const updated = await api.patch(`/bands/${activeBand.id}/change-requests/${crId}`, {
        status,
        reviewNotes: `Reviewed and marked ${status} by engineering lead.`,
      });
      setChangeRequests(changeRequests.map((c) => (c.id === crId ? updated : c)));
      loadData();
    } catch (err: any) {
      alert(`Review error: ${err.message}`);
    }
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !questionTitle.trim()) return;
    try {
      const created = await api.post(`/bands/${activeBand.id}/questions`, {
        title: questionTitle.trim(),
        description: questionDesc.trim() || undefined,
      });
      setQuestions([...questions, created]);
      setIsQuestionModalOpen(false);
      setQuestionTitle('');
      setQuestionDesc('');
    } catch (err: any) {
      alert(`Question error: ${err.message}`);
    }
  }

  async function handleAnswerQuestion(qId: string) {
    if (!activeBand) return;
    try {
      const updated = await api.patch(`/bands/${activeBand.id}/questions/${qId}`, {
        status: 'ANSWERED',
      });
      setQuestions(questions.map((q) => (q.id === qId ? updated : q)));
    } catch (err: any) {
      alert(`Failed to update question: ${err.message}`);
    }
  }

  async function handleCreateAssumption(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBand || !assumptionTitle.trim()) return;
    try {
      const created = await api.post(`/bands/${activeBand.id}/assumptions`, {
        title: assumptionTitle.trim(),
        description: assumptionDesc.trim() || undefined,
      });
      setAssumptions([...assumptions, created]);
      setIsAssumptionModalOpen(false);
      setAssumptionTitle('');
      setAssumptionDesc('');
    } catch (err: any) {
      alert(`Assumption error: ${err.message}`);
    }
  }

  async function handleToggleValidateAssumption(aId: string, currentVal: boolean) {
    if (!activeBand) return;
    try {
      const updated = await api.patch(`/bands/${activeBand.id}/assumptions/${aId}`, {
        isValidated: !currentVal,
      });
      setAssumptions(assumptions.map((a) => (a.id === aId ? updated : a)));
    } catch (err: any) {
      alert(`Assumption toggle error: ${err.message}`);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-[#1a1a1a] px-4 flex items-center justify-between bg-[#0a0a0a] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-zinc-300" />
            <span className="text-sm font-bold text-white">Governance & Decisions</span>
          </div>

          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center bg-[#101010] p-1 rounded-lg border border-[#222222] space-x-1">
            <button
              onClick={() => setActiveSubTab('decisions')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'decisions'
                  ? 'bg-[#fef08a]/15 text-[#fef9c3] border border-[#fef08a]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Decisions Log ({decisions.length})
            </button>
            <button
              onClick={() => setActiveSubTab('change_requests')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'change_requests'
                  ? 'bg-[#fed7aa]/15 text-[#ffedd5] border border-[#fed7aa]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Change Requests ({changeRequests.length})
            </button>
            <button
              onClick={() => setActiveSubTab('questions_assumptions')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'questions_assumptions'
                  ? 'bg-[#bfdbfe]/15 text-[#dbeafe] border border-[#bfdbfe]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Questions & Assumptions ({questions.length + assumptions.length})
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeSubTab === 'decisions' && (
            <button
              onClick={() => setIsDecisionModalOpen(true)}
              className="px-3.5 py-1.5 rounded-md bg-[#fef08a]/15 hover:bg-[#fef08a]/25 text-[#fef9c3] border border-[#fef08a]/40 text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#fef08a]" />
              <span>Record Decision</span>
            </button>
          )}

          {activeSubTab === 'change_requests' && (
            <button
              onClick={() => setIsCrModalOpen(true)}
              className="px-3.5 py-1.5 rounded-md bg-[#fed7aa]/15 hover:bg-[#fed7aa]/25 text-[#ffedd5] border border-[#fed7aa]/40 text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#fed7aa]" />
              <span>New Change Request</span>
            </button>
          )}

          {activeSubTab === 'questions_assumptions' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsQuestionModalOpen(true)}
                className="px-3 py-1.5 rounded-md bg-[#bfdbfe]/10 hover:bg-[#bfdbfe]/20 text-[#dbeafe] border border-[#bfdbfe]/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#bfdbfe]" />
                <span>Ask Question</span>
              </button>
              <button
                onClick={() => setIsAssumptionModalOpen(true)}
                className="px-3 py-1.5 rounded-md bg-[#ddd6fe]/10 hover:bg-[#ddd6fe]/20 text-[#ede9fe] border border-[#ddd6fe]/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-[#ddd6fe]" />
                <span>Log Assumption</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#000000]">
        {/* SUB-VIEW 1: DECISIONS LOG */}
        {activeSubTab === 'decisions' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Scale className="w-4 h-4 text-zinc-300" />
                <span>Architectural & Scope Decisions Log (ADRs)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Explicit technical decisions with stable identifiers (DEC-xxx), immutable history, and requirement links.
              </p>
            </div>

            <div className="space-y-3">
              {decisions.map((dec) => (
                <div
                  key={dec.id}
                  className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] shadow-sm space-y-2 select-text"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-200 border border-[#2c2c2c]">
                        {dec.identifier}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{dec.title}</h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      {dec.requirement && (
                        <button
                          onClick={() => setActiveTab('prd')}
                          className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c] hover:bg-[#242424] transition-colors"
                        >
                          {dec.requirement.identifier}
                        </button>
                      )}
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#161616] text-zinc-300 border border-[#2c2c2c]">
                        {dec.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed pl-1">{dec.rationale}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a] text-xs text-zinc-500 font-mono">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Decided by {dec.decidedBy?.displayName || 'Admin'}</span>
                    </div>
                    <span>{new Date(dec.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {decisions.length === 0 && (
                <div className="p-8 text-center text-zinc-500 border border-dashed border-[#222222] rounded-xl">
                  <Scale className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">No decisions recorded yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Record technology choices, library selections, and architecture rules.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW 2: CHANGE REQUESTS */}
        {activeSubTab === 'change_requests' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <GitPullRequest className="w-4 h-4 text-zinc-300" />
                <span>Change Requests & Scope Control (CR-xxx)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Formal mechanism to govern client or internal scope adjustments. Approved requests automatically update requirements state.
              </p>
            </div>

            <div className="space-y-3">
              {changeRequests.map((cr) => (
                <div
                  key={cr.id}
                  className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] shadow-sm space-y-3 select-text"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-200 border border-[#2c2c2c]">
                        {cr.identifier}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{cr.title}</h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#161616] text-zinc-400 uppercase">
                        {cr.source}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {cr.targetRequirement && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                          Targets {cr.targetRequirement.identifier}
                        </span>
                      )}
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#161616] text-zinc-300 border border-[#2c2c2c]">
                        {cr.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed pl-1">{cr.description}</p>

                  {cr.reviewNotes && (
                    <div className="bg-[#141414] p-2.5 rounded-lg border border-[#222222] text-xs text-zinc-300">
                      <span className="font-semibold text-zinc-400 block text-xs uppercase font-mono">
                        Review Notes:
                      </span>
                      {cr.reviewNotes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a] text-xs text-zinc-500 font-mono">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Requested by {cr.author?.displayName || 'User'}</span>
                    </div>

                    {cr.status === 'PENDING' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReviewCr(cr.id, 'APPROVED')}
                          className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-sans font-semibold text-xs flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReviewCr(cr.id, 'REJECTED')}
                          className="px-3 py-1 rounded bg-[#1a1a1a] hover:bg-[#242424] text-zinc-400 border border-[#2c2c2c] font-sans font-semibold text-xs flex items-center space-x-1"
                        >
                          <X className="w-3 h-3 text-rose-400" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {changeRequests.length === 0 && (
                <div className="p-8 text-center text-zinc-500 border border-dashed border-[#222222] rounded-xl">
                  <GitPullRequest className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">No change requests active</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Formalize client scope changes or architecture adjustments here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW 3: QUESTIONS & ASSUMPTIONS */}
        {activeSubTab === 'questions_assumptions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {/* Questions Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-zinc-300" />
                  <span>Open Questions ({questions.length})</span>
                </h3>
                <button
                  onClick={() => setIsQuestionModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                >
                  + Question
                </button>
              </div>

              <div className="space-y-2.5">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">{q.title}</h4>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c1c1c] text-zinc-300 border border-[#2c2c2c]">
                        {q.status}
                      </span>
                    </div>
                    {q.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{q.description}</p>
                    )}
                    {q.status !== 'ANSWERED' && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => handleAnswerQuestion(q.id)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
                        >
                          Mark Answered
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assumptions Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-zinc-300" />
                  <span>Project Assumptions ({assumptions.length})</span>
                </h3>
                <button
                  onClick={() => setIsAssumptionModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                >
                  + Assumption
                </button>
              </div>

              <div className="space-y-2.5">
                {assumptions.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">{a.title}</h4>
                      <button
                        onClick={() => handleToggleValidateAssumption(a.id, a.isValidated)}
                        className={`text-xs font-mono px-2 py-0.5 rounded flex items-center space-x-1 transition-colors ${
                          a.isValidated
                            ? 'bg-[#1c1c1c] text-emerald-400 border border-emerald-800/40'
                            : 'bg-[#161616] text-zinc-400 hover:text-white border border-[#262626]'
                        }`}
                      >
                        {a.isValidated ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Validated</span>
                          </>
                        ) : (
                          <span>Unvalidated</span>
                        )}
                      </button>
                    </div>
                    {a.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{a.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Record Decision Modal */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-md p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Record Architectural Decision</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Create an immutable record explaining technical and scope choices.
            </p>
            <form onSubmit={handleCreateDecision} className="space-y-3">
              <input
                type="text"
                value={decisionTitle}
                onChange={(e) => setDecisionTitle(e.target.value)}
                placeholder="e.g. Standardize on Vitest for testing"
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <textarea
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Context, rationale, trade-offs, and consequences..."
                rows={3}
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Status</label>
                  <select
                    value={decisionStatus}
                    onChange={(e) => setDecisionStatus(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="PROPOSED">Proposed</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="SUPERSEDED">Superseded</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Requirement Link
                  </label>
                  <select
                    value={decisionReqId}
                    onChange={(e) => setDecisionReqId(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400 font-mono"
                  >
                    <option value="">None</option>
                    {requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.identifier} - {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Record Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Change Request Modal */}
      {isCrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-md p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Submit Change Request</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Request scope modifications to an existing requirement.
            </p>
            <form onSubmit={handleCreateCr} className="space-y-3">
              <input
                type="text"
                value={crTitle}
                onChange={(e) => setCrTitle(e.target.value)}
                placeholder="e.g. Add Biometric Passkey Login"
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <textarea
                value={crDesc}
                onChange={(e) => setCrDesc(e.target.value)}
                placeholder="Describe the requested change, source, and rationale..."
                rows={3}
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Source</label>
                  <select
                    value={crSource}
                    onChange={(e) => setCrSource(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="INTERNAL">Internal Engineering</option>
                    <option value="CLIENT">Client Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Target Requirement
                  </label>
                  <select
                    value={crTargetReqId}
                    onChange={(e) => setCrTargetReqId(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-400 font-mono"
                  >
                    <option value="">None</option>
                    {requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.identifier} - {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setIsCrModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Submit Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-sm p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Ask Open Question</h3>
            <form onSubmit={handleCreateQuestion} className="space-y-3 mt-3">
              <input
                type="text"
                value={questionTitle}
                onChange={(e) => setQuestionTitle(e.target.value)}
                placeholder="What question needs resolving?"
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />
              <textarea
                value={questionDesc}
                onChange={(e) => setQuestionDesc(e.target.value)}
                placeholder="Extra context or options..."
                rows={2}
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              />
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Post Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Assumption Modal */}
      {isAssumptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#262626] w-full max-w-sm p-5 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Log Project Assumption</h3>
            <form onSubmit={handleCreateAssumption} className="space-y-3 mt-3">
              <input
                type="text"
                value={assumptionTitle}
                onChange={(e) => setAssumptionTitle(e.target.value)}
                placeholder="What assumption are we making?"
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />
              <textarea
                value={assumptionDesc}
                onChange={(e) => setAssumptionDesc(e.target.value)}
                placeholder="How will this be verified?"
                rows={2}
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              />
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setIsAssumptionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Save Assumption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
