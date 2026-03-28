import {Vector2} from '@reelgen/core';

/**
 * Converts a JSON prop value into the appropriate Reelgen type.
 *
 * - `[x, y]` → `Vector2`
 * - Everything else passes through (strings, numbers, booleans).
 */
export function resolveProp(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return new Vector2(value[0], value[1]);
  }
  return value;
}

/**
 * Resolves all props in a descriptor, converting values as needed.
 */
export function resolveProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    resolved[key] = resolveProp(value);
  }
  return resolved;
}
