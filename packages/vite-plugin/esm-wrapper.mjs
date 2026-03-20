import plugin from './index.js';

const motionCanvas = plugin.default || plugin;
export default motionCanvas;
export const {PLUGIN_OPTIONS, isPlugin, standaloneServerPort} = plugin;
