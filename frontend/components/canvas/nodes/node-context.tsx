import { createContext, useContext } from 'react';

export interface CanvasNodeActions {
  /** Persist a data update on a node (bumps dirty + autosave). */
  updateNodeData: (id: string, data: Record<string, any>) => void;
  /** Navigate into a canvas page (node-to-page navigation). */
  openPage: (pageId: string) => void;
  /** Ask Gemini with this node as the selected context. */
  askGeminiForNode: (nodeId: string, question: string) => void;
  /** Generate a structured PRD into this PRD node. */
  generatePrdForNode: (nodeId: string, description: string) => void;
  /** Store an uploaded image into this image node. */
  uploadImageToNode: (nodeId: string, file: File) => void;
}

export const CanvasNodeContext = createContext<CanvasNodeActions>({
  updateNodeData: () => {},
  openPage: () => {},
  askGeminiForNode: () => {},
  generatePrdForNode: () => {},
  uploadImageToNode: () => {},
});

export const useCanvasNodeActions = () => useContext(CanvasNodeContext);

/** Tiny markdown-ish renderer: bold + bullet lines. No dependencies. */
export function renderSimpleText(body: string): React.ReactNode[] {
  return body.split('\n').map((line, i) => {
    if (line.trim() === '') return <div key={i} className="h-2" />;
    const isBullet = /^\s*[-•]\s+/.test(line);
    const text = isBullet ? line.replace(/^\s*[-•]\s+/, '') : line;
    const parts: React.ReactNode[] = [];
    let rest = text;
    let key = 0;
    while (rest) {
      const m = rest.match(/\*\*(.+?)\*\*/);
      if (!m || m.index === undefined) {
        parts.push(rest);
        break;
      }
      parts.push(rest.slice(0, m.index));
      parts.push(<strong key={`b${key++}`} className="text-white font-semibold">{m[1]}</strong>);
      rest = rest.slice(m.index + m[0].length);
    }
    return isBullet ? (
      <div key={i} className="flex gap-1.5 pl-1">
        <span className="text-zinc-600 shrink-0">•</span>
        <span>{parts}</span>
      </div>
    ) : (
      <div key={i}>{parts}</div>
    );
  });
}
