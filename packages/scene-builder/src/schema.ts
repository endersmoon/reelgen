import {z} from 'zod';
import type {SceneDefinition} from './types';

const transitionSchema = z.object({
  type: z.enum(['fade', 'slide', 'zoomIn', 'zoomOut']),
  duration: z.number().positive().optional(),
  direction: z.enum(['top', 'right', 'bottom', 'left']).optional(),
  area: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});

const nodeDescriptorSchema: z.ZodType<
  import('./types').NodeDescriptor
> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    type: z.string(),
    props: z.record(z.unknown()).optional(),
    children: z.array(nodeDescriptorSchema).optional(),
  }),
);

const animationStepSchema = z.object({
  target: z.string(),
  prop: z.string(),
  to: z.unknown(),
  from: z.unknown().optional(),
  duration: z.number().nonnegative(),
  easing: z.string().optional(),
});

const parallelBlockSchema = z.object({
  parallel: z.array(animationStepSchema),
});

const waitStepSchema = z.object({
  type: z.literal('wait'),
  duration: z.number().nonnegative(),
});

const timelineEntrySchema = z.union([
  waitStepSchema,
  parallelBlockSchema,
  animationStepSchema,
]);

const sceneDescriptorSchema = z.object({
  id: z.string(),
  duration: z.number().positive().optional(),
  background: z.string().optional(),
  transition: transitionSchema.optional(),
  nodes: z.array(nodeDescriptorSchema),
  timeline: z.array(timelineEntrySchema),
});

const sceneSettingsSchema = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  fps: z.number().positive().optional(),
  background: z.string().optional(),
});

const sceneDefinitionSchema = z.object({
  settings: sceneSettingsSchema.optional(),
  scenes: z.array(sceneDescriptorSchema),
});

/**
 * Validates an unknown value against the scene definition schema.
 * Throws a `ZodError` with descriptive messages on failure.
 */
export function validateSceneDefinition(json: unknown): SceneDefinition {
  return sceneDefinitionSchema.parse(json) as SceneDefinition;
}
