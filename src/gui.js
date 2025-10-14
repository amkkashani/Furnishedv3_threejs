import GUI from 'lil-gui';
import { scene } from './setup.js';

// GUI setup
const gui = new GUI();

// Background color control
gui.addColor({ background: '#eef0a1' }, 'background')
  .name('Background Color')
  .onChange((value) => scene.background.set(value));

export { gui };
