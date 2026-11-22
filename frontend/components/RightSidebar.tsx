'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Activity,
  Send,
  Sparkles,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  GitCommit,
} from 'lucide-react';
import { useWorkspaceStore } from '../lib/store';
import { api } from '../lib/api';
import { signatureColorFor } from '../lib/signature-colors';

export default function RightSidebar() {
  const { isRightPanelOpen, activeBand, user } = useWorkspaceStore();
  const [panelTab, setPanelTab] = useState<'chat' | 'activity'>('chat');
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load channels & activity on activeBand change
  useEffect(() => {
    if (!activeBand) return;
    loadChannels();
    loadActivity();
  }, [activeBand]);

  // Load messages on channel change
  useEffect(() => {
    if (!activeChannel) return;
    loadMessages(activeChannel.id);
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChannels() {
    if (!activeBand) return;
    try {
      const data = await api.get(`/bands/${activeBand.id}/chat/channels`);
      setChannels(data);
      if (data.length > 0 && !activeChannel) {
        setActiveChannel(data[0]);
      }
    } catch (err) {
      console.error('Failed to load channels', err);
    }
  }

  async function loadMessages(channelId: string) {
    try {
      const data = await api.get(`/chat/channels/${channelId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }

  async function loadActivity() {
    if (!activeBand) return;
    try {
      const res = await api.get(`/bands/${activeBand.id}/activity`);
      setActivities(res.data || []);
    } catch (err) {
      console.error('Failed to load activity', err);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !activeChannel) return;
    const content = messageInput.trim();
    setMessageInput('');

    try {
      const newMsg = await api.post(`/chat/channels/${activeChannel.id}/messages`, {
        content,
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  }

  if (!isRightPanelOpen) return null;

  return (
    <aside className="w-80 border-l border-[#1e293b] bg-[#0a0f1d] flex flex-col justify-between shrink-0 select-none">
      {/* Top: Switcher (Chat / Activity) */}
      <div className="h-11 border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 bg-[#0d1322]">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setPanelTab('chat')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              panelTab === 'chat'
                ? 'bg-[#1a233a] text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => {
              setPanelTab('activity');
              loadActivity();
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              panelTab === 'activity'
                ? 'bg-[#1a233a] text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity</span>
          </button>
        </div>

        {activeBand && (
          <span className="text-[10px] text-slate-500 font-mono">
            {activeChannel ? `#${activeChannel.name}` : ''}
          </span>
        )}
      </div>

      {panelTab === 'chat' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Channels Strip */}
          <div className="p-2 border-b border-slate-800/60 flex items-center space-x-1 overflow-x-auto bg-[#070b14]">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                  activeChannel?.id === ch.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Hash className="w-3 h-3" />
                <span>{ch.name}</span>
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Hash className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">
                  Welcome to #{activeChannel?.name || 'channel'}!
                </p>
                <p className="text-[11px] mt-1 text-slate-600">
                  This is the start of the #{activeChannel?.name} channel.
                </p>
              </div>
            )}

            {messages.map((m) => {
              const authorColor = signatureColorFor(m.author);
              return (
              <div key={m.id} className="flex items-start space-x-2.5 group">
                <img
                  src={m.author?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.author?.username || 'user'}`}
                  alt={m.author?.displayName}
                  className="w-6 h-6 rounded-full mt-0.5 border-2 shrink-0"
                  style={{ borderColor: authorColor }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-xs font-semibold" style={{ color: authorColor }}>
                      {m.author?.displayName || 'Developer'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">
                    {m.content}
                  </p>
                </div>
              </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-800/80 bg-[#080d19]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message #${activeChannel?.name || 'channel'}...`}
                className="w-full bg-[#111726] border border-slate-700/80 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="absolute right-1.5 p-1.5 rounded-md text-slate-400 hover:text-sky-400 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Activity Stream */
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {activities.map((act) => {
            const actorColor = signatureColorFor(act.user);
            return (
            <div
              key={act.id}
              className="p-2.5 rounded-lg bg-[#0e1526] border border-slate-800/80 flex items-start space-x-2.5 text-xs text-slate-300"
            >
              <div
                className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0"
                style={{
                  borderColor: actorColor,
                  backgroundColor: `${actorColor}1f`,
                  color: actorColor,
                }}
              >
                <Clock className="w-3 h-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white truncate text-[11px]">
                  {act.type.replace(/_/g, ' ')}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  by{' '}
                  <span className="font-semibold" style={{ color: actorColor }}>
                    {act.user?.displayName || 'System'}
                  </span>
                </p>
                <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                  {new Date(act.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            );
          })}

          {activities.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <Activity className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
              <p className="text-xs">No project activity recorded yet</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
