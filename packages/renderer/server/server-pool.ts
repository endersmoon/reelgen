import type {RenderVideoUserProjectSettings} from '@revideo/core';
import type {FfmpegSettings} from '@revideo/ffmpeg';
import motionCanvas from '@revideo/vite-plugin';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import type {ViteDevServer} from 'vite';
import {createServer} from 'vite';
import type {RendererConfig, RendererPluginHandle} from './renderer-plugin';
import {rendererPlugin} from './renderer-plugin';

interface PooledServer {
  server: ViteDevServer;
  port: number;
  projectFile: string;
  inUse: boolean;
  rendererConfig: RendererConfig;
  rendererHandle: RendererPluginHandle;
}

export interface ServerPoolOptions {
  /** Maximum number of Vite servers to keep per project file. Defaults to 2. */
  maxServersPerProject?: number;
}

/**
 * Pool of Vite dev servers that can be reused across renders.
 *
 * @remarks
 * Each server is keyed by the absolute project file path. When a server is
 * acquired for the same project file, its renderer plugin config is updated
 * with the new variables/settings and the virtual module is invalidated.
 * Vite's module transformation cache is preserved across renders via a
 * persistent `cacheDir`, dramatically reducing cold-start time for
 * subsequent renders of the same project.
 */
export class ServerPool {
  private servers = new Map<string, PooledServer[]>();
  private maxServersPerProject: number;

  public constructor(options?: ServerPoolOptions) {
    this.maxServersPerProject = options?.maxServersPerProject ?? 2;
  }

  /**
   * Acquire a Vite dev server for the given project file.
   * Reuses an existing idle server if available, otherwise creates a new one.
   */
  public async acquire(
    projectFile: string,
    outputFolderName: string,
    port: number,
    projectSettings?: RenderVideoUserProjectSettings,
    variables?: Record<string, unknown>,
    ffmpegSettings?: FfmpegSettings,
  ): Promise<{server: ViteDevServer; port: number}> {
    const resolvedProjectPath = path.join(process.cwd(), projectFile);
    const key = resolvedProjectPath;
    const pooled = this.servers.get(key) ?? [];

    // Try to find an idle server
    const idle = pooled.find(s => !s.inUse);
    if (idle) {
      idle.inUse = true;
      // Update the renderer config for this render
      idle.rendererConfig.projectSettings = projectSettings;
      idle.rendererConfig.variables = variables;
      idle.rendererConfig.ffmpegSettings = ffmpegSettings;
      idle.rendererConfig.projectFile = projectFile;
      // Invalidate the virtual module so the new config takes effect
      idle.rendererHandle.invalidate();
      return {server: idle.server, port: idle.port};
    }

    // Check if we can create a new server
    if (pooled.length >= this.maxServersPerProject) {
      // Wait for one to become available
      return new Promise(resolve => {
        const check = setInterval(() => {
          const available = pooled.find(s => !s.inUse);
          if (available) {
            clearInterval(check);
            available.inUse = true;
            available.rendererConfig.projectSettings = projectSettings;
            available.rendererConfig.variables = variables;
            available.rendererConfig.ffmpegSettings = ffmpegSettings;
            available.rendererConfig.projectFile = projectFile;
            available.rendererHandle.invalidate();
            resolve({server: available.server, port: available.port});
          }
        }, 50);
      });
    }

    // Create a new server
    const rendererConfig: RendererConfig = {
      projectSettings,
      variables,
      ffmpegSettings,
      projectFile,
    };
    const rendererHandle = rendererPlugin(rendererConfig);

    // Persistent cache directory keyed by project file
    const cacheKey = crypto
      .createHash('md5')
      .update(resolvedProjectPath)
      .digest('hex')
      .slice(0, 12);
    const cacheDir = path.join(
      os.tmpdir(),
      'revideo-vite-cache',
      cacheKey,
    );

    const server = await createServer({
      configFile: false,
      cacheDir,
      plugins: [
        motionCanvas({
          project: resolvedProjectPath,
          output: outputFolderName,
          renderMode: true,
        }),
        rendererHandle.plugin,
      ],
      server: {
        port,
        hmr: false,
        watch: null,
      },
    }).then(s => s.listen());

    if (!server.httpServer) {
      throw new Error('HTTP server is not initialized');
    }
    const address = server.httpServer.address();
    const resolvedPort =
      address && typeof address === 'object' ? address.port : 0;

    const entry: PooledServer = {
      server,
      port: resolvedPort,
      projectFile: resolvedProjectPath,
      inUse: true,
      rendererConfig,
      rendererHandle,
    };

    pooled.push(entry);
    this.servers.set(key, pooled);

    return {server, port: resolvedPort};
  }

  /**
   * Release a Vite dev server back to the pool.
   * The server remains running for future reuse.
   */
  public release(server: ViteDevServer): void {
    for (const pooled of this.servers.values()) {
      const entry = pooled.find(s => s.server === server);
      if (entry) {
        entry.inUse = false;
        return;
      }
    }
  }

  /**
   * Close all servers and dispose the pool.
   */
  public async dispose(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    for (const pooled of this.servers.values()) {
      for (const entry of pooled) {
        closePromises.push(entry.server.close());
      }
    }
    await Promise.all(closePromises);
    this.servers.clear();
  }

  /** Number of servers across all project files. */
  public get size(): number {
    let total = 0;
    for (const pooled of this.servers.values()) {
      total += pooled.length;
    }
    return total;
  }
}
