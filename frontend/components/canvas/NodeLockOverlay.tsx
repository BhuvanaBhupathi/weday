'use client';

import { Fragment, useMemo } from 'react';
import { useViewport, type Node } from '@xyflow/react';
import type { NodeLockInfo } from '../../lib/canvas-types';

/**
 * Visual for the soft node-edit lock: a ring in the editor's signature color
 * around the locked node, plus a "… is editing" badge with their profile pic.
 * Purely presentational — pointer blocking is applied on the node itself.
 */
export default function NodeLockOverlay({
  nodes,
  locks,
  myUserId,
}: {
  nodes: Node[];
  locks: NodeLockInfo[];
  myUserId: string | null | undefined;
}) {
  const viewport = useViewport();

  const items = useMemo(() => {
    if (locks.length === 0) return [];
    const lockByNode = new Map(locks.map((l) => [l.nodeId, l]));
    return nodes
      .filter((n) => lockByNode.has(n.id))
      .map((n) => {
        const lock = lockByNode.get(n.id)!;
        const w = (n.width || n.measured?.width || 280) * viewport.zoom;
        const h = (n.height || n.measured?.height || 160) * viewport.zoom;
        return {
          id: n.id,
          lock,
          left: n.position.x * viewport.zoom + viewport.x,
          top: n.position.y * viewport.zoom + viewport.y,
          width: w,
          height: h,
        };
      });
  }, [nodes, locks, viewport]);

  if (items.length === 0) return null;

  return (
    <div className="absolute inset-0 z-[15] pointer-events-none overflow-hidden">
      {items.map(({ id, lock, left, top, width, height }) => {
        const mine = lock.userId === myUserId;
        return (
          <Fragment key={id}>
            {/* Ring around the locked node */}
            <div
              className="absolute rounded-lg"
              style={{
                left: left - 3,
                top: top - 3,
                width: width + 6,
                height: height + 6,
                border: `2px solid ${lock.color}`,
                boxShadow: `0 0 12px ${lock.color}55`,
              }}
            />
            {/* "Who is editing" badge, top-right corner of the node */}
            <div
              className="absolute flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 shadow-md border border-white/30"
              style={{
                left: left + width,
                top: top - 14,
                transform: 'translateX(-100%)',
                backgroundColor: lock.color,
              }}
            >
              {lock.avatarUrl ? (
                <img
                  src={lock.avatarUrl}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover bg-white/20"
                />
              ) : (
                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                  {lock.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="text-[10px] font-semibold text-white leading-none whitespace-nowrap">
                {mine ? 'Editing' : `${lock.name.split(' ')[0]} is editing`}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
