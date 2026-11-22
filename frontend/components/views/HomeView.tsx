'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  MessageSquare,
  Search,
  Plus,
  CheckCircle2,
  Send,
  UserPlus,
  Check,
  ChevronRight,
  User as UserIcon,
  Copy,
} from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store';
import { api } from '../../lib/api';

type FriendsTab = 'online' | 'all' | 'pending' | 'add_friend';

export default function HomeView() {
  const { user, bands, setActiveBand, setIsHomeView } = useWorkspaceStore();

  // Column widths with drag resizing
  const [dmWidth, setDmWidth] = useState(260);
  const [tasksWidth, setTasksWidth] = useState(320);
  const isDraggingDm = useRef(false);
  const isDraggingTasks = useRef(false);

  // Navigation state within Home
  const [selectedDmUser, setSelectedDmUser] = useState<any | null>(null);
  const [friendsTab, setFriendsTab] = useState<FriendsTab>('all');
  const [friendsSearch, setFriendsSearch] = useState('');

  // Data states
  const [crew, setCrew] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Add friend form
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendMsg, setAddFriendMsg] = useState('');
  const [copiedUsername, setCopiedUsername] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  useEffect(() => {
    if (selectedDmUser) {
      loadDmMessages(selectedDmUser.id);
    }
  }, [selectedDmUser]);

  // ─── Column Drag Resizing ──────────────────────────────────────────────────

  const handleMouseDownDm = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDm.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingDm.current) return;
      // Subtract ServerRail width (68px)
      const newWidth = Math.max(190, Math.min(ev.clientX - 68, 420));
      setDmWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingDm.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseDownTasks = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingTasks.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingTasks.current) return;
      const newWidth = Math.max(240, Math.min(window.innerWidth - ev.clientX, 480));
      setTasksWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingTasks.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  // ─── Data Loaders ─────────────────────────────────────────────────────────

  async function loadHomeData() {
    try {
      const [crewRes, tasksRes] = await Promise.all([
        api.get('/crew'),
        api.get('/tasks/my'),
      ]);
      setCrew(crewRes || []);
      setMyTasks(tasksRes || []);
    } catch (err) {
      console.error('Failed to load home data', err);
    }
  }

  async function loadDmMessages(targetUserId: string) {
    try {
      const msgs = await api.get(`/chat/dms/${targetUserId}`);
      setDmMessages(msgs || []);
    } catch (err) {
      console.error('Failed to load DM messages', err);
    }
  }

  async function handleSendDm(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDmUser || !messageInput.trim() || isSending) return;
    setIsSending(true);
    try {
      const sent = await api.post(`/chat/dms/${selectedDmUser.id}`, {
        content: messageInput.trim(),
      });
      setDmMessages([...dmMessages, sent]);
      setMessageInput('');
    } catch (err: any) {
      alert(`Error sending message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  }

  async function handleAddFriendSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addFriendInput.trim()) return;
    try {
      await api.post('/crew/request', { username: addFriendInput.trim() });
      setAddFriendMsg(`Friend request sent to ${addFriendInput.trim()}!`);
      setAddFriendInput('');
      loadHomeData();
      setTimeout(() => setAddFriendMsg(''), 4000);
    } catch (err: any) {
      setAddFriendMsg(`Error: ${err.message}`);
    }
  }

  async function handleToggleTaskStatus(taskId: string, currentStatus: string) {
    try {
      const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
      await api.patch(`/tasks/${taskId}`, { status: nextStatus });
      setMyTasks(
        myTasks.map((t) =>
          t.id === taskId ? { ...t, status: nextStatus, completedAt: nextStatus === 'DONE' ? new Date() : null } : t
        )
      );
    } catch (err: any) {
      console.error('Task update failed', err);
    }
  }

  function copyUsername() {
    if (user?.username) {
      navigator.clipboard.writeText(user.username);
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    }
  }

  const filteredCrew = crew.filter((item) => {
    const name = item.user?.displayName || item.user?.username || '';
    return name.toLowerCase().includes(friendsSearch.toLowerCase());
  });

  const tasksByBand = bands.map((b) => {
    const bandTasks = myTasks.filter((t) => t.bandId === b.id || t.band?.id === b.id);
    return {
      band: b,
      tasks: bandTasks,
    };
  });

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#000000] select-none">
      {/* ─── SECTION 2: 1:1 ACTIVE CHAT MENU (Resizable) ────────────────────── */}
      <div
        style={{ width: `${dmWidth}px` }}
        className="bg-[#080808] border-r border-[#1a1a1a] flex flex-col shrink-0 overflow-hidden"
      >
        {/* Top Search Bar */}
        <div className="h-12 border-b border-[#1a1a1a] px-3 flex items-center shrink-0">
          <div className="w-full h-8 rounded-md bg-[#121212] border border-[#222222] px-2.5 flex items-center space-x-2 text-neutral-400 text-xs">
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
            <span className="truncate">Search conversations...</span>
          </div>
        </div>

        {/* Navigation & Direct Messages List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Crewmates Button */}
          <button
            onClick={() => {
              setSelectedDmUser(null);
              setFriendsTab('all');
            }}
            className={`w-full px-3 py-2 rounded-lg flex items-center space-x-3 text-sm font-semibold transition-all ${
              selectedDmUser === null
                ? 'bg-[#1a1a1a] text-white border border-[#2e2e2e]'
                : 'text-neutral-400 hover:text-white hover:bg-[#121212]'
            }`}
          >
            <Users className="w-4 h-4 text-zinc-300 shrink-0" />
            <span>Crewmates</span>
          </button>

          {/* Direct Messages Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              <span>Direct Messages</span>
              <button
                onClick={() => {
                  setSelectedDmUser(null);
                  setFriendsTab('add_friend');
                }}
                className="hover:text-white p-0.5 transition-colors"
                title="+ Add Crewmates"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {crew.map((item) => {
              const peer = item.user;
              const isSelected = selectedDmUser?.id === peer.id;
              return (
                <button
                  key={peer.id}
                  onClick={() => setSelectedDmUser(peer)}
                  className={`w-full px-2.5 py-2 rounded-lg flex items-center space-x-2.5 text-sm transition-all group ${
                    isSelected
                      ? 'bg-[#1c1c1c] text-white border border-[#2e2e2e]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#121212]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={peer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`}
                      alt={peer.displayName}
                      className="w-8 h-8 rounded-full border border-[#2a2a2a]"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#080808]" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-sm truncate leading-tight">{peer.displayName}</p>
                    <p className="text-xs text-neutral-500 truncate">@{peer.username}</p>
                  </div>
                </button>
              );
            })}

            {crew.length === 0 && (
              <p className="text-xs text-neutral-500 text-center py-4 italic">No direct messages yet</p>
            )}
          </div>
        </div>

        {/* User Info Card at bottom */}
        {user && (
          <div className="h-14 bg-[#050505] border-t border-[#1a1a1a] px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full border border-[#2a2a2a]"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#050505]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                <button
                  onClick={copyUsername}
                  className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center space-x-1"
                  title="Click to copy username"
                >
                  <span className="truncate">@{user.username}</span>
                  {copiedUsername && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DRAG RESIZER: Between DM Menu and Main Center */}
      <div
        onMouseDown={handleMouseDownDm}
        className="w-1 hover:w-1.5 bg-transparent hover:bg-neutral-600 active:bg-neutral-500 cursor-col-resize transition-all shrink-0 z-10"
      />

      {/* ─── SECTION 3: MAIN CREW/FRIENDS VIEW OR ACTIVE 1:1 CHAT (Center) ───── */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-[#000000] overflow-hidden">
        {selectedDmUser ? (
          /* ACTIVE 1:1 DIRECT MESSAGE THREAD */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Bar */}
            <div className="h-12 border-b border-[#1a1a1a] px-5 flex items-center justify-between bg-[#080808] shrink-0">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={
                      selectedDmUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedDmUser.username}`
                    }
                    alt={selectedDmUser.displayName}
                    className="w-7 h-7 rounded-full border border-[#2a2a2a]"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#080808]" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white">{selectedDmUser.displayName}</span>
                  <span className="text-xs text-neutral-400 ml-2">@{selectedDmUser.username}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="pt-6 pb-4 border-b border-[#1a1a1a]">
                <div className="w-14 h-14 rounded-full bg-[#141414] border border-[#242424] flex items-center justify-center text-white mb-2.5">
                  <img
                    src={
                      selectedDmUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedDmUser.username}`
                    }
                    alt={selectedDmUser.displayName}
                    className="w-14 h-14 rounded-full"
                  />
                </div>
                <h3 className="text-lg font-bold text-white">{selectedDmUser.displayName}</h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  Beginning of your direct message conversation with @{selectedDmUser.username}.
                </p>
              </div>

              {dmMessages.map((msg) => {
                const isMe = msg.authorId === user?.id || msg.senderId === user?.id;
                return (
                  <div key={msg.id} className="flex items-start space-x-3 select-text">
                    <img
                      src={
                        msg.author?.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.author?.username || 'user'}`
                      }
                      alt={msg.author?.displayName || 'User'}
                      className="w-8 h-8 rounded-full shrink-0 border border-[#2a2a2a] mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">
                          {msg.author?.displayName || (isMe ? user?.displayName : selectedDmUser.displayName)}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-200 mt-1 leading-relaxed bg-[#0d0d0d] p-3 rounded-lg border border-[#1f1f1f] inline-block max-w-xl">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })}

              {dmMessages.length === 0 && (
                <p className="text-sm text-neutral-500 italic text-center py-6">
                  No messages yet. Send a message to start planning together!
                </p>
              )}
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendDm} className="p-4 bg-[#080808] border-t border-[#1a1a1a] shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message @${selectedDmUser.displayName}...`}
                  className="w-full bg-[#121212] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 pr-12"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSending}
                  className="absolute right-2 p-1.5 rounded-lg bg-neutral-200 hover:bg-white text-black disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* MAIN CREW / FRIENDS LIST */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Friends Top Bar */}
            <div className="h-12 border-b border-[#1a1a1a] px-5 flex items-center justify-between bg-[#080808] shrink-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Users className="w-4 h-4 text-zinc-300" />
                  <span>Crewmates</span>
                </div>

                <div className="h-4 w-[1px] bg-[#222222]" />

                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  <button
                    onClick={() => setFriendsTab('online')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      friendsTab === 'online'
                        ? 'bg-[#a7f3d0]/10 text-[#a7f3d0] border border-[#a7f3d0]/40'
                        : 'text-neutral-400 hover:text-[#a7f3d0] hover:bg-[#a7f3d0]/5'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => setFriendsTab('all')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      friendsTab === 'all'
                        ? 'bg-[#bfdbfe]/10 text-[#bfdbfe] border border-[#bfdbfe]/40'
                        : 'text-neutral-400 hover:text-[#bfdbfe] hover:bg-[#bfdbfe]/5'
                    }`}
                  >
                    All ({crew.length})
                  </button>
                  <button
                    onClick={() => setFriendsTab('add_friend')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      friendsTab === 'add_friend'
                        ? 'bg-[#ddd6fe]/15 text-[#ddd6fe] border border-[#ddd6fe]/50'
                        : 'bg-[#ddd6fe]/10 text-[#ddd6fe] border border-[#ddd6fe]/30 hover:bg-[#ddd6fe]/20'
                    }`}
                  >
                    + Add Crewmates
                  </button>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {friendsTab === 'add_friend' ? (
                <div className="max-w-md space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add Crewmates</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Connect with other developers in WEday to direct message, collaborate on PRDs, and co-design architecture.
                  </p>

                  <form onSubmit={handleAddFriendSubmit} className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={addFriendInput}
                        onChange={(e) => setAddFriendInput(e.target.value)}
                        placeholder="Enter WEday username..."
                        className="w-full bg-[#121212] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                        required
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                      >
                        + Add Crewmates
                      </button>
                    </div>
                  </form>

                  {addFriendMsg && (
                    <div className="p-3 rounded-lg bg-[#141414] border border-[#2c2c2c] text-xs text-neutral-200">
                      {addFriendMsg}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search input */}
                  <div className="relative max-w-lg">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={friendsSearch}
                      onChange={(e) => setFriendsSearch(e.target.value)}
                      placeholder="Filter crewmates..."
                      className="w-full bg-[#121212] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                      Connected Crewmates ({filteredCrew.length})
                    </span>

                    {filteredCrew.map((item) => {
                      const peer = item.user;
                      return (
                        <div
                          key={peer.id}
                          className="p-3.5 rounded-xl bg-[#0d0d0d] border border-[#1f1f1f] hover:border-[#333333] flex items-center justify-between transition-all"
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="relative">
                              <img
                                src={peer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`}
                                alt={peer.displayName}
                                className="w-10 h-10 rounded-full border border-[#2a2a2a]"
                              />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0d0d0d]" />
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-bold text-white">{peer.displayName}</h4>
                                <span className="text-xs text-neutral-500 font-mono">@{peer.username}</span>
                              </div>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                Active Planning Collaborator
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedDmUser(peer)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#282828] text-white text-xs font-semibold flex items-center space-x-1.5 border border-[#2a2a2a] transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
                              <span>Message</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredCrew.length === 0 && (
                      <div className="p-8 text-center text-neutral-500 border border-dashed border-[#222222] rounded-xl">
                        <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                        <p className="text-sm">No crewmates found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DRAG RESIZER: Between Main Center and Tasks Panel */}
      <div
        onMouseDown={handleMouseDownTasks}
        className="w-1 hover:w-1.5 bg-transparent hover:bg-neutral-600 active:bg-neutral-500 cursor-col-resize transition-all shrink-0 z-10"
      />

      {/* ─── SECTION 4: RIGHTMOST TASKS & REMINDERS PANEL (Resizable) ────────── */}
      <div
        style={{ width: `${tasksWidth}px` }}
        className="bg-[#080808] border-l border-[#1a1a1a] flex flex-col shrink-0 overflow-hidden"
      >
        {/* Header */}
        <div className="h-12 border-b border-[#1a1a1a] px-4 flex items-center justify-between bg-[#080808] shrink-0">
          <span className="text-sm font-bold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Tasks & Reminders</span>
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#161616] text-neutral-300 border border-[#262626]">
            {myTasks.length} Active
          </span>
        </div>

        {/* Tasks grouped by Band */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-5">
          {tasksByBand.map(({ band, tasks }) => (
            <div key={band.id} className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#1c1c1c]">
                <button
                  onClick={() => {
                    setActiveBand(band);
                    setIsHomeView(false);
                  }}
                  className="flex items-center space-x-1.5 text-sm font-bold text-neutral-200 hover:text-white group transition-colors"
                >
                  <span>{band.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-transform" />
                </button>
                <span className="text-xs font-mono text-neutral-500">
                  {tasks.filter((t) => t.status === 'DONE').length}/{tasks.length} done
                </span>
              </div>

              <div className="space-y-1.5">
                {tasks.map((task) => {
                  const isDone = task.status === 'DONE';
                  return (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-lg bg-[#0e0e0e] border border-[#1f1f1f] flex items-start justify-between space-x-2 text-xs hover:border-[#333333] transition-colors"
                    >
                      <div className="flex items-start space-x-2 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isDone
                              ? 'bg-neutral-200 border-white text-black'
                              : 'border-neutral-600 hover:border-neutral-400'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3" />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium leading-snug truncate ${
                              isDone ? 'line-through text-neutral-500' : 'text-neutral-200'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span
                              className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                                task.priority === 'HIGH' || task.priority === 'CRITICAL'
                                  ? 'bg-rose-950/70 text-rose-300 border border-rose-800/40'
                                  : 'bg-[#1a1a1a] text-neutral-300'
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.milestone && (
                              <span className="text-xs text-neutral-400 truncate">
                                🎯 {task.milestone.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {tasks.length === 0 && (
                  <p className="text-xs text-neutral-500 italic px-2 py-1">No tasks for this band</p>
                )}
              </div>
            </div>
          ))}

          {bands.length === 0 && (
            <div className="p-6 text-center text-neutral-500">
              <CheckCircle2 className="w-6 h-6 text-neutral-600 mx-auto mb-1" />
              <p className="text-sm">No bands joined yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
