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
gui.add(objectOptions, 'selected', ['table', 'house'])
  .name('Select Object')
  .onChange((value) => switchModel(value));

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
      map: './shaded.png',
      // normalMap: '/normal_map.png',
      // aoMap: '/ambient_occlusion.png',
    },
    position: new THREE.Vector3(0, 0, 0),
    scale: new THREE.Vector3(0.15, 0.15, 0.15),
  },
  table: {
    path: '/000.fbx', // <-- put your table .fbx here
    textures: {
      // map: '/shaded.png',
    },
    position: new THREE.Vector3(0, 0, 0),
    scale: new THREE.Vector3(0.2, 0.2, 0.2),
  },
};

/** Dispose a model’s geometries & materials to prevent memory leaks */
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
