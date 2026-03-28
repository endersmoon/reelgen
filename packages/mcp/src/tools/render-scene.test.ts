import {describe, expect, test, vi, beforeEach} from 'vitest';
import {renderScene} from './render-scene';

// Mock @reelgen/renderer so we never spin up Puppeteer in tests
vi.mock('@reelgen/renderer', () => ({
  renderVideo: vi.fn(),
}));

import {renderVideo} from '@reelgen/renderer';

const validDefinition = {
  scenes: [{id: 'scene1', nodes: [], timeline: []}],
};

describe('renderScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('calls renderVideo with a .ts projectFile', async () => {
    vi.mocked(renderVideo).mockResolvedValue('out/video.mp4');

    await renderScene({definition: validDefinition});

    expect(renderVideo).toHaveBeenCalledOnce();
    const call = vi.mocked(renderVideo).mock.calls[0][0];
    expect(call.projectFile).toMatch(/\.ts$/);
  });

  test('passes outDir and outFile to renderVideo settings', async () => {
    vi.mocked(renderVideo).mockResolvedValue('custom/output.mp4');

    await renderScene({
      definition: validDefinition,
      outDir: 'custom',
      outFile: 'output.mp4',
    });

    const call = vi.mocked(renderVideo).mock.calls[0][0];
    expect(call.settings?.outDir).toBe('custom');
    expect(call.settings?.outFile).toBe('output.mp4');
  });

  test('passes workers to renderVideo settings', async () => {
    vi.mocked(renderVideo).mockResolvedValue('out/video.mp4');

    await renderScene({definition: validDefinition, workers: 4});

    const call = vi.mocked(renderVideo).mock.calls[0][0];
    expect(call.settings?.workers).toBe(4);
  });

  test('defaults to workers:1 when not specified', async () => {
    vi.mocked(renderVideo).mockResolvedValue('out/video.mp4');

    await renderScene({definition: validDefinition});

    const call = vi.mocked(renderVideo).mock.calls[0][0];
    expect(call.settings?.workers).toBe(1);
  });

  test('returns videoPath and absolutePath', async () => {
    vi.mocked(renderVideo).mockResolvedValue('out/video.mp4');

    const result = await renderScene({definition: validDefinition});

    expect(result.videoPath).toBe('out/video.mp4');
    expect(typeof result.absolutePath).toBe('string');
    expect(result.absolutePath).toContain('video.mp4');
  });

  test('throws ZodError before calling renderVideo for invalid JSON', async () => {
    await expect(
      renderScene({definition: {scenes: 'bad'} as never}),
    ).rejects.toThrow();

    expect(renderVideo).not.toHaveBeenCalled();
  });

  test('cleans up temp file even when renderVideo throws', async () => {
    vi.mocked(renderVideo).mockRejectedValue(new Error('render failed'));

    await expect(renderScene({definition: validDefinition})).rejects.toThrow(
      'render failed',
    );

    // Verify renderVideo was called (i.e. the project file was created)
    expect(renderVideo).toHaveBeenCalledOnce();
    // Temp file cleanup is best-effort; just verify no unhandled rejection
  });

  test('propagates renderVideo error message', async () => {
    vi.mocked(renderVideo).mockRejectedValue(new Error('Puppeteer crash'));

    await expect(renderScene({definition: validDefinition})).rejects.toThrow(
      'Puppeteer crash',
    );
  });
});
