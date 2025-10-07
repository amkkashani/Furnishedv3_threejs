import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import GUI from 'lil-gui';

//=====================================================================================
//  scene, camera, and renderer
//=====================================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef0a1');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

//=====================================================================================
// controls, lights, and GUI
//=====================================================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(ambientLight, directionalLight);

const gui = new GUI();
// Background color control (existing)
gui.addColor({ background: '#eef0a1' }, 'background')
  .name('Background Color')
  .onChange((value) => {
    scene.background.set(value);
  });

// Object selector dropdown
const objectOptions = {
  selected: 'table', // default selection
};

gui.add(objectOptions, 'selected', ['table', 'house'])
  .name('Select Object')
  .onChange((value) => {
    console.log(`Selected object: ${value}`);
    // Here you can handle switching between objects, e.g.:
    // if (value === 'table') { showTable(); }
    // else if (value === 'house') { showHouse(); }
  });

//=====================================================================================
// ✨ Reusable function to apply textures
//=====================================================================================

// Create the texture loader once to reuse it
const textureLoader = new THREE.TextureLoader();

/**
 * Asynchronously loads textures and applies them to the meshes of a 3D object.
 *
 * @param {THREE.Object3D} object - The 3D object to which the textures will be applied.
 * @param {object} texturePaths - An object with material map types and image paths.
 * @returns {Promise<THREE.Object3D>} A promise that resolves with the modified object.
 */
async function applyTextures(object, texturePaths) {
    const texturePromises = Object.entries(texturePaths).map(async ([key, path]) => {
        const texture = await textureLoader.loadAsync(path);
        if (key === 'map' || key === 'emissiveMap') {
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        texture.flipY = true;
        return [key, texture];
    });

    const loadedTextures = await Promise.all(texturePromises);
    const material = new THREE.MeshStandardMaterial(Object.fromEntries(loadedTextures));

    object.traverse((child) => {
        if (child.isMesh) {
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return object;
}

// FBX

// load house
// Define the paths for your model and its textures
const houseModelPath = '/House2_100.fbx';
const houseTexturePaths = {
  map: '/shaded.png',              // Color texture
  // normalMap: '/normal_map.png',    // Optional normal map for detail
  // aoMap: '/ambient_occlusion.png' // Add other maps as needed
};

// Define scale and position
const houseOptions = {
  scale: new THREE.Vector3(0.05, 0.05, 0.05),
  position: new THREE.Vector3(0, 0, -10)
};

// Call the function to load the model and add it to the scene
loadFBXModel(scene, houseModelPath, houseTexturePaths, houseOptions);


//load table
// Define the paths for your model and its textures
const tableModelPath = '/House2_100.fbx';
const tableTexturePaths = {
  map: '/shaded.png',              // Color texture
  // normalMap: '/normal_map.png',    // Optional normal map for detail
  // aoMap: '/ambient_occlusion.png' // Add other maps as needed
};

// Define scale and position
const tableOptions = {
  scale: new THREE.Vector3(0.05, 0.05, 0.05),
  position: new THREE.Vector3(0, 0, -10)
};

// Call the function to load the model and add it to the scene
loadFBXModel(scene, tableModelPath, tableTexturePaths, tableOptions);



// const fbxLoader = new FBXLoader();

// fbxLoader.load(
//     '/House2_100.fbx',
//     // Use an `async` callback function to be able to use `await`
//     async (object) => {
//         // ❗️ IMPORTANT! Replace these paths with the actual paths to your texture files.
//         const houseTexturePaths = {
//             map: '/shaded.png',          // Color map
//             // normalMap: '/textures/House_Normal.png'   // Normal map for details
//             // aoMap: '/textures/House_AO.jpg',         // Ambient occlusion
//             // roughnessMap: '/textures/House_Roughness.jpg', // Roughness map
//         };

//         // Call the reusable function and wait for it to finish
//         const texturedObject = await applyTextures(object, houseTexturePaths);

//         texturedObject.scale.set(0.05, 0.05, 0.05);
//         scene.add(texturedObject);

//         console.log('FBX loaded and textures applied:', texturedObject);
//     },
//     (xhr) => {
//         console.log(((xhr.loaded / xhr.total) * 100).toFixed(0) + '% loaded');
//     },
//     (err) => {
//         console.error('Error loading FBX:', err);
//     }
// );

//=====================================================================================
// Animation loop and resize handler
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















//// Functions


/**
 * Loads an FBX model, optionally applies textures, and adds it to the scene.
 *
 * @param {THREE.Scene} scene The Three.js scene to add the model to.
 * @param {string} fbxPath The file path to the .fbx model.
 * @param {object | null} texturePaths An object where keys are material map types
 * (e.g., 'map', 'normalMap') and values are the paths to the texture files.
 * Pass null or an empty object if no textures are needed.
 * @param {object} [options] Optional settings for position, scale, and rotation.
 * @param {THREE.Vector3} [options.position=new THREE.Vector3(0,0,0)] The model's position.
 * @param {THREE.Vector3} [options.scale=new THREE.Vector3(1,1,1)] The model's scale.
 */
function loadFBXModel(scene, fbxPath, texturePaths, options = {}) {
  const fbxLoader = new FBXLoader();
  const textureLoader = new THREE.TextureLoader();

  // Set default options
  const config = {
    position: options.position || new THREE.Vector3(0, 0, 0),
    scale: options.scale || new THREE.Vector3(1, 1, 1),
  };

  fbxLoader.load(
    fbxPath,
    // Use an async callback to allow for `await`
    async (object) => {
      // --- Texture Application ---
      // Check if texturePaths is provided and has keys
      if (texturePaths && Object.keys(texturePaths).length > 0) {
        try {
          // Create an array of promises for loading each texture
          const texturePromises = Object.entries(texturePaths).map(
            ([type, path]) => textureLoader.loadAsync(path).then(texture => ({ type, texture }))
          );
          
          // Wait for all textures to load concurrently
          const loadedTextures = await Promise.all(texturePromises);

          // Apply textures to the model's materials
          object.traverse((child) => {
            if (child.isMesh && child.material) {
              for (const { type, texture } of loadedTextures) {
                // Special handling for color maps to ensure correct color space
                if (type === 'map') {
                  texture.encoding = THREE.sRGBEncoding;
                }
                child.material[type] = texture;
              }
              child.material.needsUpdate = true;
            }
          });
          console.log('Textures applied successfully to', fbxPath);
        } catch (error) {
          console.error('An error occurred while loading or applying textures:', error);
        }
      }

      // --- Transformations and Scene Addition ---
      object.position.copy(config.position);
      object.scale.copy(config.scale);
      scene.add(object);
      console.log(`Successfully loaded and placed ${fbxPath} in the scene.`);
    },
    // onProgress callback
    (xhr) => {
      console.log(`Loading ${fbxPath}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    // onError callback
    (error) => {
      console.error(`An error happened while loading ${fbxPath}:`, error);
    }
  );
}