import * as THREE from 'three';

// Texture helper (uses modern colorSpace flag)
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

export { applyTextures };
