import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Writes a temporary Vite-compatible project file that imports
 * `createScenesFromJSON` with the given scene definition inlined.
 *
 * Returns the path to the temp file and a cleanup function.
 */
export function writeTempProject(sceneDefinition: unknown): {
  projectFile: string;
  cleanup: () => void;
} {
  // Write the temp file inside the caller's cwd so that Vite's module
  // resolution can walk up the directory tree and find node_modules.
  const id = crypto.randomBytes(6).toString('hex');
  const dir = path.join(process.cwd(), '.reelgen-tmp', id);
  fs.mkdirSync(dir, {recursive: true});
  const projectFile = path.join(dir, 'project.ts');

  const source = `
import { makeProject } from '@reelgen/core';
import { createScenesFromJSON } from '@reelgen/scene-builder';

const definition = ${JSON.stringify(sceneDefinition, null, 2)};
const { scenes, settings } = createScenesFromJSON(definition);

export default makeProject({
  name: 'mcp-render',
  scenes,
  settings: {
    shared: {
      size: settings?.width && settings?.height
        ? { x: settings.width, y: settings.height }
        : { x: 1920, y: 1080 },
    },
    rendering: {
      fps: settings?.fps ?? 30,
    },
  },
});
`.trimStart();

  fs.writeFileSync(projectFile, source, 'utf8');

  return {
    projectFile,
    cleanup: () => {
      try {
        fs.rmSync(dir, {recursive: true, force: true});
      } catch {
        // best-effort cleanup
      }
    },
  };
}
