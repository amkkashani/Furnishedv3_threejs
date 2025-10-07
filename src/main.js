import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef0a1');

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 📌 GUI panel
const gui = new GUI();
const params = {
  background: '#eef0a1',
  // scale: 1.0
};


// Add a color controller for background
gui.addColor(params, 'background').name('Background Color').onChange((value) => {
  scene.background.set(value);
});

// Scale control (float)
// gui.add(params, 'scale', 0.1, 5.0) // min: 0.1, max: 5.0
//   .step(0.1)
//   .name('Box Scale')
//   .onChange((value) => {
//     cube.scale.set(value, value, value);
//   });



// Animation Loop
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
