import type {
  FfmpegExporterOptions,
  RenderVideoUserProjectSettings,
} from '@reelgen/core';
import type {FfmpegSettings} from '@reelgen/ffmpeg';
import {
  audioCodecs,
  concatenateMedia,
  createSilentAudioFile,
  doesFileExist,
  extensions,
  getVideoDuration,
  mergeAudioWithVideo,
} from '@reelgen/ffmpeg';
import motionCanvas from '@reelgen/vite-plugin';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type {Browser, LaunchOptions} from 'puppeteer';
import puppeteer from 'puppeteer';
import type {InlineConfig, ServerOptions, ViteDevServer} from 'vite';
import {createServer} from 'vite';
import type {BrowserPool} from './browser-pool';
import type {RenderPool} from './render-pool';
import {rendererPlugin} from './renderer-plugin';
import type {ServerPool} from './server-pool';
import {getParamDefaultsAndCheckValidity} from './validate-settings';

export interface RenderSettings {
  // Name of the video file (default is 'video.mp4')
  outFile?: `${string}.mp4` | `${string}.webm` | `${string}.mov`;

  // Folder where the video will be saved (default is './out')
  outDir?: string;

  ffmpeg?: FfmpegSettings;

  puppeteer?: LaunchOptions;

  workers?: number;
  logProgress?: boolean;

  projectSettings?: RenderVideoUserProjectSettings;

  /**
   * When using multiple workers, this is the port of the first worker.
   * Each worker will increment the port by 1.
   * If the port is already in use, the next port will be used.
   *
   * Default is 9000
   */
  viteBasePort?: number;

  /**
   * @deprecated Use `viteConfig.server` instead.
   */
  viteServerOptions?: Omit<ServerOptions, 'port'>;
  viteConfig?: InlineConfig;
  progressCallback?: (worker: number, progress: number) => void;

  /**
   * A combined render pool (browsers + servers) for reuse across renders.
   * Takes precedence over individual `browserPool` / `serverPool` options.
   *
   * @example
   * ```ts
   * const pool = createRenderPool({maxBrowsers: 4});
   * await renderVideo({projectFile: './src/project.ts', settings: {pool}});
   * await pool.dispose();
   * ```
   */
  pool?: RenderPool;

  /**
   * A browser pool for reusing Chrome instances across renders.
   * Ignored if `pool` is provided.
   */
  browserPool?: BrowserPool;

  /**
   * A server pool for reusing Vite dev servers across renders.
   * Ignored if `pool` is provided.
   */
  serverPool?: ServerPool;
}

/**
 * We pass a lot of render settings to the client side of the renderer
 * via the URL. This function builds the URL with the necessary parameters.
 */
function buildUrl(
  port: number,
  fileName: string,
  workerId: number,
  totalNumOfWorkers: number,
  hiddenFolderId: string,
) {
  const fileNameEscaped = encodeURIComponent(fileName);
  const hiddenFolderIdEscaped = encodeURIComponent(hiddenFolderId);

  return `http://localhost:${port}/render?fileName=${fileNameEscaped}&workerId=${workerId}&totalNumOfWorkers=${totalNumOfWorkers}&hiddenFolderId=${hiddenFolderIdEscaped}`;
}

/**
 * Starts the vite server and creates a puppeteer browser instance.
 * When pools are provided, resources are acquired from them instead of
 * being created fresh.
 */
