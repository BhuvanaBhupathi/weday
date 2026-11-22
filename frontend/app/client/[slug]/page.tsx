'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Radio,
  Target,
  FileText,
  Scale,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../../lib/api';

type ClientTab = 'milestones' | 'requirements' | 'change_requests' | 'decisions';

export default function ClientPortalPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>('milestones');

  // Password Protection State
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Submit Change Request Modal State
  const [isCrModalOpen, setIsCrModalOpen] = useState(false);
  const [crTitle, setCrTitle] = useState('');
  const [crDesc, setCrDesc] = useState('');
  const [crTargetReq, setCrTargetReq] = useState('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  useEffect(() => {
    if (!slug) return;
    loadClientSnapshot();
  }, [slug]);

  async function loadClientSnapshot() {
    setLoading(true);
    try {
      const res = await api.get(`/public/client/${slug}`);
      if (res.isPasswordProtected && !res.snapshot) {
        setIsPasswordProtected(true);
        setData(res);
      } else {
        setIsPasswordProtected(false);
        setData(res);
      }
    } catch (err: any) {
      console.error('Failed to load client snapshot', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    try {
      const res = await api.post(`/public/client/${slug}/verify-password`, {
        password: passwordInput,
      });
      setIsPasswordProtected(false);
      setData(res);
    } catch (err: any) {
      setPasswordError('Invalid password. Please verify with your project lead.');
    }
  }

  async function handleSubmitCr(e: React.FormEvent) {
    e.preventDefault();
    if (!crTitle.trim() || !crDesc.trim()) return;

    try {
      const res = await api.post(`/public/client/${slug}/change-requests`, {
        title: crTitle.trim(),
        description: crDesc.trim(),
        targetRequirementIdentifier: crTargetReq || undefined,
      });
      setSubmitSuccessMsg(
        `Change Request ${res.identifier || ''} submitted successfully! The engineering crew has been notified.`
      );
      setCrTitle('');
      setCrDesc('');
      setCrTargetReq('');
      setTimeout(() => {
        setIsCrModalOpen(false);
        setSubmitSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#060a12] flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center animate-pulse shadow-lg shadow-sky-500/20">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs text-slate-400 font-mono">Loading project portal...</p>
      </div>
    );
  }

  if (isPasswordProtected) {
    return (
      <div className="h-screen w-screen bg-[#060a12] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm p-6 rounded-2xl bg-[#0b1220] border border-slate-800 shadow-2xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{data?.bandName || 'Project'} Portal</h2>
            <p className="text-xs text-slate-400 mt-1">
              This publication snapshot is password protected.
            </p>
          </div>

          <form onSubmit={handleVerifyPassword} className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password..."
              className="w-full bg-[#060a12] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
            {passwordError && (
              <p className="text-rose-400 text-[11px] font-medium">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              Unlock Projection
            </button>
          </form>
        </div>
      </div>
    );
  }

  const snapshot = data?.snapshot;
  const project = snapshot?.project;
  const milestones = snapshot?.milestones || [];
  const requirements = snapshot?.requirements || [];
  const decisions = snapshot?.decisions || [];
  const changeRequests = snapshot?.changeRequests || [];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 font-sans flex flex-col select-none">
      {/* Client Header */}
      <header className="h-16 border-b border-[#1e293b] bg-[#0c1424]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-0.5 cursor-pointer">
            <span className="font-inconsolata font-black text-2xl tracking-tighter text-white">fri</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] shadow-[0_0_8px_#C4B5FD] mt-0.5" />
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white tracking-tight">
                  {project?.name || data?.bandName || 'Client Portal'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                  Client Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Snapshot v{data?.versionNumber || 1}.0 • Published by {data?.publishedBy || 'Team'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCrModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white shadow-lg shadow-sky-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Scope Change</span>
          </button>
        </div>
      </header>

      {/* Snapshot Banner */}
      <div className="bg-[#0b1222] border-b border-[#1e293b] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">{snapshot?.title || 'Current Projection'}</h1>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
              {snapshot?.summary || 'Transparent status snapshot of requirements, milestones, and scope adjustments.'}
            </p>
          </div>

          <div className="flex items-center space-x-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Milestones</span>
              <strong className="text-white text-sm">{milestones.length}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Requirements</span>
              <strong className="text-white text-sm">{requirements.length}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Scope Changes</span>
              <strong className="text-amber-400 text-sm">{changeRequests.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="border-b border-[#1e293b] bg-[#090e1c] px-6">
        <div className="max-w-6xl mx-auto flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'milestones'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Roadmap & Milestones ({milestones.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requirements')}
            className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'requirements'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Living Requirements ({requirements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('change_requests')}
            className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'change_requests'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitPullRequest className="w-4 h-4" />
            <span>Scope & Change Requests ({changeRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'decisions'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Architecture Decisions ({decisions.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* MILESTONES TAB */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">Release Phases & Delivery Progress</h2>
            <div className="space-y-3">
              {milestones.map((m: any) => (
                <div
                  key={m.id || m.title}
                  className="p-5 rounded-xl bg-[#0b1220] border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white">{m.title}</h3>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase ${
                            m.status === 'COMPLETED'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                              : m.status === 'IN_PROGRESS'
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      {m.description && (
                        <p className="text-xs text-slate-400 mt-1">{m.description}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {m.progressPercent || 0}% Complete
                      </span>
                      <div className="w-36 bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${m.progressPercent || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                        {m.completedTasks || 0} of {m.totalTasks || 0} tasks finished
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {milestones.length === 0 && (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <Target className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs">No milestones in this snapshot.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REQUIREMENTS TAB */}
        {activeTab === 'requirements' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">Defined Functional Requirements</h2>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0a0f1d]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e172a] border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Identifier</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Change State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {requirements.map((req: any) => (
                    <tr key={req.identifier} className="hover:bg-slate-900/30">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">
                        {req.identifier}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{req.title}</td>
                      <td className="py-3 px-4 text-slate-400 max-w-sm text-xs leading-relaxed">
                        {req.description}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400 uppercase">
                        {req.priority}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                            req.changeState === 'MODIFIED'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                              : req.changeState === 'NEW'
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {req.changeState || 'UNCHANGED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CHANGE REQUESTS TAB */}
        {activeTab === 'change_requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Scope & Change Requests Log</h2>
              <button
                onClick={() => setIsCrModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Submit Change</span>
              </button>
            </div>

            <div className="space-y-3">
              {changeRequests.map((cr: any) => (
                <div
                  key={cr.identifier}
                  className="p-4 rounded-xl bg-[#0b1220] border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                        {cr.identifier}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{cr.title}</h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                        {cr.source}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        cr.status === 'APPROVED' || cr.status === 'APPLIED'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                          : cr.status === 'PENDING'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                      }`}
                    >
                      {cr.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-1">{cr.description}</p>
                </div>
              ))}

              {changeRequests.length === 0 && (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <GitPullRequest className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs">No change requests recorded in this snapshot.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DECISIONS TAB */}
        {activeTab === 'decisions' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">Accepted Architectural Decisions</h2>
            <div className="space-y-3">
              {decisions.map((dec: any) => (
                <div
                  key={dec.identifier}
                  className="p-4 rounded-xl bg-[#0b1220] border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
                        {dec.identifier}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{dec.title}</h3>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                      ACCEPTED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-1">{dec.rationale}</p>
                </div>
              ))}

              {decisions.length === 0 && (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <Scale className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs">No decisions documented in this snapshot.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Client Submit Change Request Modal */}
      {isCrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0b1220] border border-slate-800 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Request Scope Modification</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your request will be submitted directly to the engineering team for impact analysis and review.
              </p>
            </div>

            {submitSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{submitSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitCr} className="space-y-3">
                <input
                  type="text"
                  value={crTitle}
                  onChange={(e) => setCrTitle(e.target.value)}
                  placeholder="Summary of requested change..."
                  className="w-full bg-[#060a12] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />

                <textarea
                  value={crDesc}
                  onChange={(e) => setCrDesc(e.target.value)}
                  placeholder="Detailed business requirements or reason for change..."
                  rows={3}
                  className="w-full bg-[#060a12] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Related Requirement (Optional)
                  </label>
                  <select
                    value={crTargetReq}
                    onChange={(e) => setCrTargetReq(e.target.value)}
                    className="w-full bg-[#060a12] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  >
                    <option value="">None (New Scope)</option>
                    {requirements.map((r: any) => (
                      <option key={r.identifier} value={r.identifier}>
                        {r.identifier} - {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCrModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-colors"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
