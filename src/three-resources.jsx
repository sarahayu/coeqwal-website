import * as THREE from "three";
import * as d3 from "d3";

import {
  WaterdropMesh,
  WaterdropSimplifiedMesh,
  Camera,
} from "utils/render-utils";

const scene = getScene();

const dropsMesh = new WaterdropMesh();
const pointsMesh = new WaterdropSimplifiedMesh();

const camera = new Camera({
  fov: 45,
  near: 1,
  far: 3000,
  zoomFn: (transform) => {
    d3.select("#mosaic-svg").select(".svg-trans").attr("transform", transform);

    dropsMesh.updateOutlineVisibility(
      d3.scaleLinear().domain([1, 5]).range([0.1, 1]).clamp(true)(transform.k)
    );
  },
});

// camera.view.on("mousemove", (e) => {
//   //   if (!pointsMesh) return;
//   //   const { x, y } = mouseToThree(e.x, e.y, width, height);
//   //   const intersectID = pointsMesh.intersectObject(camera, x, y);
//   //   if (intersectID) {
//   //     const waterdropIntersected = flattenedData.find(
//   //       (n) => n.id === intersectID
//   //     );
//   //     setTooltip((tooltip) => ({
//   //       ...tooltip,
//   //       secondaryText:
//   //         grouping === "objective"
//   //           ? waterdropIntersected.scenario
//   //           : waterdropIntersected.objective,
//   //     }));
//   //   } else {
//   //     setTooltip((tooltip) => ({
//   //       ...tooltip,
//   //       secondaryText: "",
//   //     }));
//   //   }
// });

const renderer = new THREE.WebGLRenderer({ antialias: true });

function getScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0xefefef);
  return s;
}

export { scene, camera, renderer, dropsMesh, pointsMesh };
