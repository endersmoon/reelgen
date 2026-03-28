import {describe, expect, test} from 'vitest';
import {listNodeTypes, NODE_TYPES, COMMON_PROPS} from './list-node-types';

describe('listNodeTypes', () => {
  test('returns nodeTypes and commonProps', () => {
    const result = listNodeTypes();
    expect(result).toHaveProperty('nodeTypes');
    expect(result).toHaveProperty('commonProps');
  });

  test('returns all 21 node types', () => {
    const {nodeTypes} = listNodeTypes();
    expect(nodeTypes).toHaveLength(21);
  });

  test('each node type has type, description, and keyProps', () => {
    const {nodeTypes} = listNodeTypes();
    for (const node of nodeTypes) {
      expect(typeof node.type).toBe('string');
      expect(node.type.length).toBeGreaterThan(0);
      expect(typeof node.description).toBe('string');
      expect(node.description.length).toBeGreaterThan(0);
      expect(Array.isArray(node.keyProps)).toBe(true);
      expect(node.keyProps.length).toBeGreaterThan(0);
    }
  });

  test('includes all expected core node types', () => {
    const {nodeTypes} = listNodeTypes();
    const types = nodeTypes.map(n => n.type);
    for (const expected of [
      'Rect', 'Circle', 'Txt', 'Img', 'Video', 'Audio',
      'Line', 'Polygon', 'Grid', 'Ray', 'Path', 'Spline',
      'CubicBezier', 'QuadBezier', 'Knot',
      'Latex', 'Code', 'Icon', 'SVG', 'Layout', 'Node',
    ]) {
      expect(types).toContain(expected);
    }
  });

  test('Txt node documents text and fontSize props', () => {
    const {nodeTypes} = listNodeTypes();
    const txt = nodeTypes.find(n => n.type === 'Txt')!;
    expect(txt.keyProps).toContain('text');
    expect(txt.keyProps).toContain('fontSize');
    expect(txt.keyProps).toContain('fill');
  });

  test('Rect node documents fill, stroke, radius', () => {
    const {nodeTypes} = listNodeTypes();
    const rect = nodeTypes.find(n => n.type === 'Rect')!;
    expect(rect.keyProps).toContain('fill');
    expect(rect.keyProps).toContain('stroke');
    expect(rect.keyProps).toContain('radius');
  });

  test('commonProps covers transform and appearance', () => {
    const {commonProps} = listNodeTypes();
    expect(commonProps.transform).toContain('position');
    expect(commonProps.transform).toContain('rotation');
    expect(commonProps.appearance).toContain('opacity');
    expect(commonProps.appearance).toContain('zIndex');
  });

  test('commonProps.propValueEncoding documents Vector2 and Color', () => {
    const {commonProps} = listNodeTypes();
    const enc = commonProps.propValueEncoding;
    expect(enc.Vector2).toContain('[x, y]');
    expect(enc.Color).toContain('CSS');
  });

  test('all type names are unique', () => {
    const types = NODE_TYPES.map(n => n.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  test('COMMON_PROPS is the same reference returned by listNodeTypes', () => {
    expect(listNodeTypes().commonProps).toBe(COMMON_PROPS);
  });
});