async function initBrowserAndServer(
  fixedPort: number,
  projectFile: string,
  outputFolderName: string,
  settings: RenderSettings,
  variables?: Record<string, unknown>,
): Promise<{
  browser: Browser;
  server: ViteDevServer;
  resolvedPort: number;
  releaseBrowser: () => Promise<void>;
  releaseServer: () => void;
}> {
  const browserPool = settings.pool?.browsers ?? settings.browserPool;
  const serverPool = settings.pool?.servers ?? settings.serverPool;

  // Acquire or create browser
  const browserPromise = browserPool
    ? browserPool.acquire()
    : (() => {
        const args = settings.puppeteer?.args ?? [];
        args.includes('--single-process') || args.push('--single-process');
        return puppeteer.launch({
          headless: true,
          ...settings.puppeteer,
          args,
        });
      })();

  // Acquire or create server
  const serverPromise = serverPool
    ? serverPool.acquire(
        projectFile,
        outputFolderName,
        fixedPort,
        settings.projectSettings,
        variables,
        settings.ffmpeg,
      )
    : (() => {
        const resolvedProjectPath = path.join(process.cwd(), projectFile);
        return createServer({
          configFile: false,
          plugins: [
            motionCanvas({
              project: resolvedProjectPath,
              output: outputFolderName,
              renderMode: true,
            }),
            rendererPlugin(
              settings.projectSettings,
              variables,
              settings.ffmpeg,
              projectFile,
            ),
          ],
          ...settings.viteConfig,
          server: {
            port: fixedPort,
            hmr: false,
            watch: null,
            ...settings.viteServerOptions,
            ...settings.viteConfig?.server,
          },
        }).then(s => s.listen());
      })();

  const [browser, serverResult] = await Promise.all([
    browserPromise,
    serverPromise,
  ]);

  // Normalize server result (ServerPool returns {server, port}, direct createServer returns ViteDevServer)
  const server =
    'server' in serverResult
      ? (serverResult as {server: ViteDevServer; port: number}).server
      : (serverResult as ViteDevServer);

  if (!server.httpServer) {
    throw new Error('HTTP server is not initialized');
  }

  let resolvedPort: number;
  if ('port' in serverResult && typeof serverResult.port === 'number') {
    resolvedPort = serverResult.port;
  } else {
    const address = server.httpServer.address();
    resolvedPort =
      address && typeof address === 'object' ? address.port : fixedPort;
  }

  // Build release callbacks
  const releaseBrowser = browserPool
    ? () => browserPool.release(browser)
    : () => browser.close();

  const releaseServer = serverPool
    ? () => serverPool.release(server)
    : () => {
        server.close();
      };

  return {browser, server, resolvedPort, releaseBrowser, releaseServer};
}

function trackProgress(
  tracker: Map<number, number>,
  id: number,
  progress: number,
) {
  tracker.set(id, progress);
}

/**
 * Navigates to the URL and renders the video on the page.
 */
async function renderVideoOnPage(
  id: number,
  browser: Browser,
  server: ViteDevServer,
  url: string,
  progressTracker: Map<number, number>,
  releaseBrowser: () => Promise<void>,
  releaseServer: () => void,
  progressCallback?: (worker: number, progress: number) => void,
  logProgress?: boolean,
) {
  function printProgress() {
    let line = '';
    for (const [key, value] of progressTracker.entries()) {
      line += `Render progress, worker ${key}: ${(value * 100).toFixed(0)}% `;
    }

    if (line === '') {
      return;
    }

    console.log(line);
  }

  const interval = setInterval(() => {
    printProgress();
  }, 1000);

  const page = await browser.newPage();
  if (!server.httpServer) {
    throw new Error('HTTP server is not initialized');
  }
  const address = server.httpServer.address();
  const port = address && typeof address === 'object' ? address.port : null;
  if (port === null) {
    throw new Error('Server address is null');
  }

// Attach logs from puppeteer to the console
  page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i) {
      const message = msg.args()[i];
      if (message.toString().includes('[vite]')) {
        continue;
      }

      console.log(`Worker ${id}: ${msg.args()[i]}`);
    }
  });

  page.exposeFunction('logProgress', (progress: number) => {
    if (progressCallback) {
      progressCallback(id, progress);
    }
    if (logProgress) {
      trackProgress(progressTracker, id, progress);
    }
  });

  const renderingComplete = new Promise<void>((resolve, reject) => {
    page.exposeFunction('onRenderComplete', async () => {
      await releaseBrowser();
      releaseServer();
      clearInterval(interval);
      resolve();
    });

    page.exposeFunction('onRenderFailed', async (errorMessage: string) => {
      await releaseBrowser();
      releaseServer();
      console.error('Rendering failed:', errorMessage);
      clearInterval(interval);
      reject(new Error(errorMessage));
    });

    page.exposeFunction('browserError', (message: string) => {
      reject(new Error(message));
    });
  });

  await page.goto(url);

  return renderingComplete;
}

