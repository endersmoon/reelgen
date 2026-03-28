import {describe, expect, test} from 'vitest';
import {SCHEMA_DOC} from './schema-doc';

describe('SCHEMA_DOC', () => {
  test('is a non-empty string', () => {
    expect(typeof SCHEMA_DOC).toBe('string');
    expect(SCHEMA_DOC.length).toBeGreaterThan(0);
  });

  test('covers top-level structure', () => {
    expect(SCHEMA_DOC).toContain('"settings"');
    expect(SCHEMA_DOC).toContain('"scenes"');
  });

  test('documents all required SceneDescriptor fields', () => {
    expect(SCHEMA_DOC).toContain('"id"');
    expect(SCHEMA_DOC).toContain('"nodes"');
    expect(SCHEMA_DOC).toContain('"timeline"');
    expect(SCHEMA_DOC).toContain('"transition"');
  });

  test('documents all timeline entry types', () => {
    expect(SCHEMA_DOC).toContain('AnimationStep');
    expect(SCHEMA_DOC).toContain('ParallelBlock');
    expect(SCHEMA_DOC).toContain('WaitStep');
    expect(SCHEMA_DOC).toContain('"parallel"');
    expect(SCHEMA_DOC).toContain('"type": "wait"');
  });

  test('documents prop value encoding rules', () => {
    expect(SCHEMA_DOC).toContain('Vector2');
    expect(SCHEMA_DOC).toContain('[x, y]');
    expect(SCHEMA_DOC).toContain('CSS color');
    expect(SCHEMA_DOC).toContain('Spacing');
  });

  test('documents all transition types', () => {
    for (const type of ['fade', 'slide', 'zoomIn', 'zoomOut']) {
      expect(SCHEMA_DOC).toContain(type);
    }
    for (const dir of ['top', 'right', 'bottom', 'left']) {
      expect(SCHEMA_DOC).toContain(dir);
    }
  });

  test('lists easing functions', () => {
    for (const name of [
      'linear',
      'easeInCubic',
      'easeOutCubic',
      'easeInOutCubic',
      'easeInBack',
      'easeOutElastic',
      'easeInBounce',
    ]) {
      expect(SCHEMA_DOC).toContain(name);
    }
  });

  test('documents key node types', () => {
    for (const type of ['Rect', 'Circle', 'Txt', 'Img', 'Video', 'Layout', 'Code', 'Latex']) {
      expect(SCHEMA_DOC).toContain(type);
    }
  });

  test('includes a full working example', () => {
    // The example must be parseable JSON when extracted
    const match = SCHEMA_DOC.match(/```json\n([\s\S]*?)\n```/g);
    expect(match).not.toBeNull();

    const jsonBlocks = (match ?? []).map(block =>
      block.replace(/^```json\n/, '').replace(/\n```$/, ''),
    );
    // At least one block should be parseable JSON
    const parseable = jsonBlocks.filter(block => {
      try {
        JSON.parse(block);
        return true;
      } catch {
        return false;
      }
    });
    expect(parseable.length).toBeGreaterThan(0);
  });

  test('full example contains scenes and timeline', () => {
    expect(SCHEMA_DOC).toContain('"scenes"');
    expect(SCHEMA_DOC).toContain('"timeline"');
    expect(SCHEMA_DOC).toContain('"nodes"');
  });
});
