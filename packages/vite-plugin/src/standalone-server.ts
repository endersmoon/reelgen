import type {FFmpegExporterSettings} from '@reelgen/ffmpeg';
import {
  FFmpegExporterServer,
  VideoFrameExtractor,
  generateAudio,
  mergeMedia,
} from '@reelgen/ffmpeg';
import * as fs from 'fs';
import {existsSync, unlinkSync} from 'fs';
import type {IncomingMessage, ServerResponse} from 'http';
import {createServer} from 'http';
import mime from 'mime-types';
import * as os from 'os';
import * as path from 'path';
import {Readable} from 'stream';
import type {WebSocket} from 'ws';
import {WebSocketServer} from 'ws';
import {openInExplorer} from './openInExplorer';

interface StandaloneServerConfig {
  outputPath: string;
}

interface BrowserRequest {
  method: string;
  data: unknown;
}

interface WSMessage {
  type: string;
  data: unknown;
}

/**
 * The port of the currently running standalone backend server.
 * Set when `createStandaloneServer` is called; used by the renderer plugin
 * to inject the port into the renderer HTML.
 */
export let standaloneServerPort = 0;

/**
 * Creates and starts a standalone HTTP + WebSocket server for Revideo backend
 * operations. This server handles FFmpeg export, image export, WASM serving,
 * and video file uploads — all logic that does not depend on Vite APIs.
 *
 * @returns The port the server is listening on.
 */
export async function createStandaloneServer(
  config: StandaloneServerConfig,
): Promise<{port: number; close: () => void}> {
  const {outputPath} = config;
  const ffmpegBridge = new FFmpegBridgeHandler(outputPath);
  const imageExportHandler = new ImageExportHandler(outputPath);

  const httpServer = createServer(async (req, res) => {
    // CORS headers for cross-origin requests from Vite dev server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Frame-Width, X-Frame-Height',
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'X-Frame-Width, X-Frame-Height',
    );

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = req.url ?? '';

    try {
      // FFmpeg routes
      if (url === '/audio-processing/generate-audio') {
        await handlePostRequest(req, res, async data => {
          const {tempDir, assets, startFrame, endFrame, fps} = data;
          return generateAudio({
            outputDir: outputPath,
            tempDir,
            assets,
            startFrame,
            endFrame,
            fps,
          });
        });
        return;
      }

      if (url === '/audio-processing/merge-media') {
        await handlePostRequest(
          req,
          res,
          async ({outputFilename, tempDir, format}) =>
            mergeMedia(outputFilename, outputPath, tempDir, format),
        );
        return;
      }

      if (url === '/revideo-ffmpeg-decoder/video-frame') {
        await handlePostRequest(req, res, async data => {
          const {frame, width, height} =
            await ffmpegBridge.handleDecodeVideoFrame(data);
          res.setHeader('X-Frame-Width', width.toString());
          res.setHeader('X-Frame-Height', height.toString());
          res.setHeader('Content-Type', 'application/octet-stream');
          res.end(Buffer.from(frame as Uint8Array));
        });
        return;
      }

      if (url === '/revideo-ffmpeg-decoder/finished') {
        await handlePostRequest(req, res, async () => {
          await ffmpegBridge.handleRenderFinished();
        });
        return;
      }

      if (url === '/revideo-ffmpeg-decoder/download-video-chunks') {
        await handlePostRequest(req, res, async videoDurations => {
          await ffmpegBridge.handleDownloadVideoChunks(videoDurations);
          return {success: true, paths: []};
        });
        return;
      }

      // Image exporter: open output path
      if (url === '/__open-output-path') {
        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, {recursive: true});
        }
        openInExplorer(outputPath);
        res.end();
        return;
      }

      // WASM serving: mp4-wasm
      if (url === '/@mp4-wasm') {
        await serveWasm(res, () => {
          const dir = path.dirname(require.resolve('mp4-wasm'));
          return path.resolve(dir, 'mp4.wasm');
        });
        return;
      }

      // WASM serving: rive
      if (url === '/@rive-wasm') {
        await serveWasm(res, () => {
          const pkgPath =
            require.resolve('@rive-app/canvas-advanced/package.json');
          return path.join(path.dirname(pkgPath), 'rive.wasm');
        });
        return;
      }

      // Video file upload
      if (url === '/uploadVideoFile' && req.method === 'POST') {
        await handleVideoUpload(req, res);
        return;
      }

      // 404 for unknown routes
      res.statusCode = 404;
      res.end('Not Found');
    } catch (error) {
      console.error('Standalone server error:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // WebSocket server
  const wss = new WebSocketServer({server: httpServer});

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (raw: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(raw.toString());

        if (msg.type === 'revideo:ffmpeg-exporter') {
          const result = await ffmpegBridge.handleMessage(
            msg.data as BrowserRequest,
          );
          ws.send(
            JSON.stringify({type: 'revideo:ffmpeg-exporter-ack', data: result}),
          );
        } else if (msg.type === 'revideo:export') {
          const frame = await imageExportHandler.handleFrame(msg.data as any);
          ws.send(JSON.stringify({type: 'revideo:export-ack', data: {frame}}));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  return new Promise(resolve => {
    // Listen on port 0 to get a random available port
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      standaloneServerPort = port;
      console.log(`Revideo backend server listening on port ${port}`);
      resolve({
        port,
        close: () => {
          wss.close();
          httpServer.close();
        },
      });
    });
  });
}

// --- Helper functions ---

async function handlePostRequest(
  req: IncomingMessage,
  res: ServerResponse,
  handler: (data: any) => Promise<any>,
) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  try {
    const body: string = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk: string) => (data += chunk));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    const parsedBody = JSON.parse(body);
    const result = await handler(parsedBody);

    if (res.writableEnded) {
      return;
    }

    res.statusCode = 200;
    if (result) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
      return;
    }
    res.end('OK');
  } catch (error) {
    console.error('Error in request handler:', error);
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}