/**
 * Initializes the browser and starts rendering the video
 */
async function initializeBrowserAndStartRendering(
  projectFile: string,
  outputFileName: string,
  outputFolderName: string,
  i: number,
  numOfWorkers: number,
  settings: RenderSettings,
  hiddenFolderId: string,
  variables?: Record<string, unknown>,
  progressCallback?: (worker: number, progress: number) => void,
) {
  const port =
    (settings.viteBasePort !== undefined ? settings.viteBasePort : 9000) + i;

  const progressTracker = new Map<number, number>();

  const {browser, server, resolvedPort, releaseBrowser, releaseServer} =
    await initBrowserAndServer(
      port,
      projectFile,
      outputFolderName,
      settings,
      variables,
    );

  const url = buildUrl(
    resolvedPort,
    `${outputFileName}-${i}`,
    i,
    numOfWorkers,
    hiddenFolderId,
  );

  return renderVideoOnPage(
    i,
    browser,
    server,
    url,
    progressTracker,
    releaseBrowser,
    releaseServer,
    progressCallback,
    settings.logProgress,
  );
}

/**
 * Collects audio and video files from each worker and returns them.
 * If audio file does not exist, creates a silent audio file with the same duration as the video file.
 */
async function collectAudioAndVideoFiles(
  numOfWorkers: number,
  outputFileName: string,
  hiddenFolderId: string,
  format: FfmpegExporterOptions['format'],
) {
  const audioFiles = [];
  const videoFiles = [];
  for (let i = 0; i < numOfWorkers; i++) {
    const videoFilePath = `${os.tmpdir()}/revideo-${outputFileName}-${i}-${hiddenFolderId}/visuals.${extensions[format]}`;
    const audioFilePath = `${os.tmpdir()}/revideo-${outputFileName}-${i}-${hiddenFolderId}/audio.wav`;

    if (!(await doesFileExist(audioFilePath))) {
      const videoDuration = await getVideoDuration(videoFilePath);
      await createSilentAudioFile(audioFilePath, videoDuration);
    }
    videoFiles.push(videoFilePath);
    audioFiles.push(audioFilePath);
  }

  return {audioFiles, videoFiles};
}

/**
 * Concatenates audio and video files and merges them into a single video file.
 */
async function concatenateAudioAndVideoFiles(
  outputFileName: string,
  outputFolder: string,
  audioFiles: string[],
  videoFiles: string[],
  format: FfmpegExporterOptions['format'],
) {
  await concatenateMedia(
    videoFiles,
    path.join(outputFolder, `${outputFileName}-visuals.${extensions[format]}`),
  );
  await concatenateMedia(
    audioFiles,
    path.join(outputFolder, `${outputFileName}-audio.wav`),
  );
  await mergeAudioWithVideo(
    path.join(outputFolder, `${outputFileName}-audio.wav`),
    path.join(outputFolder, `${outputFileName}-visuals.${extensions[format]}`),
    path.join(outputFolder, `${outputFileName}.${extensions[format]}`),
    audioCodecs[format],
  );
}

/**
 * Deletes all partial files after concatenation is done
 */
