import * as THREE from "three";
import * as d3 from "d3";

import {
  WaterdropMesh,
  WaterdropSimplifiedMesh,
  Camera,
} from "utils/render-utils";

const scene = (function getScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0xefefef);
  return s;
})();

const dropsMesh = new WaterdropMesh();
const pointsMesh = new WaterdropSimplifiedMesh();

const camera = new Camera({
  fov: 45,
  near: 1,
  far: 3000,
});

const renderer = new THREE.WebGLRenderer({ antialias: true });

const getOutlineOpac = d3
  .scaleLinear()
  .domain([1, 5])
  .range([0.1, 1])
  .clamp(true);

export { scene, camera, renderer, dropsMesh, pointsMesh, getOutlineOpac };
