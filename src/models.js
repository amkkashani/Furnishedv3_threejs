import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { scene } from './setup.js';
import { applyTextures } from './textures.js';
import { setupStandardNamingGUI, clearStandardNamingGUI } from './standardNaming.js';

// Model loading and management
const fbxLoader = new FBXLoader();
let currentModel = null;

/** Per-model config (paths + transforms) */
const MODELS = {
  house: {
    path: '/House2_100.fbx',
    textures: {
      map: '/shaded.png',
    },
    position: new THREE.Vector3(0, 0, 0),
    scale: new THREE.Vector3(0.15, 0.15, 0.15),
    standard_naming: false,
  },
  table: {
    path: '/000.fbx',
    textures: {},
    position: new THREE.Vector3(0, 0, 0),
    scale: new THREE.Vector3(0.2, 0.2, 0.2),
    standard_naming: false,
  },
  abstract_table: {
    path: '/Table.fbx',
    textures: {},
    position: new THREE.Vector3(0, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
    standard_naming: true,
  },
};

/** Dispose a model's geometries & materials to prevent memory leaks */
function disposeObject3D(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats?.forEach((m) => {
        if (!m) return;
        for (const key of Object.keys(m)) {
          const val = m[key];
          if (val && val.isTexture) val.dispose();
        }
        m.dispose?.();
      });
    }
  });
}

/** Load + show a model by key from MODELS */
async function loadAndShowModel(key) {
  const cfg = MODELS[key];
  if (!cfg) throw new Error(`Unknown model key: ${key}`);
  
  const object = await fbxLoader.loadAsync(cfg.path);
  await applyTextures(object, cfg.textures);
  object.position.copy(cfg.position);
  object.scale.copy(cfg.scale);
  scene.add(object);
  
  // Setup standard naming if enabled
  if (cfg.standard_naming) {
    setupStandardNamingGUI(object);
  }
  
  return object;
}

/** Swap to a different model */
async function switchModel(key) {
  try {
    // Remove & dispose old
    if (currentModel) {
      scene.remove(currentModel);
      disposeObject3D(currentModel);
      currentModel = null;
    }
    
    // Clear standard naming GUI
    clearStandardNamingGUI();
    
    // Load & add new
    currentModel = await loadAndShowModel(key);
    console.log(`Switched to: ${key}`);
  } catch (err) {
    console.error('Failed to switch model:', err);
  }
}

export { switchModel, MODELS };
