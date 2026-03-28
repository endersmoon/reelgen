/**
 * Server-safe validation entry point.
 * Exports only Zod-based validation — no @reelgen/2d dependency.
 * Suitable for Node.js / MCP server use.
 */
export {validateSceneDefinition} from './schema';
export type {
  SceneDefinition,
  SceneSettings,
  SceneDescriptor,
  NodeDescriptor,
  AnimationStep,
  ParallelBlock,
  WaitStep,
  TimelineEntry,
  TransitionDescriptor,
} from './types';
