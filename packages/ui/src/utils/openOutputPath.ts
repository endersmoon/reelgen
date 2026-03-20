import {withLoader} from './withLoader';

export function openOutputPath() {
  return withLoader(async () => {
    const port = (window as any).__REVIDEO_BACKEND_PORT__;
    const base = port ? `http://localhost:${port}` : '';
    await fetch(`${base}/__open-output-path`);
  });
}
