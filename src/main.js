import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import GUI from 'lil-gui';

//=====================================================================================
//  scene, camera, renderer
//=====================================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef0a1');
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 40);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

//=====================================================================================
// controls, lights, GUI
//=====================================================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(ambientLight, directionalLight);

const gui = new GUI();
gui.addColor({ background: '#eef0a1' }, 'background')
  .name('Background Color')
  .onChange((value) => scene.background.set(value));

const objectOptions = { selected: 'table' };
gui.add(objectOptions, 'selected', ['table', 'house', 'abstract_table'])
  .name('Select Object')
  .onChange((value) => switchModel(value));

//=====================================================================================
// Standard Naming System
//=====================================================================================
let featuresFolder = null;
let attachmentsFolder = null;
const featureControllers = [];

/**
 * Parse feature name: Feature_XY_Scale_Box1
 * Returns: { axes: ['X', 'Y'], operation: 'Scale', objectName: 'Box1' }
 */
function parseFeatureName(name) {
  if (!name.startsWith('Feature_')) return null;
  
  const parts = name.substring(8).split('_'); // Remove "Feature_"
  if (parts.length < 3) return null;
  
  const axes = parts[0].split('').filter(c => ['X', 'Y', 'Z'].includes(c.toUpperCase()));
  const operation = parts[1];
  const objectName = parts.slice(2).join('_');
  
  return { axes, operation, objectName, fullName: name };
}

/**
 * Parse attachment/pivot name: Attached_leg1 or Pivot_leg1
 * Returns: { type: 'Attached'|'Pivot', targetName: 'leg1' }
 */
function parseAttachmentName(name) {
  if (name.startsWith('Attached_')) {
    return { type: 'Attached', targetName: name.substring(9), fullName: name };
  }
  if (name.startsWith('Pivot_')) {
    return { type: 'Pivot', targetName: name.substring(6), fullName: name };
  }
  return null;
}

/**
 * Find all objects matching standard naming conventions
 */
function findStandardObjects(model) {
  const features = [];
  const attachments = [];
  const pivots = [];
  const objectMap = new Map();
  
  model.traverse((child) => {
    if (!child.name) return;
    
    objectMap.set(child.name, child);
    
    const featureInfo = parseFeatureName(child.name);
    if (featureInfo) {
      features.push({ ...featureInfo, object: child });
      return;
    }
    
    const attachmentInfo = parseAttachmentName(child.name);
    if (attachmentInfo) {
      if (attachmentInfo.type === 'Attached') {
        attachments.push({ ...attachmentInfo, object: child });
      } else if (attachmentInfo.type === 'Pivot') {
        pivots.push({ ...attachmentInfo, object: child });
      }
    }
  });
  
  return { features, attachments, pivots, objectMap };
}

/**
 * Apply scale feature to an object based on axes
 */
function applyFeatureScale(object, axes, value) {
  if (!object) return;
  
  const scale = object.scale.clone();
  axes.forEach(axis => {
    const axisLower = axis.toLowerCase();
    if (axisLower === 'x') scale.x = value;
    else if (axisLower === 'y') scale.y = value;
    else if (axisLower === 'z') scale.z = value;
  });
  
  object.scale.copy(scale);
}

/**
 * Apply rotation feature to an object based on axes
 */
function applyFeatureRotation(object, axes, value) {
  if (!object) return;
  
  const rotation = object.rotation.clone();
  const radians = THREE.MathUtils.degToRad(value);
  
  axes.forEach(axis => {
    const axisLower = axis.toLowerCase();
    if (axisLower === 'x') rotation.x = radians;
    else if (axisLower === 'y') rotation.y = radians;
    else if (axisLower === 'z') rotation.z = radians;
  });
  
  object.rotation.copy(rotation);
}

/**
 * Process attachments - move objects to pivot/target positions
 */
function processAttachments(attachments, objectMap) {
  attachments.forEach(({ object, targetName }) => {
    const target = objectMap.get(`Pivot_${targetName}`) || objectMap.get(`Attached_${targetName}`);
    if (target) {
      // Get world position of target
      const worldPos = new THREE.Vector3();
      target.getWorldPosition(worldPos);
      
      // Convert to local space of object's parent
      if (object.parent) {
        object.parent.worldToLocal(worldPos);
      }
      
      object.position.copy(worldPos);
    }
  });
}

