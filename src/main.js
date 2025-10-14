// Main application entry point
import { gui } from './gui.js';
import { switchModel, MODELS } from './models.js';
import { animate } from './animation.js';

// Object selection GUI
const objectOptions = { selected: 'abstract_table' };
gui.add(objectOptions, 'selected', ['table', 'house', 'abstract_table'])
  .name('Select Object')
  .onChange((value) => switchModel(value));

// Initialize with default model
switchModel(objectOptions.selected);

// Start animation loop
animate();