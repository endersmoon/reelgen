import path from 'path';
import type {Plugin} from 'vite';
import {
  assetsPlugin,
  editorPlugin,
  metaPlugin,
  metricsPlugin,
  projectsPlugin,
  settingsPlugin,
  webglPlugin,
} from './partials';
import type {PluginOptions} from './plugins';
import {PLUGIN_OPTIONS, isPlugin} from './plugins';
import {createStandaloneServer} from './standalone-server';
import {getProjects} from './utils';

export interface MotionCanvasPluginConfig {
  /**
   * The import path of the project file or an array of paths.
   * Also supports globs.
   *
   * @remarks
   * Each file must contain a default export exposing an instance of the
   * {@link Project} class.
   *
   * @example
   * ```ts
   * motionCanvas({
   *   project: [
   *     './src/firstProject.ts',
   *     './src/secondProject.ts',
   *   ]
   * })
   * ```
   *
   * @defaultValue './src/project.ts'
   */
  project?: string | string[];
  /**
   * A directory path to which the animation will be rendered.
   *
   * @defaultValue './output'
   */
  output?: string;
  /**
   * Defines which assets should be buffered before being sent to the browser.
   *
   * @remarks
   * Streaming larger assets directly from the drive may cause issues with other
   * applications. For instance, if an audio file is being used in the project,
   * Adobe Audition will perceive it as "being used by another application"
   * and refuse to override it.
   *
   * Buffered assets are first loaded to the memory and then streamed from
   * there. This leaves the original files open for modification with hot module
   * replacement still working.
   *
   * @defaultValue /^$/
   */
  bufferedAssets?: RegExp | false;
  /**
   * The import path of the editor package.
   *
   * @remarks
   * This path will be resolved using Node.js module resolution rules.
   * It should lead to a directory containing the following files:
   * - `editor.html` - The HTML template for the editor.
   * - `styles.css` - The editor styles.
   * - `main.js` - A module exporting necessary factory functions.
   *
   * `main.js` should export the following functions:
   * - `editor` - Receives the project factory as its first argument and creates
   *              the user interface.
   * - `index` - Receives a list of all projects as its first argument and
   *             creates the initial page for selecting a project.
   *
   * @defaultValue '\@revideo/ui'
   */
  editor?: string;

  /**
   * Build the project to run in the editor.
   */
  buildForEditor?: boolean;

  /**
   * Enable render mode to exclude editor-only plugins.
   *
   * @remarks
   * When set to `true`, the following plugins are excluded:
   * - `editorPlugin` — serves editor HTML (not needed for headless rendering)
   * - `assetsPlugin` — HMR-based asset watching (no HMR in render mode)
   * - `metricsPlugin` — telemetry for editor startup
   * - `settingsPlugin` — editor settings virtual module
   *
   * The remaining plugins (`metaPlugin`, `projectsPlugin`, `webglPlugin`, and
   * the main `revideo` plugin with its standalone backend server) are always
   * included.
   *
   * @defaultValue false
   */
  renderMode?: boolean;
}

export default ({
  project = './src/project.ts',
  output = './output',
  bufferedAssets = /^$/,
  editor = '@revideo/ui',
  buildForEditor,
  renderMode = false,
}: MotionCanvasPluginConfig = {}): Plugin[] => {
  const plugins: PluginOptions[] = [];
  const outputPath = path.resolve(output);
  const projects = getProjects(project);

  let backendServerPort = 0;

  const corePlugins: Plugin[] = [
    {
      name: 'revideo',
      async configResolved(resolvedConfig) {
        plugins.push(
          ...resolvedConfig.plugins
            .filter(isPlugin)
            .map(plugin => plugin[PLUGIN_OPTIONS]),
        );
        await Promise.all(
          plugins.map(plugin =>
            plugin.config?.({
              output: outputPath,
              projects: projects.list,
            }),
          ),
        );
      },
      async configureServer() {
        // Start the standalone backend server alongside Vite
        const server = await createStandaloneServer({outputPath});
        backendServerPort = server.port;
      },
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            attrs: {type: 'module'},
            children: `window.__REVIDEO_BACKEND_PORT__ = ${backendServerPort};`,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
    metaPlugin(),
    projectsPlugin({projects, plugins, buildForEditor}),
    webglPlugin(),
  ];

  if (!renderMode) {
    corePlugins.push(
      settingsPlugin(),
      // Extracted to standalone server: exporterPlugin, ffmpegBridgePlugin,
      // wasmExporterPlugin, rivePlugin
      editorPlugin({editor, projects}),
      assetsPlugin({bufferedAssets}),
      metricsPlugin(),
    );
  }

  return corePlugins;
};
