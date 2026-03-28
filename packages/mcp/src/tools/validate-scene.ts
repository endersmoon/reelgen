import {z} from 'zod';
import {validateSceneDefinition} from '@reelgen/scene-builder/validation';

export const validateSceneInputSchema = z.object({
  definition: z.record(z.unknown()).describe(
    'The JSON scene definition to validate.',
  ),
});

export type ValidateSceneInput = z.infer<typeof validateSceneInputSchema>;

export interface ValidateSceneOutput {
  valid: boolean;
  errors?: string[];
}

export function validateScene(input: ValidateSceneInput): ValidateSceneOutput {
  try {
    validateSceneDefinition(input.definition);
    return {valid: true};
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown validation error';
    // ZodError messages are multi-line — split into individual issues
    const errors = message
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    return {valid: false, errors};
  }
}
