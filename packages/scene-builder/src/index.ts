export {validateSceneDefinition} from './schema';
export {buildScene} from './scene-generator';
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

import {validateSceneDefinition} from './schema';
import {buildScene} from './scene-generator';
import type {SceneDefinition} from './types';

/**
 * Parses and validates a JSON payload, then builds scene descriptions for all
 * scenes defined in it.
 *
 * ```typescript
 * import { createScenesFromJSON } from '@reelgen/scene-builder';
 * import { renderVideo } from '@reelgen/renderer';
 *
 * const { scenes, settings } = createScenesFromJSON(json);
 * await renderVideo({ scenes, ...settings });
 * ```
 */
export function createScenesFromJSON(json: unknown): {
  scenes: ReturnType<typeof buildScene>[];
  settings: SceneDefinition['settings'];
} {
  const definition = validateSceneDefinition(json);
  return {
    scenes: definition.scenes.map(buildScene),
    settings: definition.settings,
  };
}