async function cleanup(
  outputFileName: string,
  outputFolderName: string,
  numOfWorkers: number,
  hiddenFolderId: string,
  format: FfmpegExporterOptions['format'],
) {
  const cleanupFolders = [];
  const cleanupFiles = [];
  for (let i = 0; i < numOfWorkers; i++) {
    cleanupFolders.push(
      `${os.tmpdir()}/revideo-${outputFileName}-${i}-${hiddenFolderId}`,
    );
    cleanupFiles.push(
      path.join(
        process.cwd(),
        outputFolderName,
        `${outputFileName}-${i}.${extensions[format]}`,
      ),
    );
  }

  cleanupFiles.push(
    path.join(process.cwd(), outputFolderName, `${outputFileName}-audio.wav`),
  );
  cleanupFiles.push(
    path.join(
      process.cwd(),
      outputFolderName,
      `${outputFileName}-visuals.${extensions[format]}`,
    ),
  );

  const folderCleanupPromises = cleanupFolders.map(folder =>
    fs.promises.rm(folder, {recursive: true, force: true}).catch(() => {}),
  );

  const fileCleanupPromises = cleanupFiles.map(file =>
    fs.promises.unlink(file).catch(() => {}),
  );

  await Promise.all([...folderCleanupPromises, ...fileCleanupPromises]);
}

const defaultSettings: RenderSettings = {
  projectSettings: {
    exporter: {
      name: '@reelgen/core/wasm',
    },
  },
};

interface RenderVideoParams {
  projectFile: string;
  variables?: Record<string, unknown>;
  settings?: RenderSettings;
}

/**
 * Renders a video to a file.
 * @param projectFile - Path to the project.ts file.
 * @param variables - Variables to pass to your project (see https://docs.re.video/parameterized-video)
 * @param progressCallback - Callback function to track rendering progress. Progress is a number between 0 and 1.
 * @param settings - Settings for the rendering process.
 * @returns - Path to the rendered video file.
 */
export async function renderVideo({
  projectFile,
  variables,
  settings = defaultSettings,
}: RenderVideoParams): Promise<string> {
  const {
    outputFileName,
    outputFolderName,
    numOfWorkers,
    hiddenFolderId,
    format,
  } = getParamDefaultsAndCheckValidity(settings);

  // Start rendering
  const renderPromises = [];
  for (let i = 0; i < numOfWorkers; i++) {
    renderPromises.push(
      initializeBrowserAndStartRendering(
        projectFile,
        outputFileName,
        outputFolderName,
        i,
        numOfWorkers,
        settings,
        hiddenFolderId,
        variables,
        settings.progressCallback,
      ),
    );
  }

  // Wait for workers to finish rendering
  await Promise.all(renderPromises);

  // Collect and concatenate audio and video files
  const {audioFiles, videoFiles} = await collectAudioAndVideoFiles(
    numOfWorkers,
    outputFileName,
    hiddenFolderId,
    format,
  );
  await concatenateAudioAndVideoFiles(
    outputFileName,
    outputFolderName,
    audioFiles,
    videoFiles,
    format,
  );
  await cleanup(
    outputFileName,
    outputFolderName,
    numOfWorkers,
    hiddenFolderId,
    format,
  );

  return path.join(outputFolderName, `${outputFileName}.${extensions[format]}`);
}

interface RenderPartialVideoProps extends RenderVideoParams {
  workerId: number;
  numWorkers: number;
  settings?: Omit<RenderSettings, 'workers'>;
}

export const renderPartialVideo = async ({
  projectFile,
  variables,
  settings = defaultSettings,
  numWorkers,
  workerId,
}: RenderPartialVideoProps) => {
  const {outputFileName, outputFolderName, hiddenFolderId, format} =
    getParamDefaultsAndCheckValidity(settings);

  await initializeBrowserAndStartRendering(
    projectFile,
    outputFileName,
    outputFolderName,
    workerId,
    numWorkers,
    settings,
    hiddenFolderId,
    variables,
    settings.progressCallback,
  );

  const videoFilePath = `${os.tmpdir()}/revideo-${outputFileName}-${workerId}-${hiddenFolderId}/visuals.${extensions[format]}`;
  const audioFilePath = `${os.tmpdir()}/revideo-${outputFileName}-${workerId}-${hiddenFolderId}/audio.wav`;

  if (!(await doesFileExist(audioFilePath))) {
    const videoDuration = await getVideoDuration(videoFilePath);
    await createSilentAudioFile(audioFilePath, videoDuration);
  }

  return {audioFile: audioFilePath, videoFile: videoFilePath};
};
