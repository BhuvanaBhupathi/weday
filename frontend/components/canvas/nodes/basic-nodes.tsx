'use client';

import React, { memo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Type as TypeIcon,
  CheckSquare,
  Square,
  SquareCheckBig,
  Plus,
  X,
  ImageIcon,
  Upload,
  LayoutPanelLeft,
  Workflow,
  Box,
  Trash2,
} from 'lucide-react';
import { useCanvasNodeActions, renderSimpleText } from './node-context';

// ─── Shared shell ────────────────────────────────────────────────────────────

interface ShellProps {
  selected: boolean;
  accent?: string; // border color class when selected
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function Card({ selected, accent = 'border-violet-400/70', children, style }: ShellProps) {
  return (
    <div
      className={`rounded-lg border bg-[#101010] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors ${
        selected ? accent : 'border-[#2a2a2a]'
      }`}
      style={{ width: 'var(--node-width, 280px)', ...style }}
    >
      {children}
    </div>
  );
}

function Handles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-[#3a3a3a] !border-2 !border-[#101010] opacity-0 hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !min-w-0 !min-h-0 !bg-[#3a3a3a] !border-2 !border-[#101010] opacity-0 hover:opacity-100 transition-opacity"
      />
    </>
  );
}

function NodeHeader({
  icon,
  label,
  title,
  onTitleChange,
  accentText = 'text-zinc-400',
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  onTitleChange: (v: string) => void;
  accentText?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
      <span className={`shrink-0 ${accentText}`}>{icon}</span>
      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 shrink-0">
        {label}
      </span>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="Untitled"
        className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-zinc-100 outline-none placeholder:text-zinc-600"
      />
    </div>
  );
}

// ─── TEXT ────────────────────────────────────────────────────────────────────

