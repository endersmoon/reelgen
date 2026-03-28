import {describe, expect, test} from 'vitest';
import {createScenesFromJSON, validateSceneDefinition} from './index';

const exampleJSON = {
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    background: '#0f0f23',
  },
  scenes: [
    {
      id: 'intro',
      background: '#1a1a2e',
      nodes: [
        {
          id: 'title',
          type: 'Txt',
          props: {
            text: 'Hello World',
            fontSize: 64,
            fill: '#ffffff',
            position: [0, -200],
            opacity: 0,
          },
        },
        {
          id: 'box',
          type: 'Rect',
          props: {width: 400, height: 100, fill: '#333', opacity: 0},
        },
      ],
      timeline: [
        {target: 'title', prop: 'opacity', to: 1, duration: 0.6, easing: 'easeOutCubic'},
        {type: 'wait', duration: 1},
        {
          parallel: [
            {target: 'box', prop: 'opacity', to: 1, duration: 0.4},
            {target: 'title', prop: 'opacity', to: 0, duration: 0.4},
          ],
        },
      ],
    },
  ],
};

describe('createScenesFromJSON', () => {
  test('returns scenes array and settings for valid JSON', () => {
    const {scenes, settings} = createScenesFromJSON(exampleJSON);
    expect(scenes).toHaveLength(1);
    expect(settings?.width).toBe(1920);
    expect(settings?.fps).toBe(30);
  });

  test('returns one scene per descriptor', () => {
    const json = {
      scenes: [
        {id: 'scene1', nodes: [], timeline: []},
        {id: 'scene2', nodes: [], timeline: []},
        {id: 'scene3', nodes: [], timeline: []},
      ],
    };
    const {scenes} = createScenesFromJSON(json);
    expect(scenes).toHaveLength(3);
  });

  test('settings is undefined when not provided', () => {
    const {settings} = createScenesFromJSON({
      scenes: [{id: 's', nodes: [], timeline: []}],
    });
    expect(settings).toBeUndefined();
  });

  test('each scene has the correct id (name)', () => {
    const {scenes} = createScenesFromJSON({
      scenes: [
        {id: 'my-scene', nodes: [], timeline: []},
      ],
    });
    // The scene description carries the name used in makeScene2D
    expect(scenes[0].name).toBe('my-scene');
  });

  test('throws ZodError for invalid JSON', () => {
    expect(() => createScenesFromJSON(null)).toThrow();
    expect(() => createScenesFromJSON({scenes: 'bad'})).toThrow();
    expect(() =>
      createScenesFromJSON({
        scenes: [{id: 's', nodes: [], timeline: [{type: 'invalid'}]}],
      }),
    ).toThrow();
  });

  test('works with a scene that has a transition', () => {
    const {scenes} = createScenesFromJSON({
      scenes: [
        {
          id: 'faded',
          nodes: [],
          timeline: [],
          transition: {type: 'fade', duration: 0.5},
        },
      ],
    });
    expect(scenes).toHaveLength(1);
  });
});

describe('re-exported validateSceneDefinition', () => {
  test('is accessible from the package index', () => {
    const result = validateSceneDefinition({
      scenes: [{id: 's', nodes: [], timeline: []}],
    });
    expect(result.scenes[0].id).toBe('s');
  });
});
