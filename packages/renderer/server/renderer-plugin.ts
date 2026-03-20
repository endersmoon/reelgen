import type {RenderVideoUserProjectSettings} from '@revideo/core';
import type {FfmpegSettings} from '@revideo/ffmpeg';
import {ffmpegSettings} from '@revideo/ffmpeg';
import {standaloneServerPort} from '@revideo/vite-plugin';
import * as fs from 'fs';
import * as path from 'path';
import type {Plugin, ViteDevServer} from 'vite';

const RendererPath = path.resolve(__dirname, '../renderer.html');
const Content = fs.readFileSync(RendererPath, 'utf-8');
const HtmlParts = Content.toString().split('{{source}}');

function createHtml(src: string, backendPort?: number) {
  const portScript = backendPort
    ? `\n    <script>window.__REVIDEO_BACKEND_PORT__ = ${backendPort};</script>`
    : '';
  const html = HtmlParts[0] + src + HtmlParts[1];
  // Inject port script before the main <script> in the body
  return html.replace(
    '<script type="module"',
    `${portScript}\n    <script type="module"`,
  );
}

function escapeSpecialChars(_: string, value: string) {
  if (typeof value === 'string') {
    return value
      .replace(/[\\]/g, '\\\\')
      .replace(/[\"]/g, '\\"')
      .replace(/[\/]/g, '\\/')
      .replace(/[\b]/g, '\\b')
      .replace(/[\f]/g, '\\f')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r')
      .replace(/[\t]/g, '\\t');
  }

  return value;
}

/**
 * Mutable configuration for the renderer plugin.
 * When reusing a Vite server across renders (ServerPool), update these
 * properties before each render and call `invalidate()` to force the
 * virtual module to be re-evaluated.
 */
export interface RendererConfig {
  projectSettings?: RenderVideoUserProjectSettings;
  variables?: Record<string, unknown>;
  ffmpegSettings?: FfmpegSettings;
  projectFile?: string;
}

/**
 * Handle returned by `rendererPlugin` that allows invalidating the virtual
 * module when the config changes (e.g., different variables for a new render).
 */
export interface RendererPluginHandle {
  plugin: Plugin;
  /**
   * Invalidate the virtual renderer module so Vite re-evaluates it
   * with the current config values. Call this after updating `config`
   * properties when reusing a server across renders.
   */
  invalidate: () => void;
}

/**
 * Creates the renderer Vite plugin.
 *
 * @remarks
 * Accepts a mutable `RendererConfig` object. The `load` hook reads from
 * this object at call time, so updating its properties and calling
 * `handle.invalidate()` causes the next page load to use the new values.
 * This enables server reuse across renders with different variables.
 */
export function rendererPlugin(config: RendererConfig): RendererPluginHandle;
/**
 * Creates the renderer Vite plugin (legacy positional API).
 * @deprecated Use the config object overload for new code.
 */
export function rendererPlugin(
  projectSettings?: RenderVideoUserProjectSettings,
  variables?: Record<string, unknown>,
  customFfmpegSettings?: FfmpegSettings,
  projectFile?: string,
): Plugin;
export function rendererPlugin(
  configOrSettings?: RendererConfig | RenderVideoUserProjectSettings,
  variables?: Record<string, unknown>,
  customFfmpegSettings?: FfmpegSettings,
  projectFile?: string,
): Plugin | RendererPluginHandle {
  // Determine if called with new config object or legacy positional args
  const isConfigObject =
    configOrSettings !== undefined &&
    configOrSettings !== null &&
    ('projectFile' in configOrSettings ||
      'variables' in configOrSettings ||
      'ffmpegSettings' in configOrSettings ||
      'projectSettings' in configOrSettings) &&
    // Distinguish from RenderVideoUserProjectSettings which may have 'exporter'
    !('exporter' in configOrSettings) &&
    !('range' in configOrSettings) &&
    !('background' in configOrSettings) &&
    !('size' in configOrSettings);

  let config: RendererConfig;
  let returnHandle: boolean;

  if (isConfigObject) {
    config = configOrSettings as RendererConfig;
    returnHandle = true;
  } else {
    config = {
      projectSettings: configOrSettings as
        | RenderVideoUserProjectSettings
        | undefined,
      variables,
      ffmpegSettings: customFfmpegSettings,
      projectFile,
    };
    returnHandle = false;
  }

  // Apply ffmpeg settings
  if (config.ffmpegSettings?.ffmpegPath) {
    ffmpegSettings.setFfmpegPath(config.ffmpegSettings.ffmpegPath);
  }
  if (config.ffmpegSettings?.ffprobePath) {
    ffmpegSettings.setFfprobePath(config.ffmpegSettings.ffprobePath);
  }
  if (config.ffmpegSettings?.ffmpegLogLevel) {
    ffmpegSettings.setLogLevel(config.ffmpegSettings.ffmpegLogLevel);
  }

  let server: ViteDevServer | null = null;

  const plugin: Plugin = {
    name: 'revideo-renderer-plugin',

    async load(id) {
      if (id.startsWith('\x00virtual:renderer')) {
        const projectSettingsString = config.projectSettings
          ? JSON.stringify(config.projectSettings)
          : JSON.stringify({});

        return `\
            import {render} from '@revideo/renderer/lib/client/render';
            import {Vector2} from '@revideo/core';
            import project from '${config.projectFile}';

            // Read video variables
            project.variables = ${config.variables ? `JSON.parse(\`${JSON.stringify(config.variables, escapeSpecialChars)}\`)` : 'project.variables'};

            // Check range of frames to render
            const url = new URL(window.location.href);

            const fileNameEscaped = url.searchParams.get('fileName');
            const workerId = parseInt(url.searchParams.get('workerId'));
            const totalNumOfWorkers = parseInt(url.searchParams.get('totalNumOfWorkers'));
            const hiddenFolderIdEscaped = url.searchParams.get('hiddenFolderId');

            const fileName = decodeURIComponent(fileNameEscaped);
            const hiddenFolderId = decodeURIComponent(hiddenFolderIdEscaped);

            // Overwrite project name so that the rendered videos don't overwrite each other
            project.name = fileName;

            render(project, workerId, totalNumOfWorkers, hiddenFolderId, JSON.parse(\`${projectSettingsString}\`));
            `;
      }
    },

    configureServer(s) {
      server = s;
      s.middlewares.use('/render', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          createHtml(
            `/@id/__x00__virtual:renderer`,
            standaloneServerPort || undefined,
          ),
        );
      });
    },
  };

  if (returnHandle) {
    return {
      plugin,
      invalidate() {
        if (server) {
          const mod = server.moduleGraph.getModuleById(
            '\x00virtual:renderer',
          );
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }
        }
      },
    };
  }

  return plugin;
}
