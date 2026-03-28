import {describe, expect, test} from 'vitest';
import {linear} from '@reelgen/core';
import {getEasing} from './easing-map';

describe('getEasing', () => {
  test('returns linear when no name is given', () => {
    expect(getEasing()).toBe(linear);
    expect(getEasing(undefined)).toBe(linear);
  });

  test('returns linear for the "linear" name', () => {
    expect(getEasing('linear')).toBe(linear);
  });

  test('falls back to linear for unknown names', () => {
    expect(getEasing('nonexistent')).toBe(linear);
  });

  test.each([
    'easeInQuad',
    'easeOutQuad',
    'easeInOutQuad',
    'easeInCubic',
    'easeOutCubic',
    'easeInOutCubic',
    'easeInQuart',
    'easeOutQuart',
    'easeInOutQuart',
    'easeInQuint',
    'easeOutQuint',
    'easeInOutQuint',
    'easeInSine',
    'easeOutSine',
    'easeInOutSine',
    'easeInExpo',
    'easeOutExpo',
    'easeInOutExpo',
    'easeInCirc',
    'easeOutCirc',
    'easeInOutCirc',
    'easeInBack',
    'easeOutBack',
    'easeInOutBack',
    'easeInElastic',
    'easeOutElastic',
    'easeInOutElastic',
    'easeInBounce',
    'easeOutBounce',
    'easeInOutBounce',
  ])('returns a function for "%s"', name => {
    const fn = getEasing(name);
    expect(typeof fn).toBe('function');
    // Easing functions map [0, 1] → [0, 1] at boundary values
    expect(fn(0)).toBeCloseTo(0, 5);
    expect(fn(1)).toBeCloseTo(1, 5);
  });
});
