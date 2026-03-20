import type {Browser, LaunchOptions} from 'puppeteer';
import puppeteer from 'puppeteer';

export interface BrowserPoolOptions {
  /** Maximum number of Chrome instances to keep in the pool. Defaults to 4. */
  maxSize?: number;
  /** Puppeteer launch options applied to all browsers in the pool. */
  launchOptions?: LaunchOptions;
}

type Waiter = {
  resolve: (browser: Browser) => void;
  reject: (error: Error) => void;
};

export class BrowserPool {
  private readonly maxSize: number;
  private readonly launchOptions: LaunchOptions;
  private readonly availableBrowsers: Browser[] = [];
  private readonly inUseBrowsers: Set<Browser> = new Set();
  private readonly waitQueue: Waiter[] = [];
  private disposed = false;

  public constructor(options?: BrowserPoolOptions) {
    this.maxSize = options?.maxSize ?? 4;
    this.launchOptions = options?.launchOptions ?? {};
  }

  /**
   * Acquire a browser from the pool. Launches a new one if needed,
   * or waits if at capacity.
   */
  public async acquire(): Promise<Browser> {
    if (this.disposed) {
      throw new Error('BrowserPool has been disposed');
    }

    // Try to pop an available browser
    while (this.availableBrowsers.length > 0) {
      const browser = this.availableBrowsers.pop()!;
      if (browser.connected) {
        this.inUseBrowsers.add(browser);
        return browser;
      }
      // Browser disconnected while idle — discard it
    }

    // If we haven't hit capacity, launch a new browser
    const totalCount = this.inUseBrowsers.size + this.availableBrowsers.length;
    if (totalCount < this.maxSize) {
      const browser = await this.launchBrowser();
      this.inUseBrowsers.add(browser);
      return browser;
    }

    // At capacity — wait for a browser to be released
    return new Promise<Browser>((resolve, reject) => {
      this.waitQueue.push({resolve, reject});
    });
  }

  /**
   * Release a browser back to the pool. Closes excess pages to clean state.
   */
  public async release(browser: Browser): Promise<void> {
    if (!this.inUseBrowsers.has(browser)) {
      return;
    }

    this.inUseBrowsers.delete(browser);

    // If the pool has been disposed while this browser was in use, close it
    if (this.disposed) {
      await browser.close().catch(() => {});
      return;
    }

    // If the browser has disconnected/crashed, discard it
    if (!browser.connected) {
      this.drainWaitersIfNeeded();
      return;
    }

    // Clean up pages — close all except the default blank page
    try {
      const pages = await browser.pages();
      const closePromises = pages.slice(1).map(page =>
        page.close().catch(() => {}),
      );
      await Promise.all(closePromises);
    } catch {
      // Browser may have crashed during cleanup — discard it
      this.drainWaitersIfNeeded();
      return;
    }

    // If there are queued waiters, hand the browser directly to the next one
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      this.inUseBrowsers.add(browser);
      waiter.resolve(browser);
      return;
    }

    // Otherwise return to the available pool
    this.availableBrowsers.push(browser);
  }

  /**
   * Close all browsers and dispose the pool.
   */
  public async dispose(): Promise<void> {
    this.disposed = true;

    // Reject all queued waiters
    for (const waiter of this.waitQueue) {
      waiter.reject(new Error('BrowserPool has been disposed'));
    }
    this.waitQueue.length = 0;

    // Close all available browsers
    const closeAvailable = this.availableBrowsers.map(browser =>
      browser.close().catch(() => {}),
    );
    this.availableBrowsers.length = 0;

    // Close all in-use browsers
    const closeInUse = [...this.inUseBrowsers].map(browser =>
      browser.close().catch(() => {}),
    );
    this.inUseBrowsers.clear();

    await Promise.all([...closeAvailable, ...closeInUse]);
  }

  /** Number of browsers currently available. */
  public get available(): number {
    return this.availableBrowsers.length;
  }

  /** Number of browsers currently in use. */
  public get inUse(): number {
    return this.inUseBrowsers.size;
  }

  private async launchBrowser(): Promise<Browser> {
    const args = [...(this.launchOptions.args ?? [])];
    if (!args.includes('--single-process')) {
      args.push('--single-process');
    }

    return puppeteer.launch({
      headless: true,
      ...this.launchOptions,
      args,
    });
  }

  /**
   * When a browser is discarded (crashed/disconnected), check if any waiters
   * can be served by launching a new browser, since we're now below capacity.
   */
  private drainWaitersIfNeeded(): void {
    if (this.waitQueue.length === 0) {
      return;
    }

    const totalCount = this.inUseBrowsers.size + this.availableBrowsers.length;
    if (totalCount < this.maxSize) {
      const waiter = this.waitQueue.shift()!;
      this.launchBrowser().then(
        browser => {
          this.inUseBrowsers.add(browser);
          waiter.resolve(browser);
        },
        error => {
          waiter.reject(error);
        },
      );
    }
  }
}
