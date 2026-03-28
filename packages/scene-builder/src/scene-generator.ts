import {makeScene2D} from '@reelgen/2d';
import type {SceneDescriptor} from './types';
import {buildNodeTree} from './node-factory';
import {runTimeline} from './timeline-runner';
import {runTransition} from './transition-map';

/**
 * Builds a Reelgen scene description from a `SceneDescriptor`.
 * The returned value can be passed directly to `renderVideo` or a project file.
 */
export function buildScene(sceneData: SceneDescriptor) {
  return makeScene2D(sceneData.id, function* (view) {
    // 1. Apply scene-level background
    if (sceneData.background) {
      view.fill(sceneData.background);
    }

    // 2. Run transition if specified
    if (sceneData.transition) {
      yield* runTransition(sceneData.transition);
    }

    // 3. Build node tree, collect id → node map
    const {rootNodes, refMap} = buildNodeTree(sceneData.nodes);
    for (const node of rootNodes) {
      view.add(node);
    }

    // 4. Execute timeline
    yield* runTimeline(sceneData.timeline, refMap);
  });
}