async function serveWasm(res: ServerResponse, getPath: () => string) {
  try {
    const wasmPath = getPath();
    const file = await fs.promises.readFile(wasmPath);
    res.setHeader('Content-Type', 'application/wasm');
    Readable.from(file).pipe(res);
  } catch (error) {
    console.error('Error serving WASM file:', error);
    res.statusCode = 500;
    res.end('Error serving WASM file');
  }
}

async function handleVideoUpload(req: IncomingMessage, res: ServerResponse) {
  try {
    const {IncomingForm} = await import('formidable');
    const form = new IncomingForm({maxFileSize: 1024 * 1024 * 1024 * 10});

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        res.statusCode = 500;
        res.end();
        return;
      }

      try {
        const tempDir = fields.tempDir![0];
        const file = files.file![0];
        const outputFilePath = path.join(os.tmpdir(), tempDir, 'visuals.mp4');
        const writeStream = fs.createWriteStream(outputFilePath);

        await new Promise((resolve, reject) => {
          fs.createReadStream(file.filepath)
            .pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });

        res.statusCode = 200;
        res.end();
      } catch (uploadErr) {
        console.error('Error uploading video:', uploadErr);
        res.statusCode = 500;
        res.end();
      }
    });
  } catch (importErr) {
    console.error('Error importing formidable:', importErr);
    res.statusCode = 500;
    res.end();
  }
}

// --- FFmpeg Bridge (extracted from ffmpegBridge.ts) ---

class FFmpegBridgeHandler {
  private process: FFmpegExporterServer | null = null;
  private videoFrameExtractors = new Map<string, VideoFrameExtractor>();

  public constructor(private readonly output: string) {}

