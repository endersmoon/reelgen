import {describe, expect, test, beforeAll, afterAll, beforeEach} from 'vitest';
import {
  PlaybackManager,
  PlaybackStatus,
  Vector2,
  endPlayback,
  endScene,
  startPlayback,
  startScene,
} from '@reelgen/core';
import type {FullSceneDescription, ThreadGeneratorFactory} from '@reelgen/core';
import {makeScene2D, Scene2D} from '@reelgen/2d';
import type {View2D} from '@reelgen/2d';
import {Rect, Txt, Circle, Img} from '@reelgen/2d';
import {buildNodeTree} from './node-factory';

function setupScene() {
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
}

describe('buildNodeTree', () => {
  setupScene();

  test('creates a Rect node from descriptor', () => {
    const {rootNodes, refMap} = buildNodeTree([
      {id: 'r', type: 'Rect', props: {width: 100, height: 50}},
    ]);
    expect(rootNodes).toHaveLength(1);
    expect(rootNodes[0]).toBeInstanceOf(Rect);
    expect(refMap.get('r')).toBe(rootNodes[0]);
  });

  test('creates a Txt node from descriptor', () => {
    const {rootNodes} = buildNodeTree([
      {id: 't', type: 'Txt', props: {text: 'Hello', fontSize: 32}},
    ]);
    expect(rootNodes[0]).toBeInstanceOf(Txt);
  });

  test('creates a Circle node from descriptor', () => {
    const {rootNodes} = buildNodeTree([
      {type: 'Circle', props: {width: 80, height: 80}},
    ]);
    expect(rootNodes[0]).toBeInstanceOf(Circle);
  });

  test('nodes without id are not added to refMap', () => {
    const {rootNodes, refMap} = buildNodeTree([
      {type: 'Rect', props: {width: 40}},
    ]);
    expect(rootNodes).toHaveLength(1);
    expect(refMap.size).toBe(0);
  });

  test('builds multiple root nodes', () => {
    const {rootNodes, refMap} = buildNodeTree([
      {id: 'a', type: 'Rect'},
      {id: 'b', type: 'Circle'},
      {id: 'c', type: 'Txt', props: {text: 'hi'}},
    ]);
    expect(rootNodes).toHaveLength(3);
    expect(refMap.size).toBe(3);
    expect(refMap.has('a')).toBe(true);
    expect(refMap.has('b')).toBe(true);
    expect(refMap.has('c')).toBe(true);
  });

  test('resolves [x, y] position prop to Vector2', () => {
    const {rootNodes} = buildNodeTree([
      {id: 'r', type: 'Rect', props: {position: [100, -200]}},
    ]);
    const node = rootNodes[0] as Rect;
    const pos = node.position();
    expect(pos.x).toBeCloseTo(100);
    expect(pos.y).toBeCloseTo(-200);
  });

  test('creates nested children', () => {
    const {rootNodes, refMap} = buildNodeTree([
      {
        id: 'parent',
        type: 'Rect',
        props: {width: 200, height: 100},
        children: [
          {id: 'child', type: 'Txt', props: {text: 'inner'}},
        ],
      },
    ]);
    expect(rootNodes).toHaveLength(1);
    expect(refMap.has('parent')).toBe(true);
    expect(refMap.has('child')).toBe(true);
    expect(refMap.get('child')).toBeInstanceOf(Txt);
  });

  test('throws for unknown node type', () => {
    expect(() =>
      buildNodeTree([{type: 'UnknownNode'}]),
    ).toThrowError(/Unknown node type/);
  });

  test('handles empty descriptor array', () => {
    const {rootNodes, refMap} = buildNodeTree([]);
    expect(rootNodes).toHaveLength(0);
    expect(refMap.size).toBe(0);
  });

  test('creates Img node', () => {
    const {rootNodes} = buildNodeTree([
      {type: 'Img', props: {src: '/test.png', width: 100, height: 100}},
    ]);
    expect(rootNodes[0]).toBeInstanceOf(Img);
  });
});
