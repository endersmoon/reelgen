/**
 * Utility for communicating with the Revideo standalone backend server.
 *
 * @remarks
 * The backend server runs alongside the Vite dev server on a separate port.
 * Its port is injected into the page via `window.__REVIDEO_BACKEND_PORT__`.
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __REVIDEO_BACKEND_PORT__?: number;
  }
}

/**
 * Get the base URL of the standalone backend server.
 */
export function getBackendUrl(): string {
  const port =
    typeof window !== 'undefined' ? window.__REVIDEO_BACKEND_PORT__ : 0;
  if (!port) {
    throw new Error(
      'Revideo backend server port not found. Is the dev server running?',
    );
  }
  return `http://localhost:${port}`;
}

/**
 * Make a fetch request to the backend server.
 */
export function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${getBackendUrl()}${path}`, init);
}

type WSMessageHandler = (data: any) => void;

/**
 * Manages a WebSocket connection to the backend server.
 */
export class BackendWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<WSMessageHandler>>();
  private connectPromise: Promise<void> | null = null;

  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      const port =
        typeof window !== 'undefined' ? window.__REVIDEO_BACKEND_PORT__ : 0;
      if (!port) {
        reject(
          new Error(
            'Revideo backend server port not found. Is the dev server running?',
          ),
        );
        return;
      }

      this.ws = new WebSocket(`ws://localhost:${port}`);

      this.ws.onopen = () => {
        this.connectPromise = null;
        resolve();
      };

      this.ws.onerror = event => {
        this.connectPromise = null;
        reject(event);
      };

      this.ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data as string);
          const handlers = this.handlers.get(msg.type);
          if (handlers) {
            for (const handler of handlers) {
              handler(msg.data);
            }
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.connectPromise = null;
      };
    });

    return this.connectPromise;
  }

  public on(type: string, handler: WSMessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  public off(type: string, handler: WSMessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  public send(type: string, data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({type, data}));
    }
  }

  public close(): void {
    this.ws?.close();
    this.ws = null;
  }
}

/**
 * Shared WebSocket connection to the backend server.
 */
export const backendWs = new BackendWebSocket();
