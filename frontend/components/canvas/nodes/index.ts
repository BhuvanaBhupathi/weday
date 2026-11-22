import {
  TextCanvasNode,
  ChecklistCanvasNode,
  ImageCanvasNode,
  PageLinkCanvasNode,
  FlowCanvasNode,
  ArchitectureCanvasNode,
} from './basic-nodes';
import { GeminiCanvasNode, PrdCanvasNode } from './ai-nodes';

export const canvasNodeTypes = {
  TEXT: TextCanvasNode,
  CHECKLIST: ChecklistCanvasNode,
  PRD: PrdCanvasNode,
  GEMINI: GeminiCanvasNode,
  IMAGE: ImageCanvasNode,
  PAGE_LINK: PageLinkCanvasNode,
  FLOW: FlowCanvasNode,
  ARCHITECTURE: ArchitectureCanvasNode,
};

export const NODE_DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  TEXT: { width: 280, height: 140 },
  CHECKLIST: { width: 300, height: 180 },
  PRD: { width: 340, height: 320 },
  GEMINI: { width: 340, height: 260 },
  IMAGE: { width: 300, height: 220 },
  PAGE_LINK: { width: 240, height: 64 },
  FLOW: { width: 220, height: 70 },
  ARCHITECTURE: { width: 280, height: 140 },
};