export const TextCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useCanvasNodeActions();
  const [editing, setEditing] = useState(false);
  const body = (data.body as string) || '';

  return (
    <Card selected={selected} accent="border-violet-400/70" style={{ minHeight: data._minHeight as number | undefined }}>
      <Handles />
      <NodeHeader
        icon={<TypeIcon className="w-3.5 h-3.5" />}
        label="Text"
        title={(data.title as string) || ''}
        onTitleChange={(v) => updateNodeData(id, { title: v })}
      />
      <div className="px-3 pb-3 text-xs leading-relaxed text-zinc-300 min-h-[28px]">
        {editing || !body ? (
          <textarea
            autoFocus={!body ? false : true}
            value={body}
            onChange={(e) => updateNodeData(id, { body: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder={'Type text…\n- bullets with "- "\n**bold** supported'}
            rows={Math.max(3, body.split('\n').length)}
            className="w-full resize-none bg-transparent outline-none placeholder:text-zinc-600 text-xs leading-relaxed text-zinc-300"
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="cursor-text hover:bg-white/[0.02] rounded p-1 -m-1"
            title="Click to edit"
          >
            {renderSimpleText(body)}
          </div>
        )}
      </div>
    </Card>
  );
});
TextCanvasNode.displayName = 'TextCanvasNode';

// ─── CHECKLIST ───────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export const ChecklistCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useCanvasNodeActions();
  const [newItem, setNewItem] = useState('');
  const items: ChecklistItem[] = Array.isArray(data.items) ? (data.items as ChecklistItem[]) : [];
  const done = items.filter((i) => i.done).length;

  function patchItems(next: ChecklistItem[]) {
    updateNodeData(id, { items: next });
  }

  function addItem() {
    if (!newItem.trim()) return;
    patchItems([
      ...items,
      { id: `ci_${Date.now().toString(36)}`, text: newItem.trim(), done: false },
    ]);
    setNewItem('');
  }

  return (
    <Card selected={selected} accent="border-amber-400/70" style={{ minHeight: data._minHeight as number | undefined }}>
      <Handles />
      <NodeHeader
        icon={<CheckSquare className="w-3.5 h-3.5" />}
        label="Checklist"
        title={(data.title as string) || ''}
        onTitleChange={(v) => updateNodeData(id, { title: v })}
        accentText="text-amber-300"
      />
      <div className="px-3 pb-3 space-y-0.5">
        {items.length > 0 && (
          <div className="h-1 rounded-full bg-[#1e1e1e] mb-2 overflow-hidden">
            <div
              className="h-full bg-amber-400/80 transition-all"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2 py-0.5">
            <button
              onClick={() =>
                patchItems(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
              }
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              {item.done ? (
                <SquareCheckBig className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Square className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />
              )}
            </button>
            <span
              className={`flex-1 text-xs ${
                item.done ? 'text-zinc-500 line-through' : 'text-zinc-200'
              }`}
            >
              {item.text}
            </span>
            <button
              onClick={() => patchItems(items.filter((i) => i.id !== item.id))}
              onPointerDown={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1.5 pt-1">
          <Plus className="w-3 h-3 text-zinc-600" />
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addItem();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Add task…"
            className="flex-1 min-w-0 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
        {items.length > 0 && (
          <div className="text-[10px] font-mono text-zinc-600 pt-1">
            {done}/{items.length} done
          </div>
        )}
      </div>
    </Card>
  );
});
ChecklistCanvasNode.displayName = 'ChecklistCanvasNode';

// ─── IMAGE ──────────────────────────────────────────────────────────────────

export const ImageCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const { uploadImageToNode } = useCanvasNodeActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const src = data.src as string | undefined;
  const caption = (data.caption as string) || '';

  return (
    <Card selected={selected} style={{ minHeight: data._minHeight as number | undefined }}>
      <Handles />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImageToNode(id, file);
          e.target.value = '';
        }}
      />
      {src ? (
        <>
          <img src={src} alt={caption || 'Canvas media'} className="rounded-t-lg max-h-72 w-full object-cover" />
          {caption && (
            <div className="px-3 py-1.5 text-[11px] text-zinc-400 border-t border-[#1e1e1e]">{caption}</div>
          )}
        </>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full h-40 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 border-b border-[#1e1e1e]"
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs">Upload image or screenshot</span>
        </button>
      )}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
          <ImageIcon className="w-3 h-3" /> Media
        </span>
        {src && (
          <button
            onClick={() => inputRef.current?.click()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1"
            title="Replace image"
          >
            <Trash2 className="w-3 h-3" /> Replace
          </button>
        )}
      </div>
    </Card>
  );
});
ImageCanvasNode.displayName = 'ImageCanvasNode';

// ─── PAGE LINK ───────────────────────────────────────────────────────────────

export const PageLinkCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const { openPage } = useCanvasNodeActions();
  const { updateNodeData } = useCanvasNodeActions();
  const targetPageId = data.targetPageId as string | undefined;
  const targetName = (data.targetPageName as string) || 'Untitled page';

  return (
    <Card selected={selected} accent="border-emerald-400/70">
      <Handles />
      <div
        className="cursor-pointer px-3 py-2.5 flex items-center gap-3 hover:bg-white/[0.02] rounded-lg"
        onClick={() => targetPageId && openPage(targetPageId)}
        onPointerDown={(e) => e.stopPropagation()}
        title="Open this page"
      >
        <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
          <LayoutPanelLeft className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={targetName}
            onChange={(e) => updateNodeData(id, { targetPageName: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-[13px] font-semibold text-zinc-100 outline-none"
          />
          <div className="text-[11px] text-emerald-300/90 font-mono">Open page →</div>
        </div>
      </div>
    </Card>
  );
});
PageLinkCanvasNode.displayName = 'PageLinkCanvasNode';

// ─── FLOW (flowchart step) ───────────────────────────────────────────────────

export const FlowCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useCanvasNodeActions();
  const shape = (data.shape as string) || 'process';
  const shapes: Record<string, { label: string; cls: string }> = {
    start: { label: 'Start', cls: 'border-emerald-400/50 bg-emerald-500/5 text-emerald-200' },
    end: { label: 'End', cls: 'border-rose-400/50 bg-rose-500/5 text-rose-200' },
    decision: { label: 'Decision', cls: 'border-amber-400/50 bg-amber-500/5 text-amber-200' },
    process: { label: 'Step', cls: 'border-sky-400/50 bg-sky-500/5 text-sky-200' },
  };
  const s = shapes[shape] || shapes.process;

  return (
    <Card selected={selected} accent="border-sky-400/70" style={{ width: 'var(--node-width, 220px)' }}>
      <Handles />
      <div className={`rounded-lg border px-3 py-2 ${s.cls}`}>
        <div className="text-[9px] font-mono uppercase tracking-wider opacity-70 mb-0.5">{s.label}</div>
        <input
          value={(data.title as string) || ''}
          onChange={(e) => updateNodeData(id, { title: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={s.label === 'Decision' ? 'Condition?' : 'Step'}
          className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none placeholder:text-zinc-500"
        />
      </div>
    </Card>
  );
});
FlowCanvasNode.displayName = 'FlowCanvasNode';

// ─── ARCHITECTURE (generated component) ──────────────────────────────────────

export const ArchitectureCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const technology = (data.technology as string) || '';
  const description = (data.description as string) || '';
  return (
    <Card selected={selected} accent="border-violet-400/70" style={{ minHeight: data._minHeight as number | undefined }}>
      <Handles />
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Box className="w-3.5 h-3.5 text-violet-300 shrink-0" />
          <input
            value={(data.title as string) || ''}
            readOnly
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-zinc-100 outline-none"
          />
        </div>
        {technology && (
          <div className="text-[10px] font-mono text-violet-300/90 bg-violet-500/10 border border-violet-500/20 rounded px-1.5 py-0.5 inline-block max-w-full truncate">
            {technology}
          </div>
        )}
        {description && <div className="text-[11px] text-zinc-400 leading-relaxed">{description}</div>}
        {data.source ? (
          <div className="text-[9px] font-mono text-zinc-600 pt-0.5">
            Generated from {String((data.source as any)?.type || 'PRD')}
          </div>
        ) : null}
      </div>
    </Card>
  );
});
ArchitectureCanvasNode.displayName = 'ArchitectureCanvasNode';

// ─── Workflow icon placeholder used by toolbar ───────────────────────────────
export { Workflow as FlowchartIcon };
