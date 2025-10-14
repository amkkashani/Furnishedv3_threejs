import * as THREE from 'three';
import { gui } from './gui.js';

// Standard Naming System
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
      
      // Create separate control for EACH axis
      axes.forEach((axis) => {
        const axisLower = axis.toLowerCase();
        const controlName = `${objectName} ${axis} ${operation}`;
        
        // Create control object for GUI
        const control = { value: 1.0 };
        
        // Determine initial value based on operation
        if (operation.toLowerCase() === 'scale') {
          // Get initial scale for this specific axis
          control.value = object.scale[axisLower] || 1.0;
          
          // Set range based on initial value (allow 10x smaller to 10x larger)
          const minScale = Math.max(0.01, control.value * 0.1);
          const maxScale = control.value * 10;
          
          const controller = featuresFolder
            .add(control, 'value', minScale, maxScale)
            .name(controlName)
            .onChange((value) => {
              // Apply scale only to this specific axis
              applyFeatureScale(object, [axis], value);
              // Re-process attachments after scale change
              processAttachments(attachments, objectMap);
            });
          
          featureControllers.push(controller);
        } else if (operation.toLowerCase() === 'rotation' || operation.toLowerCase() === 'rotate') {
          // Get initial rotation for this specific axis
          control.value = THREE.MathUtils.radToDeg(object.rotation[axisLower] || 0);
          
          const controller = featuresFolder
            .add(control, 'value', -180, 180)
            .name(controlName)
            .onChange((value) => {
              // Apply rotation only to this specific axis
              applyFeatureRotation(object, [axis], value);
              // Re-process attachments after rotation change
              processAttachments(attachments, objectMap);
            });
          
          featureControllers.push(controller);
        }
      });
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

/**
 * Clear standard naming GUI
 */
function clearStandardNamingGUI() {
  if (featuresFolder) {
    featuresFolder.destroy();
    featuresFolder = null;
  }
  if (attachmentsFolder) {
    attachmentsFolder.destroy();
    attachmentsFolder = null;
  }
  featureControllers.length = 0;
}

export { setupStandardNamingGUI, clearStandardNamingGUI };
