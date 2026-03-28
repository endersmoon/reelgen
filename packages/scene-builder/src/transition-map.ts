import {
  Direction,
  BBox,
  fadeTransition,
  slideTransition,
  zoomInTransition,
  zoomOutTransition,
} from '@reelgen/core';
import type {ThreadGenerator} from '@reelgen/core';
import type {TransitionDescriptor} from './types';

const DIRECTION_MAP: Record<string, Direction> = {
  top: Direction.Top,
  bottom: Direction.Bottom,
  left: Direction.Left,
  right: Direction.Right,
};

/**
 * Runs the transition described by the given descriptor.
 */
export function* runTransition(
  descriptor: TransitionDescriptor,
): ThreadGenerator {
  const duration = descriptor.duration ?? 0.6;

  switch (descriptor.type) {
    case 'fade':
      yield* fadeTransition(duration);
      break;

    case 'slide': {
      const dir = descriptor.direction
        ? DIRECTION_MAP[descriptor.direction] ?? Direction.Top
        : Direction.Top;
      yield* slideTransition(dir, duration);
      break;
    }

    case 'zoomIn': {
      const area = descriptor.area ?? [0, 0, 100, 100];
      const bbox = new BBox(area[0], area[1], area[2], area[3]);
      yield* zoomInTransition(bbox, duration);
      break;
    }

    case 'zoomOut': {
      const area = descriptor.area ?? [0, 0, 100, 100];
      const bbox = new BBox(area[0], area[1], area[2], area[3]);
      yield* zoomOutTransition(bbox, duration);
      break;
    }

    default:
      break;
  }
}
