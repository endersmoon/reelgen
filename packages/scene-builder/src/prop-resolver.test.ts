import {describe, expect, test} from 'vitest';
import {Vector2} from '@reelgen/core';
import {resolveProp, resolveProps} from './prop-resolver';

describe('resolveProp', () => {
  test('converts [x, y] array to Vector2', () => {
    const result = resolveProp([100, -200]);
    expect(result).toBeInstanceOf(Vector2);
    expect((result as Vector2).x).toBe(100);
    expect((result as Vector2).y).toBe(-200);
  });

  test('converts [0, 0] to Vector2 zero', () => {
    const result = resolveProp([0, 0]);
    expect(result).toBeInstanceOf(Vector2);
    expect((result as Vector2).x).toBe(0);
    expect((result as Vector2).y).toBe(0);
  });

  test('passes through numbers', () => {
    expect(resolveProp(42)).toBe(42);
    expect(resolveProp(0)).toBe(0);
    expect(resolveProp(-1.5)).toBe(-1.5);
  });

  test('passes through strings', () => {
    expect(resolveProp('#ffffff')).toBe('#ffffff');
    expect(resolveProp('hello')).toBe('hello');
  });

  test('passes through booleans', () => {
    expect(resolveProp(true)).toBe(true);
    expect(resolveProp(false)).toBe(false);
  });

  test('passes through null and undefined', () => {
    expect(resolveProp(null)).toBe(null);
    expect(resolveProp(undefined)).toBe(undefined);
  });

  test('does not convert a 2-element array of non-numbers', () => {
    const arr = ['a', 'b'];
    expect(resolveProp(arr)).toBe(arr);
  });

  test('does not convert arrays with length != 2', () => {
    const arr3 = [1, 2, 3];
    expect(resolveProp(arr3)).toBe(arr3);
    const arr1 = [1];
    expect(resolveProp(arr1)).toBe(arr1);
  });
});

describe('resolveProps', () => {
  test('converts position prop to Vector2', () => {
    const result = resolveProps({position: [10, 20], opacity: 0.5});
    expect(result.position).toBeInstanceOf(Vector2);
    expect(result.opacity).toBe(0.5);
  });

  test('leaves non-vector props unchanged', () => {
    const result = resolveProps({
      text: 'hello',
      fontSize: 48,
      fill: '#000',
    });
    expect(result).toEqual({text: 'hello', fontSize: 48, fill: '#000'});
  });

  test('handles empty props', () => {
    expect(resolveProps({})).toEqual({});
  });
});
