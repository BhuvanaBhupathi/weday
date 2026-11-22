'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Palette,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';
import {
  SIGNATURE_COLOR_PALETTE,
  colorMapFromMembers,
  fallbackSignatureColor,
} from '../../lib/signature-colors';

interface CrewPanelProps {
  width?: number;
}

export default function CrewPanel({ width }: CrewPanelProps) {
  const { activeBand, user, setIsHomeView, setActiveDmUser } = useWorkspaceStore();
  const [members, setMembers] = useState<any[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);

  // Signature color lookup: userId → band-scoped color (with deterministic fallback)
  const colorMap = colorMapFromMembers(members);
  const myMembership = members.find((m) => m.user?.id === user?.id);
  const myColor =
    myMembership?.signatureColor || (user ? fallbackSignatureColor(user.id) : '#9775fa');

  useEffect(() => {
    if (!activeBand) return;
    loadBandMembers();
  }, [activeBand]);

  async function loadBandMembers() {
    if (!activeBand) return;
    try {
      const membersRes = await api.get(`/bands/${activeBand.id}/members`).catch(() => []);
      setMembers(membersRes || []);
    } catch (err) {
      console.error('Failed to load band members', err);
    }
  }

  function handleStartDmWithMember(targetUser: any) {
    setActiveDmUser(targetUser);
    setIsHomeView(true);
  }

  async function handlePickSignatureColor(color: string) {
    if (!activeBand || !user || isUpdatingColor) return;
    setIsUpdatingColor(true);
    try {
      await api.patch(`/bands/${activeBand.id}/members/${user.id}/signature-color`, { color });
      setIsPickerOpen(false);
      await loadBandMembers();
    } catch (err: any) {
      alert(`Could not update signature color: ${err.message}`);
    } finally {
      setIsUpdatingColor(false);
    }
  }

  // Group members by role
  const leads = members.filter((m) => m.role === 'CREW_LEAD' || m.role === 'ADMIN');
  const engineers = members.filter((m) => m.role === 'MEMBER' || m.role === 'ENGINEER');
  const clients = members.filter((m) => m.role === 'CLIENT');

  return (
    <aside
      style={{ width: width ? `${width}px` : undefined }}
      className="w-64 bg-[#080808] border-l border-[#1a1a1a] flex flex-col shrink-0 select-none overflow-hidden"
    >
      {/* Header: Crew */}
      <div className="h-12 border-b border-[#1a1a1a] px-3 flex items-center bg-[#0e0e0e] shrink-0">
        <div className="flex items-center space-x-1.5 text-zinc-300">
          <Users className="w-4 h-4" />
          <span className="text-xs font-semibold">Crew ({members.length || 1})</span>
        </div>
      </div>

      {/* CREW MEMBERS */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4">
          {/* Leads */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block px-1">
              Crew Leads — {leads.length > 0 ? leads.length : 1}
            </span>
            {leads.length > 0 ? (
              leads.map((m) => {
                const color = colorMap[m.user?.id] || '#9775fa';
                const isMe = m.user?.id === user?.id;
                return (
                <div
                  key={m.id}
                  onClick={() => handleStartDmWithMember(m.user)}
                  className="px-2.5 py-2 rounded-lg hover:bg-[#161616] flex items-center space-x-2.5 cursor-pointer group transition-colors"
                >
                  <div className="relative shrink-0">
                    <img
                      src={m.user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user?.username}`}
                      alt={m.user?.displayName}
                      className="w-8 h-8 rounded-full border-2"
                      style={{ borderColor: color }}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080808]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <p className="text-sm font-semibold truncate" style={{ color }}>
                        {m.user?.displayName}
                      </p>
                      {isMe && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPickerOpen((v) => !v);
                          }}
                          className="shrink-0 p-0.5 rounded hover:bg-[#222222] transition-colors"
                          title="Change my signature color"
                        >
                          <span
                            className="block w-3.5 h-3.5 rounded-full border-2 border-[#080808] ring-1 ring-zinc-500"
                            style={{ backgroundColor: color }}
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">Core Architect</p>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="px-2.5 py-2 rounded-lg hover:bg-[#161616] flex items-center space-x-2.5 cursor-pointer">
                <div className="relative shrink-0">
                  <img
                    src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=admin`}
                    alt="Admin"
                    className="w-8 h-8 rounded-full border border-zinc-700"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080808]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user?.displayName || 'Lead Architect'}</p>
                  <p className="text-xs text-zinc-400 truncate">Online • Planning</p>
                </div>
              </div>
            )}
          </div>

          {/* Engineers */}
          {engineers.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block px-1">
                Engineers — {engineers.length}
              </span>
              {engineers.map((m) => {
                const color = colorMap[m.user?.id] || '#9775fa';
                const isMe = m.user?.id === user?.id;
                return (
                <div
                  key={m.id}
                  onClick={() => handleStartDmWithMember(m.user)}
                  className="px-2.5 py-2 rounded-lg hover:bg-[#161616] flex items-center space-x-2.5 cursor-pointer group transition-colors"
                >
                  <div className="relative shrink-0">
                    <img
                      src={m.user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user?.username}`}
                      alt={m.user?.displayName}
                      className="w-8 h-8 rounded-full border-2"
                      style={{ borderColor: color }}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080808]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <p className="text-sm font-semibold text-zinc-200 truncate" style={{ color }}>
                        {m.user?.displayName}
                      </p>
                      {isMe && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPickerOpen((v) => !v);
                          }}
                          className="shrink-0 p-0.5 rounded hover:bg-[#222222] transition-colors"
                          title="Change my signature color"
                        >
                          <span
                            className="block w-3.5 h-3.5 rounded-full border-2 border-[#080808] ring-1 ring-zinc-500"
                            style={{ backgroundColor: color }}
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">Engineer</p>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Clients */}
          {clients.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block px-1">
                Clients — {clients.length}
              </span>
              {clients.map((m) => {
                const color = colorMap[m.user?.id] || '#9775fa';
                const isMe = m.user?.id === user?.id;
                return (
                <div
                  key={m.id}
                  onClick={() => handleStartDmWithMember(m.user)}
                  className="px-2.5 py-2 rounded-lg hover:bg-[#161616] flex items-center space-x-2.5 cursor-pointer group transition-colors"
                >
                  <div className="relative shrink-0">
                    <img
                      src={m.user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user?.username}`}
                      alt={m.user?.displayName}
                      className="w-8 h-8 rounded-full border-2"
                      style={{ borderColor: color }}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-400 border-2 border-[#080808]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <p className="text-sm font-semibold text-zinc-200 truncate" style={{ color }}>
                        {m.user?.displayName}
                      </p>
                      {isMe && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPickerOpen((v) => !v);
                          }}
                          className="shrink-0 p-0.5 rounded hover:bg-[#222222] transition-colors"
                          title="Change my signature color"
                        >
                          <span
                            className="block w-3.5 h-3.5 rounded-full border-2 border-[#080808] ring-1 ring-zinc-500"
                            style={{ backgroundColor: color }}
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">Client Stakeholder</p>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Signature color picker (own color) */}
          {isPickerOpen && (
            <div className="p-2.5 rounded-lg bg-[#101010] border border-[#2a2a2a] space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>My signature color</span>
                </p>
                <button
                  onClick={() => setIsPickerOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {SIGNATURE_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => handlePickSignatureColor(c)}
                    disabled={isUpdatingColor}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 disabled:opacity-50 ${
                      myColor.toLowerCase() === c.toLowerCase()
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#101010]'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              {isUpdatingColor && (
                <p className="text-[10px] text-zinc-500">Updating…</p>
              )}
            </div>
          )}
        </div>
    </aside>
  );
}
