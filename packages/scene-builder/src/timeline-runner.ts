import {all, waitFor} from '@reelgen/core';
import type {ThreadGenerator} from '@reelgen/core';
import type {Node} from '@reelgen/2d';
import type {AnimationStep, TimelineEntry} from './types';
import {getEasing} from './easing-map';
import {resolveProp} from './prop-resolver';

function isWaitStep(entry: TimelineEntry): entry is {type: 'wait'; duration: number} {
  return 'type' in entry && (entry as {type: string}).type === 'wait';
}

function isParallelBlock(entry: TimelineEntry): entry is {parallel: AnimationStep[]} {
  return 'parallel' in entry;
}

/**
 * Resolves a dot-path property string on a node to the leaf signal function.
 * e.g., "position.x" → node.position.x
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveSignal(node: Node, prop: string): (...args: any[]) => any {
  const parts = prop.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = node;
  for (const part of parts) {
    if (current == null || typeof current[part] === 'undefined') {
      throw new Error(`[scene-builder] Property "${prop}" not found on node`);
    }
    current = current[part];
  }
  if (typeof current !== 'function') {
    throw new Error(
      `[scene-builder] Property "${prop}" resolved to a non-function value`,
    );
  }
  return current;
}

function* animateStep(
  step: AnimationStep,
  refMap: Map<string, Node>,
): ThreadGenerator {
  const node = refMap.get(step.target);
  if (!node) {
    throw new Error(`[scene-builder] Unknown target node id: "${step.target}"`);
  }

  const signal = resolveSignal(node, step.prop);
  const easing = getEasing(step.easing);
  const toValue = resolveProp(step.to);

  if (step.from !== undefined) {
    signal(resolveProp(step.from));
  }

  yield* signal(toValue, step.duration, easing);
}

/**
 * Executes a timeline array as a generator sequence.
 * Sequential steps run one after another; `parallel` blocks run concurrently.
 */
export function* runTimeline(
  timeline: TimelineEntry[],
  refMap: Map<string, Node>,
): ThreadGenerator {
  for (const entry of timeline) {
    if (isWaitStep(entry)) {
      yield* waitFor(entry.duration);
    } else if (isParallelBlock(entry)) {
      yield* all(...entry.parallel.map(step => animateStep(step, refMap)));
    } else {
      yield* animateStep(entry as AnimationStep, refMap);
    }
  }
}
