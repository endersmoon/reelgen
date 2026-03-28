import * as path from 'path';
import {z} from 'zod';
import {renderVideo} from '@reelgen/renderer';
import {validateSceneDefinition} from '@reelgen/scene-builder/validation';
import {writeTempProject} from '../project-writer';

export const renderSceneInputSchema = z.object({
  definition: z.record(z.unknown()).describe(
    'The full JSON scene definition to render.',
  ),
  outDir: z
    .string()
    .optional()
    .describe('Output directory for the rendered video. Defaults to ./out'),
  outFile: z
    .string()
    .optional()
    .describe(
      'Output filename (must end in .mp4, .webm, or .mov). Defaults to video.mp4',
    ),
  workers: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Number of parallel render workers. Defaults to 1.'),
});

export type RenderSceneInput = z.infer<typeof renderSceneInputSchema>;

export interface RenderSceneOutput {
  videoPath: string;
  absolutePath: string;
}

export async function renderScene(
  input: RenderSceneInput,
): Promise<RenderSceneOutput> {
  // Validate first so we get a clear error before spinning up Puppeteer
  validateSceneDefinition(input.definition);

  const {projectFile, cleanup} = writeTempProject(input.definition);

  try {
    const outFile = (input.outFile ?? 'video.mp4') as `${string}.mp4`;
    const outDir = input.outDir ?? './out';

    // renderVideo expects a path relative to cwd; convert the absolute temp path
    const relativeProjectFile = path.relative(process.cwd(), projectFile);

    const videoPath = await renderVideo({
      projectFile: relativeProjectFile,
      settings: {
        outFile,
        outDir,
        workers: input.workers ?? 1,
        logProgress: false,
      },
    });

    return {
      videoPath,
      absolutePath: path.resolve(videoPath),
    };
  } finally {
    cleanup();
  }
}
