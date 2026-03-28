import {describe, expect, test} from 'vitest';
import {validateSceneDefinition} from './schema';

const minimalScene = {
  id: 'scene1',
  nodes: [],
  timeline: [],
};

describe('validateSceneDefinition', () => {
  test('accepts a minimal valid definition', () => {
    const result = validateSceneDefinition({scenes: [minimalScene]});
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].id).toBe('scene1');
  });

  test('accepts full settings block', () => {
    const result = validateSceneDefinition({
      settings: {width: 1920, height: 1080, fps: 30, background: '#000000'},
      scenes: [minimalScene],
    });
    expect(result.settings?.width).toBe(1920);
    expect(result.settings?.fps).toBe(30);
  });

  test('accepts node descriptors with children', () => {
    const result = validateSceneDefinition({
      scenes: [
        {
          id: 's',
          nodes: [
            {
              id: 'rect',
              type: 'Rect',
              props: {width: 100, height: 50, fill: '#ff0000'},
              children: [{type: 'Txt', props: {text: 'hello'}}],
            },
          ],
          timeline: [],
        },
      ],
    });
    const node = result.scenes[0].nodes[0];
    expect(node.id).toBe('rect');
    expect(node.type).toBe('Rect');
    expect(node.children).toHaveLength(1);
  });

  test('accepts all timeline entry types', () => {
    const result = validateSceneDefinition({
      scenes: [
        {
          id: 's',
          nodes: [],
          timeline: [
            {target: 'n', prop: 'opacity', to: 1, duration: 0.5, easing: 'easeOutCubic'},
            {type: 'wait', duration: 2},
            {
              parallel: [
                {target: 'n', prop: 'position.x', to: 100, duration: 0.3},
                {target: 'n', prop: 'opacity', to: 0, duration: 0.3, from: 1},
              ],
            },
          ],
        },
      ],
    });
    expect(result.scenes[0].timeline).toHaveLength(3);
  });

  test('accepts all supported transition types', () => {
    const transitionTypes = ['fade', 'slide', 'zoomIn', 'zoomOut'] as const;
    for (const type of transitionTypes) {
      const result = validateSceneDefinition({
        scenes: [{id: 's', nodes: [], timeline: [], transition: {type, duration: 0.5}}],
      });
      expect(result.scenes[0].transition?.type).toBe(type);
    }
  });

  test('accepts slide transition with direction', () => {
    const result = validateSceneDefinition({
      scenes: [
        {
          id: 's',
          nodes: [],
          timeline: [],
          transition: {type: 'slide', direction: 'left', duration: 0.4},
        },
      ],
    });
    expect(result.scenes[0].transition?.direction).toBe('left');
  });

  test('accepts zoomIn with area', () => {
    const result = validateSceneDefinition({
      scenes: [
        {
          id: 's',
          nodes: [],
          timeline: [],
          transition: {type: 'zoomIn', area: [0, 0, 100, 100], duration: 0.6},
        },
      ],
    });
    expect(result.scenes[0].transition?.area).toEqual([0, 0, 100, 100]);
  });

  test('throws on missing scenes', () => {
    expect(() => validateSceneDefinition({})).toThrow();
  });

  test('throws on invalid transition type', () => {
    expect(() =>
      validateSceneDefinition({
        scenes: [
          {id: 's', nodes: [], timeline: [], transition: {type: 'dissolve'}},
        ],
      }),
    ).toThrow();
  });

  test('throws on invalid slide direction', () => {
    expect(() =>
      validateSceneDefinition({
        scenes: [
          {
            id: 's',
            nodes: [],
            timeline: [],
            transition: {type: 'slide', direction: 'diagonal'},
          },
        ],
      }),
    ).toThrow();
  });

  test('throws when scenes is not an array', () => {
    expect(() => validateSceneDefinition({scenes: 'not-an-array'})).toThrow();
  });

  test('throws on negative duration in wait step', () => {
    expect(() =>
      validateSceneDefinition({
        scenes: [
          {
            id: 's',
            nodes: [],
            timeline: [{type: 'wait', duration: -1}],
          },
        ],
      }),
    ).toThrow();
  });
});