/**
 * Setup GUI for standard naming features
 */
function setupStandardNamingGUI(model) {
  // Clear existing feature controllers
  if (featuresFolder) {
    featuresFolder.destroy();
    featuresFolder = null;
  }
  if (attachmentsFolder) {
    attachmentsFolder.destroy();
    attachmentsFolder = null;
  }
  featureControllers.length = 0;
  
  const { features, attachments, pivots, objectMap } = findStandardObjects(model);
  
  if (features.length === 0 && attachments.length === 0) {
    console.log('No standard naming objects found');
    return;
  }
  
  // Create features folder
  if (features.length > 0) {
    featuresFolder = gui.addFolder('Features');
    featuresFolder.open();
    
    features.forEach((feature) => {
      const { axes, operation, objectName, object } = feature;
      const axesStr = axes.join('');
      const controlName = `${objectName} (${axesStr} ${operation})`;
      
      // Create control object for GUI
      const control = { value: 1.0 };
      
      // Determine initial value based on operation
      if (operation.toLowerCase() === 'scale') {
        // Get initial scale from first axis
        const firstAxis = axes[0].toLowerCase();
        control.value = object.scale[firstAxis] || 1.0;
        
        // Set range based on initial value (allow 10x smaller to 10x larger)
        const minScale = Math.max(0.01, control.value * 0.1);
        const maxScale = control.value * 10;
        
        const controller = featuresFolder
          .add(control, 'value', minScale, maxScale)
          .name(controlName)
          .onChange((value) => {
            applyFeatureScale(object, axes, value);
            // Re-process attachments after scale change
            processAttachments(attachments, objectMap);
          });
        
        featureControllers.push(controller);
      } else if (operation.toLowerCase() === 'rotation' || operation.toLowerCase() === 'rotate') {
        // Get initial rotation from first axis
        const firstAxis = axes[0].toLowerCase();
        control.value = THREE.MathUtils.radToDeg(object.rotation[firstAxis] || 0);
        
        const controller = featuresFolder
          .add(control, 'value', -180, 180)
          .name(controlName)
          .onChange((value) => {
            applyFeatureRotation(object, axes, value);
            // Re-process attachments after rotation change
            processAttachments(attachments, objectMap);
          });
        
        featureControllers.push(controller);
      }
    });
  }
  
  // Create attachments info folder (optional, for debugging)
  if (attachments.length > 0 || pivots.length > 0) {
    attachmentsFolder = gui.addFolder('Attachments Info');
    attachmentsFolder.close();
    
    const info = {
      attachments: attachments.length,
      pivots: pivots.length
    };
    
    attachmentsFolder.add(info, 'attachments').name('Attached Objects').disable();
    attachmentsFolder.add(info, 'pivots').name('Pivot Objects').disable();
  }
  
  // Initial attachment processing
  processAttachments(attachments, objectMap);
  
  console.log(`Standard naming setup complete: ${features.length} features, ${attachments.length} attachments, ${pivots.length} pivots`);
}

//=====================================================================================
// Texture helper (uses modern colorSpace flag)
//=====================================================================================
const textureLoader = new THREE.TextureLoader();
async function applyTextures(object, texturePaths) {
  if (!texturePaths || !Object.keys(texturePaths).length) return object;
  const entries = await Promise.all(
    Object.entries(texturePaths).map(async ([key, url]) => {
      const tex = await textureLoader.loadAsync(url);
      if (key === 'map' || key === 'emissiveMap') tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
      return [key, tex];
    })
  );
  const matProps = Object.fromEntries(entries);
  object.traverse((child) => {
    if (child.isMesh) {
      // Create a fresh material per mesh so disposal is safe later
      const material = new THREE.MeshStandardMaterial(matProps);
      child.material = material;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

//=====================================================================================
// Model swapping
//=====================================================================================
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
    if (featuresFolder) {
      featuresFolder.destroy();
      featuresFolder = null;
    }
    if (attachmentsFolder) {
      attachmentsFolder.destroy();
      attachmentsFolder = null;
    }
    featureControllers.length = 0;
    
    // Load & add new
    currentModel = await loadAndShowModel(key);
    console.log(`Switched to: ${key}`);
  } catch (err) {
    console.error('Failed to switch model:', err);
  }
}

// Initial model
switchModel(objectOptions.selected);

//=====================================================================================
// Animation & resize
//=====================================================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();