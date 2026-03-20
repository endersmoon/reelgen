export class ImageCommunication {
  public async getFrame(
    id: string,
    src: string,
    time: number,
    duration: number,
    fps: number,
  ) {
    const port = (window as any).__REVIDEO_BACKEND_PORT__;
    const base = port ? `http://localhost:${port}` : '';
    const response = await fetch(`${base}/revideo-ffmpeg-decoder/video-frame`, {
      method: 'POST',
      headers: {
        // eslint-disable-next-line
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        filePath: src,
        startTime: time,
        duration,
        fps,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const width = parseInt(response.headers.get('X-Frame-Width') || '1080', 10);
    const height = parseInt(
      response.headers.get('X-Frame-Height') || '1920',
      10,
    );

    const arrayBuffer = await response.arrayBuffer();

    const imageData = new ImageData(
      new Uint8ClampedArray(arrayBuffer),
      width,
      height,
    );

    return createImageBitmap(imageData);
  }
}