  public async handleMessage({method, data}: BrowserRequest): Promise<any> {
    if (method === 'start') {
      try {
        this.process = new FFmpegExporterServer({
          ...(data as FFmpegExporterSettings),
          output: this.output,
        });
        return {
          status: 'success',
          method,
          data: await this.process.start(),
        };
      } catch (e: any) {
        return {
          status: 'error',
          method,
          message: e?.message,
        };
      }
    }

    if (!this.process) {
      return {
        status: 'error',
        method,
        message: 'The exporting process has not been started.',
      };
    }

    if (!(method in this.process)) {
      return {
        status: 'error',
        method,
        message: `Unknown method: "${method}".`,
      };
    }

    try {
      const result = await (this.process as any)[method](data);
      if (method === 'kill') {
        this.process = null;
      }
      return {
        status: 'success',
        method,
        data: result ?? {},
      };
    } catch (e: any) {
      return {
        status: 'error',
        method,
        message: e?.message,
      };
    }
  }

  public async handleDownloadVideoChunks(
    videoDurations: {src: string; startTime: number; endTime: number}[],
  ) {
    const downloadPromises = videoDurations.map(({src, startTime, endTime}) =>
      VideoFrameExtractor.downloadVideoChunk(src, startTime, endTime),
    );
    await Promise.all(downloadPromises);
  }

  public async handleDecodeVideoFrame(data: {
    id: string;
    filePath: string;
    startTime: number;
    duration: number;
    fps: number;
  }) {
    const id = data.filePath + '-' + data.id;
    let extractor = this.videoFrameExtractors.get(id);
    const frameDuration = 1 / data.fps;

    const isOldFrame =
      extractor &&
      Math.abs(data.startTime - extractor.getLastTime()) < frameDuration / 2;

    if (isOldFrame) {
      return {
        frame: extractor!.getLastFrame(),
        width: extractor!.getWidth(),
        height: extractor!.getHeight(),
      };
    }

    if (extractor && data.startTime + frameDuration < extractor.getTime()) {
      extractor.destroy();
      this.videoFrameExtractors.delete(id);
      extractor = undefined;
    }

    if (extractor && data.startTime > extractor.getTime() + frameDuration) {
      extractor.destroy();
      this.videoFrameExtractors.delete(id);
      extractor = undefined;
    }

    if (!extractor) {
      extractor = new VideoFrameExtractor(
        data.filePath,
        data.startTime,
        data.fps,
        data.duration,
      );
      this.videoFrameExtractors.set(id, extractor);
    }

    const frame = await extractor.popImage();

    return {
      frame,
      width: extractor!.getWidth(),
      height: extractor!.getHeight(),
    };
  }

  public async handleRenderFinished() {
    this.videoFrameExtractors.forEach(extractor => {
      extractor.destroy();
      const localFile = VideoFrameExtractor.downloadedVideoMap.get(
        extractor.filePath,
      )?.localPath;
      if (localFile && existsSync(localFile)) {
        unlinkSync(localFile);
      }
    });
    this.videoFrameExtractors.clear();
  }
}

// --- Image Export Handler (extracted from imageExporter.ts) ---

class ImageExportHandler {
  public constructor(private readonly outputPath: string) {}

  public async handleFrame(payload: {
    data: string;
    frame: number;
    sceneFrame: number;
    subDirectories: string[];
    mimeType: string;
    groupByScene: boolean;
  }): Promise<number> {
    const {data, frame, sceneFrame, subDirectories, mimeType, groupByScene} =
      payload;

    const name = (groupByScene ? sceneFrame : frame)
      .toString()
      .padStart(6, '0');
    const extension = mime.extension(mimeType);
    const outputFilePath = path.join(
      this.outputPath,
      ...subDirectories,
      `${name}.${extension}`,
    );
    const outputDirectory = path.dirname(outputFilePath);

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, {recursive: true});
    }

    const base64Data = data.slice(data.indexOf(',') + 1);
    await fs.promises.writeFile(outputFilePath, base64Data, {
      encoding: 'base64',
    });

    return frame;
  }
}
