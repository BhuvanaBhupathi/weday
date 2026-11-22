'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWorkspaceStore } from './store';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export interface LiveEventToast {
  id: string;
  type: 'requirement' | 'decision' | 'task' | 'milestone' | 'change_request' | 'general';
  title: string;
  description: string;
  timestamp: Date;
}

export function useRealtimeCollaboration() {
  const { activeBand, user } = useWorkspaceStore();
  const [isConnected, setIsConnected] = useState(false);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [toasts, setToasts] = useState<LiveEventToast[]>([]);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
      if (activeBand) {
        socket.emit('join:band', { bandId: activeBand.id });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      onConnect();
    }

    function addToast(type: LiveEventToast['type'], title: string, description: string) {
      const toast: LiveEventToast = {
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        title,
        description,
        timestamp: new Date(),
      };
      setToasts((prev) => [toast, ...prev.slice(0, 4)]);
      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    }

    // Event listeners
    socket.on('requirement:created', (data: any) => {
      addToast('requirement', `Requirement Created: ${data.identifier || 'New'}`, data.title || '');
    });

    socket.on('requirement:updated', (data: any) => {
      addToast('requirement', `Requirement Updated: ${data.identifier || ''}`, data.title || 'Requirement modified');
    });

    socket.on('task:created', (data: any) => {
      addToast('task', 'Task Created', data.title || '');
    });

    socket.on('task:updated', (data: any) => {
      addToast('task', `Task Updated (${data.status})`, data.title || '');
    });

    socket.on('milestone:created', (data: any) => {
      addToast('milestone', 'Milestone Created', data.title || '');
    });

    socket.on('decision:created', (data: any) => {
      addToast('decision', `Decision Recorded: ${data.identifier || ''}`, data.title || '');
    });

    socket.on('change_request:created', (data: any) => {
      addToast('change_request', `Change Request: ${data.identifier || ''}`, data.title || '');
    });

    socket.on('change_request:updated', (data: any) => {
      addToast('change_request', `Change Request ${data.status}`, `[${data.identifier}] ${data.title}`);
    });

    socket.on('publication:published', (data: any) => {
      addToast('general', `Snapshot v${data.versionNumber}.0 Published`, data.title || '');
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('requirement:created');
      socket.off('requirement:updated');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('milestone:created');
      socket.off('decision:created');
      socket.off('change_request:created');
      socket.off('change_request:updated');
      socket.off('publication:published');
    };
  }, [activeBand]);

  // Join the active band's room (and leave the previous one on switch) so
  // presence, cursors and canvas sync only target the current Band.
  const prevBandIdRef = useRef<string | null>(null);
  useEffect(() => {
    const socket = getSocket();
    const next = activeBand?.id ?? null;
    const prev = prevBandIdRef.current;
    if (socket.connected) {
      if (prev && prev !== next) socket.emit('leave:band', { bandId: prev });
      if (next) socket.emit('join:band', { bandId: next });
    }
    prevBandIdRef.current = next;
  }, [activeBand]);

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return {
    isConnected,
    toasts,
    dismissToast,
  };
}
