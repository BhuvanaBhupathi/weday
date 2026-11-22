// Curated software-development flowchart templates.
// Each template is a set of FLOW canvas nodes + edges that gets placed
// as real, individually movable canvas objects (not a static image).

export interface FlowTemplateNode {
  key: string;
  title: string;
  shape: 'start' | 'process' | 'decision' | 'end';
  /** Grid coordinates (unit = 1 slot). Laid out deterministically. */
  gx: number;
  gy: number;
}

export interface FlowTemplateEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: FlowTemplateNode[];
  edges: FlowTemplateEdge[];
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'authentication',
    name: 'Authentication',
    description: 'Login flow with credential validation and error path',
    nodes: [
      { key: 'start', title: 'Start', shape: 'start', gx: 0, gy: 0 },
      { key: 'login', title: 'Login', shape: 'process', gx: 0, gy: 1 },
      { key: 'valid', title: 'Credentials valid?', shape: 'decision', gx: 0, gy: 2 },
      { key: 'error', title: 'Error', shape: 'end', gx: 1, gy: 2 },
      { key: 'dashboard', title: 'Dashboard', shape: 'end', gx: 0, gy: 3 },
    ],
    edges: [
      { from: 'start', to: 'login' },
      { from: 'login', to: 'valid' },
      { from: 'valid', to: 'error', label: 'No' },
      { from: 'valid', to: 'dashboard', label: 'Yes' },
    ],
  },
  {
    id: 'user-journey',
    name: 'User journey',
    description: 'First-run journey from landing to canvas',
    nodes: [
      { key: 'landing', title: 'Landing', shape: 'start', gx: 0, gy: 0 },
      { key: 'signup', title: 'Sign up', shape: 'process', gx: 0, gy: 1 },
      { key: 'band', title: 'Create Band', shape: 'process', gx: 0, gy: 2 },
      { key: 'invite', title: 'Invite Crew', shape: 'process', gx: 0, gy: 3 },
      { key: 'canvas', title: 'Canvas', shape: 'end', gx: 0, gy: 4 },
    ],
    edges: [
      { from: 'landing', to: 'signup' },
      { from: 'signup', to: 'band' },
      { from: 'band', to: 'invite' },
      { from: 'invite', to: 'canvas' },
    ],
  },
  {
    id: 'feature-flow',
    name: 'Feature flow',
    description: 'User action → validation → API → database → response',
    nodes: [
      { key: 'action', title: 'User action', shape: 'start', gx: 0, gy: 0 },
      { key: 'validation', title: 'Validation', shape: 'process', gx: 0, gy: 1 },
      { key: 'api', title: 'API', shape: 'process', gx: 0, gy: 2 },
      { key: 'db', title: 'Database', shape: 'process', gx: 0, gy: 3 },
      { key: 'response', title: 'Response', shape: 'end', gx: 0, gy: 4 },
    ],
    edges: [
      { from: 'action', to: 'validation' },
      { from: 'validation', to: 'api' },
      { from: 'api', to: 'db' },
      { from: 'db', to: 'response' },
    ],
  },
  {
    id: 'decision-flow',
    name: 'Decision flow',
    description: 'Generic condition with two outcomes',
    nodes: [
      { key: 'condition', title: 'Condition?', shape: 'decision', gx: 0, gy: 0 },
      { key: 'action-a', title: 'Action A', shape: 'end', gx: -1, gy: 1 },
      { key: 'action-b', title: 'Action B', shape: 'end', gx: 1, gy: 1 },
    ],
    edges: [
      { from: 'condition', to: 'action-a', label: 'Yes' },
      { from: 'condition', to: 'action-b', label: 'No' },
    ],
  },
];

/** Slot size in canvas coordinates when placing a template. */
export const FLOW_SLOT = { x: 240, y: 130 };
