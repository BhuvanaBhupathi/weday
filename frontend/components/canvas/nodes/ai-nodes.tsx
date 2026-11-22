'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Sparkles, FileText, Plus, X, Loader2, AlertTriangle } from 'lucide-react';
import { useCanvasNodeActions } from './node-context';

interface ShellProps {
  selected: boolean;
  accent?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function Card({ selected, accent = 'border-violet-400/70', children, style }: ShellProps) {
  return (
    <div
      className={`rounded-lg border bg-[#101010] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors ${
        selected ? accent : 'border-[#2a2a2a]'
      }`}
      style={{ width: 'var(--node-width, 320px)', ...style }}
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

// ─── GEMINI QUESTION ─────────────────────────────────────────────────────────

export const GeminiCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData, askGeminiForNode } = useCanvasNodeActions();
  const question = (data.question as string) || '';
  const answer = (data.answer as string) || '';
  const status = (data.status as string) || 'idle'; // idle | loading | error

  return (
    <Card selected={selected} accent="border-violet-400/80" style={{ minHeight: data._minHeight as number | undefined }}>
      <Handles />
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-300 shrink-0" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">Ask Gemini</span>
      </div>
      <div className="px-3 pb-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Question</div>
        <textarea
          value={question}
          onChange={(e) => updateNodeData(id, { question: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="How should authentication work for this product?"
          rows={3}
          className="w-full resize-none bg-[#161616] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-400/50 placeholder:text-zinc-600"
        />
        <button
          disabled={status === 'loading' || !question.trim()}
          onClick={() => askGeminiForNode(id, question.trim())}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-40 text-violet-200 text-xs font-semibold border border-violet-500/30 transition-colors"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> {answer ? 'Ask again' : 'Ask Gemini'}
            </>
          )}
        </button>
        {status === 'error' && (
          <div className="flex items-start gap-1.5 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md px-2 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{(data.error as string) || 'AI is unavailable right now.'}</span>
          </div>
        )}
        {answer && (
          <>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono pt-1">Answer</div>
            <div className="bg-[#161616] border border-[#262626] rounded-md px-2.5 py-2 text-xs text-zinc-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
              {answer}
            </div>
          </>
        )}
      </div>
    </Card>
  );
});
GeminiCanvasNode.displayName = 'GeminiCanvasNode';

// ─── PRD ─────────────────────────────────────────────────────────────────────

interface PrdSection {
  id: string;
  title: string;
  items: string[];
}

export const PrdCanvasNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData, generatePrdForNode } = useCanvasNodeActions();
  const description = (data.description as string) || '';
  const sections: PrdSection[] = Array.isArray(data.sections) ? (data.sections as PrdSection[]) : [];
  const status = (data.status as string) || 'idle'; // idle | loading | error
  const [newItemSection, setNewItemSection] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  function patchSections(next: PrdSection[]) {
    updateNodeData(id, { sections: next });
  }

  function addItemTo(sectionId: string) {
    if (!newItemText.trim()) return;
    patchSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, newItemText.trim()] } : s,
      ),
    );
    setNewItemText('');
    setNewItemSection(null);
  }

  return (
    <Card selected={selected} accent="border-sky-400/70" style={{ minHeight: data._minHeight as number | undefined }}>
      <Handles />
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-sky-300 shrink-0" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">PRD</span>
      </div>
      <div className="px-3 pb-3 space-y-2.5">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">
            Product description
          </div>
          <textarea
            value={description}
            onChange={(e) => updateNodeData(id, { description: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Describe the product or problem this PRD covers…"
            rows={2}
            className="w-full resize-none bg-[#161616] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-sky-400/50 placeholder:text-zinc-600"
          />
        </div>
        <button
          disabled={status === 'loading' || !description.trim()}
          onClick={() => generatePrdForNode(id, description.trim())}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 text-sky-200 text-xs font-semibold border border-sky-500/30 transition-colors"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> {sections.length ? 'Regenerate PRD' : 'Generate PRD'}
            </>
          )}
        </button>
        {status === 'error' && (
          <div className="flex items-start gap-1.5 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md px-2 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{(data.error as string) || 'PRD generation failed.'}</span>
          </div>
        )}
        {sections.map((section) => (
          <div key={section.id} className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-sky-300 text-xs">§</span>
              <input
                value={section.title}
                onChange={(e) =>
                  patchSections(
                    sections.map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)),
                  )
                }
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-zinc-100 outline-none"
              />
              <button
                onClick={() => patchSections(sections.filter((s) => s.id !== section.id))}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-zinc-600 hover:text-rose-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <ul className="space-y-0.5 pl-4">
              {section.items.map((item, idx) => (
                <li key={idx} className="group flex items-start gap-1.5 text-[11px] text-zinc-300">
                  <span className="text-zinc-600 mt-0.5 shrink-0">•</span>
                  <span className="flex-1">{item}</span>
                  <button
                    onClick={() =>
                      patchSections(
                        sections.map((s) =>
                          s.id === section.id
                            ? { ...s, items: s.items.filter((_, i) => i !== idx) }
                            : s,
                        ),
                      )
                    }
                    onPointerDown={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
            {newItemSection === section.id ? (
              <div className="flex items-center gap-1 pl-4">
                <input
                  autoFocus
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addItemTo(section.id);
                    if (e.key === 'Escape') setNewItemSection(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="New bullet…"
                  className="flex-1 min-w-0 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600"
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setNewItemSection(section.id);
                  setNewItemText('');
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1 pl-4 text-[10px] text-zinc-600 hover:text-zinc-300"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
        ))}
        {sections.length > 0 && (
          <div className="text-[9px] font-mono text-zinc-600">
            Advisory planning content — nothing is applied automatically
          </div>
        )}
      </div>
    </Card>
  );
});
PrdCanvasNode.displayName = 'PrdCanvasNode';
