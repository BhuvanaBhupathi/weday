'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Box,
  Workflow,
  Type as TypeIcon,
  CheckSquare,
  ImageUp,
  ChevronDown,
} from 'lucide-react';
import type { CanvasNodeType } from '../../lib/canvas-types';
import { FLOW_TEMPLATES } from './flowchart-templates';

const MIME = 'application/friday-canvas';

export function setDragPayload(e: React.DragEvent, payload: Record<string, any>) {
  e.dataTransfer.setData(MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'copy';
}

export function getDragPayload(e: React.DragEvent): Record<string, any> | null {
  try {
    const raw = e.dataTransfer.getData(MIME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface ToolbarItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  active?: boolean;
  accent?: string;
}

function ToolbarItem({ icon, label, onClick, onDragStart, active, accent }: ToolbarItemProps) {
  return (
    <button
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      title={label}
      className={`group relative flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-all cursor-grab active:cursor-grabbing ${
        active
          ? 'bg-[#1e1e1e] text-white'
          : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
      }`}
    >
      <span className={`shrink-0 ${accent || ''}`}>{icon}</span>
      <span className="hidden sm:inline whitespace-nowrap">{label}</span>
      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#1c1c1c] border border-[#2c2c2c] text-[10px] text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {label}
      </span>
    </button>
  );
}

interface CanvasToolbarProps {
  onCreateAtCenter: (type: CanvasNodeType) => void;
  onGenerateArchitecture: () => void;
  onPlaceTemplate: (templateId: string) => void;
}

export default function CanvasToolbar({
  onCreateAtCenter,
  onGenerateArchitecture,
  onPlaceTemplate,
}: CanvasToolbarProps) {
  const [flowMenuOpen, setFlowMenuOpen] = useState(false);

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 select-none">
      {flowMenuOpen && (
        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-64 rounded-xl bg-[#101010] border border-[#2c2c2c] shadow-2xl overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-[#1e1e1e] text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Flowchart templates
          </div>
          {FLOW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              draggable
              onDragStart={(e) => setDragPayload(e, { kind: 'template', id: tpl.id })}
              onClick={() => {
                onPlaceTemplate(tpl.id);
                setFlowMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#181818] transition-colors cursor-grab active:cursor-grabbing"
              title={`${tpl.description} — click to place at center, or drag onto the canvas`}
            >
              <div className="text-xs font-semibold text-zinc-100">{tpl.name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{tpl.description}</div>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-0.5 rounded-xl bg-[#0c0c0c]/95 backdrop-blur-md border border-[#262626] shadow-2xl px-1.5 py-1">
        <ToolbarItem
          icon={<Sparkles className="w-4 h-4 text-violet-300" />}
          label="Ask Gemini"
          onClick={() => onCreateAtCenter('GEMINI')}
          onDragStart={(e) => setDragPayload(e, { kind: 'node', type: 'GEMINI' })}
        />
        <div className="w-px h-5 bg-[#222222] mx-0.5" />
        <ToolbarItem
          icon={<FileText className="w-4 h-4 text-sky-300" />}
          label="PRD"
          onClick={() => onCreateAtCenter('PRD')}
          onDragStart={(e) => setDragPayload(e, { kind: 'node', type: 'PRD' })}
        />
        <ToolbarItem
          icon={<Box className="w-4 h-4 text-violet-300" />}
          label="Architecture"
          onClick={onGenerateArchitecture}
        />
        <div className="relative">
          <ToolbarItem
            icon={<Workflow className="w-4 h-4 text-teal-300" />}
            label="Flow"
            active={flowMenuOpen}
            onClick={() => setFlowMenuOpen((v) => !v)}
          />
          {flowMenuOpen && (
            <button
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1e1e1e] border border-[#2c2c2c] text-zinc-400 flex items-center justify-center"
              onClick={() => setFlowMenuOpen(false)}
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="w-px h-5 bg-[#222222] mx-0.5" />
        <ToolbarItem
          icon={<TypeIcon className="w-4 h-4" />}
          label="Text"
          onClick={() => onCreateAtCenter('TEXT')}
          onDragStart={(e) => setDragPayload(e, { kind: 'node', type: 'TEXT' })}
        />
        <ToolbarItem
          icon={<CheckSquare className="w-4 h-4 text-amber-300" />}
          label="Todo"
          onClick={() => onCreateAtCenter('CHECKLIST')}
          onDragStart={(e) => setDragPayload(e, { kind: 'node', type: 'CHECKLIST' })}
        />
        <ToolbarItem
          icon={<ImageUp className="w-4 h-4" />}
          label="Upload"
          onClick={() => onCreateAtCenter('IMAGE')}
          onDragStart={(e) => setDragPayload(e, { kind: 'node', type: 'IMAGE' })}
        />
      </div>
    </div>
  );
}
