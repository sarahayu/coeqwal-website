import * as THREE from "three";

import { WaterdropMesh, Camera } from "utils/three-utils";

function initThreeResources() {
  const scene = (function getScene() {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0xefefef);
    return s;
  })();

  const dropsMesh = new WaterdropMesh();

  const camera = new Camera({
    fov: 45,
    near: 1,
    far: 3000,
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true });

  return { scene, camera, renderer, dropsMesh };
}

export const threeResources = initThreeResources();
