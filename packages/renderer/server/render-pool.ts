import type {LaunchOptions} from 'puppeteer';
import {BrowserPool} from './browser-pool';
import type {BrowserPoolOptions} from './browser-pool';
import {ServerPool} from './server-pool';
import type {ServerPoolOptions} from './server-pool';

export interface RenderPoolOptions {
  /** Maximum number of Chrome instances to keep warm. Defaults to 4. */
  maxBrowsers?: number;
  /** Puppeteer launch options for all pooled browsers. */
  puppeteerLaunchOptions?: LaunchOptions;
  /** Maximum number of Vite servers per project file. Defaults to 2. */
  maxServersPerProject?: number;
}

/**
 * A combined pool of Puppeteer browsers and Vite dev servers.
 *
 * @remarks
 * Use this to dramatically reduce render latency when rendering
 * multiple videos (especially of the same template). Browsers and
 * servers are kept warm and reused across renders.
 *
 * @example
 * ```ts
 * const pool = createRenderPool({maxBrowsers: 4});
 *
 * // Render multiple videos — browsers and servers are reused
 * await renderVideo({projectFile: './src/project.ts', variables: data1, settings: {pool}});
 * await renderVideo({projectFile: './src/project.ts', variables: data2, settings: {pool}});
 *
 * // Clean up when done
 * await pool.dispose();
 * ```
 */
export class RenderPool {
  public readonly browsers: BrowserPool;
  public readonly servers: ServerPool;

  public constructor(options?: RenderPoolOptions) {
    const browserOpts: BrowserPoolOptions = {
      maxSize: options?.maxBrowsers,
      launchOptions: options?.puppeteerLaunchOptions,
    };
    const serverOpts: ServerPoolOptions = {
      maxServersPerProject: options?.maxServersPerProject,
    };
    this.browsers = new BrowserPool(browserOpts);
    this.servers = new ServerPool(serverOpts);
  }

  /** Dispose both browser and server pools. */
  public async dispose(): Promise<void> {
    await Promise.all([this.browsers.dispose(), this.servers.dispose()]);
  }
}

/**
 * Create a render pool for reusing browsers and Vite servers across renders.
 *
 * @example
 * ```ts
 * const pool = createRenderPool({maxBrowsers: 2});
 *
 * // Use with renderVideo
 * await renderVideo({
 *   projectFile: './src/project.ts',
 *   variables: {title: 'Hello'},
 *   settings: {pool},
 * });
 *
 * await pool.dispose();
 * ```
 */
export function createRenderPool(
  options?: RenderPoolOptions,
): RenderPool {
  return new RenderPool(options);
}
