import {renderVideo} from '@reelgen/renderer';

async function render() {
  console.log('Rendering video...');

  const file = await renderVideo({
    projectFile: './src/project.ts',
    variables: {fill: 'orange'},
    settings: {
      logProgress: true,
      renderSettings: {
        exporter: {
          name: '@reelgen/core/wasm',
          options: {
            format: 'mp4',
          },
        },
      },
    },
  });

  console.log(`Rendered video to ${file}`);
}

render();
