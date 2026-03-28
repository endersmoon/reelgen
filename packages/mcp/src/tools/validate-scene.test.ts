import {describe, expect, test} from 'vitest';
import {validateScene} from './validate-scene';

const validDefinition = {
  scenes: [{id: 'scene1', nodes: [], timeline: []}],
};

describe('validateScene', () => {
  test('returns valid:true for a correct definition', () => {
    const result = validateScene({definition: validDefinition});
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test('returns valid:true for a full definition', () => {
    const result = validateScene({
      definition: {
        settings: {width: 1920, height: 1080, fps: 30},
        scenes: [
          {
            id: 's',
            background: '#000',
            transition: {type: 'fade', duration: 0.5},
            nodes: [
              {id: 'r', type: 'Rect', props: {width: 100, fill: '#fff'}},
            ],
            timeline: [
              {target: 'r', prop: 'opacity', to: 1, duration: 0.5, easing: 'easeOutCubic'},
              {type: 'wait', duration: 1},
              {parallel: [{target: 'r', prop: 'x', to: 100, duration: 0.3}]},
            ],
          },
        ],
      },
    });
    expect(result.valid).toBe(true);
  });

  test('returns valid:false with errors for missing scenes', () => {
    const result = validateScene({definition: {}});
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('returns valid:false for invalid transition type', () => {
    const result = validateScene({
      definition: {
        scenes: [
          {
            id: 's',
            nodes: [],
            timeline: [],
            transition: {type: 'dissolve'},
          },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('returns valid:false for invalid slide direction', () => {
    const result = validateScene({
      definition: {
        scenes: [
          {
            id: 's',
            nodes: [],
            timeline: [],
            transition: {type: 'slide', direction: 'diagonal'},
          },
        ],
      },
    });
    expect(result.valid).toBe(false);
  });

  test('returns valid:false for negative wait duration', () => {
    const result = validateScene({
      definition: {
        scenes: [
          {
            id: 's',
            nodes: [],
            timeline: [{type: 'wait', duration: -1}],
          },
        ],
      },
    });
    expect(result.valid).toBe(false);
  });

  test('returns valid:false for non-object input', () => {
    const result = validateScene({definition: 'not-an-object' as never});
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('errors are non-empty strings', () => {
    const result = validateScene({definition: {}});
    expect(result.valid).toBe(false);
    for (const err of result.errors!) {
      expect(typeof err).toBe('string');
      expect(err.length).toBeGreaterThan(0);
    }
  });
});
