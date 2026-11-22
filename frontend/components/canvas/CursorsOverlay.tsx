'use client';

import { useEffect, useState } from 'react';
import { useViewport } from '@xyflow/react';
import { getSocket } from '../../lib/socket';
import { useCanvasStore } from '../../lib/canvas-store';
import { useWorkspaceStore } from '../../lib/store';
import type { CursorInfo } from '../../lib/canvas-types';

interface LiveCursor extends CursorInfo {
  /** Last-update timestamp — cursors go stale when the owner leaves. */
  at: number;
}

/** Cursors not updated within this window are hidden (owner left the page/band). */
const STALE_MS = 5000;

/**
 * Live cursors of the other crew members on the canvas.
 *
 * Each cursor is a prominent arrow in the member's band-scoped signature
 * color with their name and profile picture, matching the Figma-style
 * collaboration pattern. Positions arrive over the `canvas:cursor` socket
 * event in flow coordinates and are projected to screen space via the
 * current viewport, so cursors stay correct while panning and zooming.
 */
export default function CursorsOverlay({
  bandId,
  activePageId,
}: {
  bandId: string;
  activePageId: string | null;
}) {
  const viewport = useViewport();
  const presence = useCanvasStore((s) => s.presence);
  const user = useWorkspaceStore((s) => s.user);
  const [cursors, setCursors] = useState<Record<string, LiveCursor>>({});

  useEffect(() => {
    const socket = getSocket();

    const onCursor = (data: CursorInfo) => {
      if (data.bandId !== bandId) return;
      if (data.userId === user?.id) return; // my own pointer is the OS cursor
      if (data.x == null || data.y == null) {
        setCursors((prev) => {
          if (!prev[data.userId]) return prev;
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
        return;
      }
      setCursors((prev) => ({ ...prev, [data.userId]: { ...data, at: Date.now() } }));
    };

    socket.on('canvas:cursor', onCursor);

    // Prune stale cursors (owner stopped sending — left the page or band).
    const prune = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const keys = Object.keys(prev);
        if (keys.every((k) => now - prev[k].at < STALE_MS)) return prev;
        const next: Record<string, LiveCursor> = {};
        for (const k of keys) {
          if (now - prev[k].at < STALE_MS) next[k] = prev[k];
        }
        return next;
      });
    }, 1000);

    return () => {
      socket.off('canvas:cursor', onCursor);
      clearInterval(prune);
    };
  }, [bandId, user?.id]);

  // Only render cursors that belong to this band, whose owner is still
  // connected, and who is on the same page. Band switches are handled here —
  // cursors of other bands simply never show.
  const presenceIds = new Set(presence.map((p) => p.userId));
  const visible = Object.values(cursors).filter(
    (c) => c.bandId === bandId && c.pageId === activePageId && presenceIds.has(c.userId),
  );

  if (visible.length === 0) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      {visible.map((c) => {
        const left = (c.x as number) * viewport.zoom + viewport.x;
        const top = (c.y as number) * viewport.zoom + viewport.y;
        return (
          <div
            key={c.userId}
            className="absolute"
            style={{ left, top, transition: 'left 80ms linear, top 80ms linear' }}
          >
            <svg width="20" height="22" viewBox="0 0 20 22" className="drop-shadow-md">
              <path
                d="M4 2 L4 18 L8 14 L10.8 20 L13.8 18.6 L11 12.6 L16.5 12 Z"
                fill={c.color}
                stroke="white"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 mt-0.5 shadow-md border border-white/30"
              style={{ backgroundColor: c.color }}
            >
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover bg-white/20"
                />
              ) : (
                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="text-[10px] font-semibold text-white leading-none whitespace-nowrap">
                {c.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
