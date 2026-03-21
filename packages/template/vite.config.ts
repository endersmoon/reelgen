import preact from '@preact/preset-vite';
import {defineConfig} from 'vite';
import motionCanvas from '../vite-plugin/src/main';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@reelgen/ui',
        replacement: '@reelgen/ui/src/main.tsx',
      },
      {
        find: '@reelgen/2d/editor',
        replacement: '@reelgen/2d/src/editor',
      },
      {
        find: /@revideo\/2d(\/lib)?/,
        replacement: '@reelgen/2d/src/lib',
      },
      {find: '@reelgen/core', replacement: '@reelgen/core/src'},
    ],
  },
  plugins: [
    preact({
      include: [
        /packages\/ui\/src\/(.*)\.tsx?$/,
        /packages\/2d\/src\/editor\/(.*)\.tsx?$/,
      ],
    }),
    motionCanvas({
      buildForEditor: false,
    }),
  ],
  build: {
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
