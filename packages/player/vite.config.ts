import * as fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['es'],
      fileName: 'main',
    },
    rollupOptions: {
      external: ['@reelgen/core'],
    },
  },
  plugins: [
    {
      name: 'template',
      load(id) {
        if (id === '\0virtual:template') {
          return fs.readFileSync('../template/dist/project.js').toString();
        }
      },
    },
  ],
});
