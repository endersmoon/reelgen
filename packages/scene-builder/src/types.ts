/**
 * Top-level JSON scene definition.
 */
export interface SceneDefinition {
  settings?: SceneSettings;
  scenes: SceneDescriptor[];
}

export interface SceneSettings {
  width?: number;
  height?: number;
  fps?: number;
  background?: string;
}

export interface SceneDescriptor {
  id: string;
  duration?: number;
  background?: string;
  transition?: TransitionDescriptor;
  nodes: NodeDescriptor[];
  timeline: TimelineEntry[];
}

export interface NodeDescriptor {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  children?: NodeDescriptor[];
}

export interface AnimationStep {
  /** Node id to animate. */
  target: string;
  /** Property name; dot notation for nested props (e.g. "position.x"). */
  prop: string;
  /** Target value. */
  to: unknown;
  /** Optional start value (defaults to current). */
  from?: unknown;
  /** Duration in seconds. */
  duration: number;
  /** Easing function name. Defaults to "linear". */
  easing?: string;
}

export interface ParallelBlock {
  parallel: AnimationStep[];
}

export interface WaitStep {
  type: 'wait';
  duration: number;
}

export type TimelineEntry = AnimationStep | ParallelBlock | WaitStep;

export interface TransitionDescriptor {
  type: 'fade' | 'slide' | 'zoomIn' | 'zoomOut';
  duration?: number;
  /** For slide: "top" | "right" | "bottom" | "left". Defaults to "top". */
  direction?: 'top' | 'right' | 'bottom' | 'left';
  /** For zoomIn/zoomOut: [x, y, width, height]. */
  area?: [number, number, number, number];
}
