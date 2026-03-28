import {describe, expect, test, beforeAll, afterAll, beforeEach} from 'vitest';
import {
  PlaybackManager,
  PlaybackStatus,
  Vector2,
  endPlayback,
  endScene,
  startPlayback,
  startScene,
  threads,
} from '@reelgen/core';
import type {FullSceneDescription, ThreadGeneratorFactory} from '@reelgen/core';
import {makeScene2D, Scene2D, Rect, Txt} from '@reelgen/2d';
import type {View2D} from '@reelgen/2d';
import {runTimeline} from './timeline-runner';

function runThreaded(
  playback: PlaybackManager,
  fn: () => Generator,
): void {
  playback.fps = 60;
  playback.frame = 0;
  const task = threads(fn);
  for (const _ of task) {
    playback.frame++;
  }
}

describe('runTimeline', () => {
  const playback = new PlaybackManager();
  const status = new PlaybackStatus(playback);
  const description = {
    ...makeScene2D('test', function* () {}),
    name: 'test',
    size: new Vector2(1920, 1080),
    resolutionScale: 1,
    playback: status,
  } as unknown as FullSceneDescription<ThreadGeneratorFactory<View2D>>;
  const scene = new Scene2D(description);

  beforeAll(() => {
    startScene(scene);
    startPlayback(status);
  });
  afterAll(() => {
    endPlayback(status);
    endScene(scene);
  });
  beforeEach(() => scene.reset());

  test('sets opacity to target value after animation', () => {
    const node = new Rect({opacity: 0});
    const refMap = new Map([['n', node as never]]);

    runThreaded(playback, function* () {
      yield* runTimeline(
        [{target: 'n', prop: 'opacity', to: 1, duration: 0.1}],
        refMap,
      );
    });

    expect(node.opacity()).toBeCloseTo(1);
  });

  test('applies from value before animating', () => {
    const node = new Rect({opacity: 1});
    const refMap = new Map([['n', node as never]]);

    runThreaded(playback, function* () {
      yield* runTimeline(
        [{target: 'n', prop: 'opacity', from: 0, to: 0.75, duration: 0.1}],
        refMap,
      );
    });

    expect(node.opacity()).toBeCloseTo(0.75);
  });

  test('handles wait steps without error', () => {
    const refMap = new Map<string, never>();

    expect(() =>
      runThreaded(playback, function* () {
        yield* runTimeline([{type: 'wait', duration: 0.05}], refMap);
      }),
    ).not.toThrow();
  });

  test('animates x position via direct prop name', () => {
    const node = new Rect({x: 0});
    const refMap = new Map([['n', node as never]]);

    runThreaded(playback, function* () {
      yield* runTimeline(
        [{target: 'n', prop: 'x', to: 200, duration: 0.1}],
        refMap,
      );
    });

    expect(node.x()).toBeCloseTo(200);
  });

  test('parallel block animates multiple nodes concurrently', () => {
    const a = new Rect({opacity: 0});
    const b = new Rect({opacity: 0});
    const refMap = new Map([
      ['a', a as never],
      ['b', b as never],
    ]);

    runThreaded(playback, function* () {
      yield* runTimeline(
        [
          {
            parallel: [
              {target: 'a', prop: 'opacity', to: 1, duration: 0.1},
              {target: 'b', prop: 'opacity', to: 0.5, duration: 0.1},
            ],
          },
        ],
        refMap,
      );
    });

    expect(a.opacity()).toBeCloseTo(1);
    expect(b.opacity()).toBeCloseTo(0.5);
  });

  test('runs sequential steps in order', () => {
    const node = new Rect({x: 0});
    const refMap = new Map([['n', node as never]]);

    runThreaded(playback, function* () {
      yield* runTimeline(
        [
          {target: 'n', prop: 'x', to: 100, duration: 0.05},
          {target: 'n', prop: 'x', to: 200, duration: 0.05},
        ],
        refMap,
      );
    });

    expect(node.x()).toBeCloseTo(200);
  });

  test('uses named easing without error', () => {
    const node = new Rect({opacity: 0});
    const refMap = new Map([['n', node as never]]);

    expect(() =>
      runThreaded(playback, function* () {
        yield* runTimeline(
          [{target: 'n', prop: 'opacity', to: 1, duration: 0.1, easing: 'easeOutCubic'}],
          refMap,
        );
      }),
    ).not.toThrow();
    expect(node.opacity()).toBeCloseTo(1);
  });

  test('animates fontSize on a Txt node', () => {
    const node = new Txt({text: 'hi', fill: '#fff', fontSize: 16});
    const refMap = new Map([['t', node as never]]);

    runThreaded(playback, function* () {
      yield* runTimeline(
        [{target: 't', prop: 'fontSize', to: 64, duration: 0.1}],
        refMap,
      );
    });

    expect(node.fontSize()).toBeCloseTo(64);
  });

  test('throws for unknown target node id', () => {
    const refMap = new Map<string, never>();

    expect(() =>
      runThreaded(playback, function* () {
        yield* runTimeline(
          [{target: 'missing', prop: 'opacity', to: 1, duration: 0}],
          refMap,
        );
      }),
    ).toThrowError(/Unknown target node/);
  });

  test('throws for invalid property path', () => {
    const node = new Rect({});
    const refMap = new Map([['n', node as never]]);

    expect(() =>
      runThreaded(playback, function* () {
        yield* runTimeline(
          [{target: 'n', prop: 'doesNotExist', to: 1, duration: 0}],
          refMap,
        );
      }),
    ).toThrow();
  });

  test('handles empty timeline without error', () => {
    const refMap = new Map<string, never>();

    expect(() =>
      runThreaded(playback, function* () {
        yield* runTimeline([], refMap);
      }),
    ).not.toThrow();
  });
});
