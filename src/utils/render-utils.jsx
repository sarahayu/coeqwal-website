import * as d3 from "d3";
import * as THREE from "three";

import { interpolateWatercolorBlue } from "bucket-lib/utils";
import { LOD_2_RAD_PX } from "settings";
import { LOD_2_LEVELS } from "settings";
import { sortBy } from "./misc-utils";
import { toRadians } from "./math-utils";

// path generated when WATERDROP_ICON size = 2
export const DROPLET_SHAPE = "M0,-1L0.5,-0.5A0.707,0.707,0,1,1,-0.5,-0.5L0,-1Z";

export const CIRC_RAD = Math.SQRT1_2;
export const DROP_RAD = 1;
export const CIRC_HEIGHT = CIRC_RAD + CIRC_RAD;
export const DROP_HEIGHT = DROP_RAD + CIRC_RAD;
const HAT_START = 0.75;

// half width at widest is 1
function yToHalfWidth(y) {
  if (y >= HAT_START) {
    const hatHalfWidth = Math.SQRT1_2;

    return (hatHalfWidth * (1 - y)) / (1 - HAT_START);
  }

  const circFrac = fracDropToCirc(y);
  const trigX = (1 - circFrac) * 2 - 1;

  const angle = Math.acos(trigX);
  const trigY = Math.sin(angle);

  return trigY;
}

// fml, here sprite width is 2 (i.e. circ rad is 1) thus drop real height is 1 + sqrt2
function yToSpriteY(y) {
  return (y - CIRC_RAD / DROP_HEIGHT) * (1 + Math.SQRT2);
}

function spriteYToY(sy) {
  return sy / (1 + Math.SQRT2) + CIRC_RAD / DROP_HEIGHT;
}

function fracCircToDrop(v) {
  return v / CIRC_HEIGHT / DROP_HEIGHT;
}

function fracDropToCirc(v) {
  return v / (CIRC_HEIGHT / DROP_HEIGHT);
}

export function waterdropDeltaOutline(yStart, yEnd, size = 2) {
  if (Math.abs(yStart - yEnd) < 0.01) return [];

  const rad = (size / 2 / DROP_RAD) * CIRC_RAD;

  const Y_DELTA = 0.1;

  const rightCoords = [];
  const leftCoords = [];

  let dx1, dy1, dx2, dy2;

  for (let i = 1; i <= Math.ceil(1 / Y_DELTA); i++) {
    dx1 = yToHalfWidth(yStart + (i - 1) * Y_DELTA);
    dy1 = yToSpriteY(yStart + (i - 1) * Y_DELTA);
    dx2 = yToHalfWidth(yStart + i * Y_DELTA);
    dy2 = yToSpriteY(yStart + i * Y_DELTA);

    if (spriteYToY(dy2) >= yEnd) break;

    // CC !
    const v1 = [-dx1 * rad, -dy1 * rad],
      v2 = [dx1 * rad, -dy1 * rad],
      v3 = [dx2 * rad, -dy2 * rad],
      v4 = [-dx2 * rad, -dy2 * rad];

    rightCoords.push(v2, v3);
    leftCoords.push(v1, v4);
  }

  dx2 = yToHalfWidth(yEnd);
  dy2 = yToSpriteY(yEnd);

  // CC !
  const v1 = [-dx1 * rad, -dy1 * rad],
    v2 = [dx1 * rad, -dy1 * rad],
    v3 = [dx2 * rad, -dy2 * rad],
    v4 = [-dx2 * rad, -dy2 * rad];

  rightCoords.push(v2, v3);
  leftCoords.push(v1, v4);

  rightCoords.push(...leftCoords.reverse());

  return rightCoords;
}

export function waterdropDelta(yStart, yEnd, size = 2) {
  if (Math.abs(yStart - yEnd) < 0.01) return [];

  const rad = (size / 2 / DROP_RAD) * CIRC_RAD;

  const Y_DELTA = 0.1;

  const coords = [];

  let dx1, dy1, dx2, dy2;

  for (let i = 1; i <= Math.ceil(1 / Y_DELTA); i++) {
    dx1 = yToHalfWidth(yStart + (i - 1) * Y_DELTA);
    dy1 = yToSpriteY(yStart + (i - 1) * Y_DELTA);
    dx2 = yToHalfWidth(yStart + i * Y_DELTA);
    dy2 = yToSpriteY(yStart + i * Y_DELTA);

    if (spriteYToY(dy2) >= yEnd) break;

    // CC !
    const v1 = [-dx1 * rad, -dy1 * rad],
      v2 = [dx1 * rad, -dy1 * rad],
      v3 = [dx2 * rad, -dy2 * rad],
      v4 = [-dx2 * rad, -dy2 * rad];

    coords.push([v1, v2, v3]);
    coords.push([v1, v3, v4]);
  }

  dx2 = yToHalfWidth(yEnd);
  dy2 = yToSpriteY(yEnd);

  // CC !
  const v1 = [-dx1 * rad, -dy1 * rad],
    v2 = [dx1 * rad, -dy1 * rad],
    v3 = [dx2 * rad, -dy2 * rad],
    v4 = [-dx2 * rad, -dy2 * rad];

  coords.push([v1, v2, v3]);
  coords.push([v1, v3, v4]);

  return coords;
}

export function waterdrop(yFill, size = 2) {
  if (yFill === 0) return [];

  return waterdropDelta(0, yFill, size);
}

export function mouseToThree(mouseX, mouseY, width, height) {
  return {
    x: (mouseX / width) * 2 - 1,
    y: -(mouseY / height) * 2 + 1,
  };
}

class MeshGeometry {
  threeGeom = new THREE.BufferGeometry();
  idx = 0;
  vertices = [];
  faces = [];
  colors = [];

  addMeshCoords(meshCoords, transform, color, z = 0) {
    const indices = [];
    for (let j = 0; j < meshCoords.length; j++) {
      const [v1, v2, v3] = meshCoords[j];

      this.vertices.push(
        transform.x + v1[0],
        transform.y - v1[1],
        z,
        transform.x + v2[0],
        transform.y - v2[1],
        z,
        transform.x + v3[0],
        transform.y - v3[1],
        z
      );

      this.faces.push(this.idx * 3 + 0, this.idx * 3 + 1, this.idx * 3 + 2);

      if (color) {
        this.colors.push(
          color.r,
          color.g,
          color.b,
          color.r,
          color.g,
          color.b,
          color.r,
          color.g,
          color.b
        );
      }

      indices.push(this.idx++);
    }

    return indices;
  }

  finish() {
    this.threeGeom.setIndex(this.faces);
    this.threeGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(this.vertices), 3)
    );
    this.threeGeom.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(this.colors), 3)
    );
  }
}

export class WaterdropMesh {
  dropsMesh;
  outlineMesh;

  added = false;

  // caching vertex ownership so we can update existing vertices instead of creating new one each time
  idToVertInfo = {};

  createMesh(waterdrops) {
    if (!this.dropsMesh) {
      this.initializeMeshes(waterdrops);
    } else {
      this.updateMeshes(waterdrops);
    }
  }

  draw(scene) {
    if (!this.added) {
      scene.add(this.dropsMesh);
      scene.add(this.outlineMesh);
      this.added = true;
    }
  }

  remove(scene) {
    if (this.added) {
      scene.remove(this.dropsMesh);
      scene.remove(this.outlineMesh);
      this.added = false;
    }
  }

  initializeMeshes(waterdrops) {
    const dropsGeometry = new MeshGeometry();
    const outlinePoints = [];

    const outlineMeshCoords = waterdropDeltaOutline(0, 1, LOD_2_RAD_PX * 0.975);

    let outlineVertexIdx = 0,
      shapeVertexIdx = 0;

    for (let i = 0; i < waterdrops.nodes.length; i++) {
      const { id, globalX: x, globalY: y, levs, maxLev } = waterdrops.nodes[i];

      let outlineVerticesAdded = outlineMeshCoords.length,
        shapeVerticesAdded = 0;

      for (let k = levs.length - 1; k >= 0; k--) {
        const l1 = k !== levs.length - 1 ? levs[k + 1] : 0;
        const l2 = levs[k];

        const meshCoords = waterdropDelta(
          l1 / maxLev,
          l2 / maxLev,
          LOD_2_RAD_PX
        );
        const color = new THREE.Color(
          interpolateWatercolorBlue(k / LOD_2_LEVELS)
        );

        dropsGeometry.addMeshCoords(
          meshCoords,
          { x: x, y: -y },
          color,
          (i % 5) / 50 + 0.02
        );

        shapeVerticesAdded += meshCoords.length * 3;
      }

      outlinePoints.push(
        ...outlineMeshCoords.map(
          ([dx, dy]) => new THREE.Vector3(x + dx, -y - dy, (i % 5) / 50 + 0.01)
        )
      );

      this.idToVertInfo[id] = {
        shapeVertRange: [shapeVertexIdx, shapeVerticesAdded],
        outlineVertRange: [outlineVertexIdx, outlineVerticesAdded],
        centroid: [x, y],
      };

      shapeVertexIdx += shapeVerticesAdded;
      outlineVertexIdx += outlineVerticesAdded;
    }

    dropsGeometry.finish();

    this.dropsMesh = new THREE.Mesh(
      dropsGeometry.threeGeom,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
      })
    );

    this.outlineMesh = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(outlinePoints),
      new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0,
      })
    );
  }

  updateOutlineVisibility(opac) {
    if (!this.outlineMesh) return;
    this.outlineMesh.material.opacity = opac;
    this.outlineMesh.material.needsUpdate = true;
  }

  updateMeshes(waterdrops) {
    for (let i = 0; i < waterdrops.nodes.length; i++) {
      const { id, globalX: newX, globalY: newY } = waterdrops.nodes[i];

      const [sviStart, sviLen] = this.idToVertInfo[id].shapeVertRange;
      const [oviStart, oviLen] = this.idToVertInfo[id].outlineVertRange;
      const [oldX, oldY] = this.idToVertInfo[id].centroid;

      const dx = newX - oldX,
        dy = newY - oldY;

      const shapeGeom = this.dropsMesh.geometry;
      const outlineGeom = this.outlineMesh.geometry;

      for (let i = 0; i < sviLen; i++) {
        const x = shapeGeom.vertices[sviStart + i].x,
          y = shapeGeom.vertices[sviStart + i].y;
        shapeGeom.vertices[sviStart + i].setX(x + dx);
        shapeGeom.vertices[sviStart + i].setY(y - dy);
      }

      this.idToVertInfo[id].centroid = [newX, newY];

      for (let i = 0; i < oviLen; i++) {
        const x = outlineGeom.attributes.position.array[(oviStart + i) * 3 + 0],
          y = outlineGeom.attributes.position.array[(oviStart + i) * 3 + 1];
        outlineGeom.attributes.position.array[(oviStart + i) * 3 + 0] = x + dx;
        outlineGeom.attributes.position.array[(oviStart + i) * 3 + 1] = y - dy;
      }

      shapeGeom.verticesNeedUpdate = true;
      outlineGeom.attributes.position.needsUpdate = true;
    }
  }
}

export class WaterdropSimplifiedMesh {
  mesh;
  added = false;

  vertToId = {};
  idToVert = {};

  draw(scene) {
    if (!this.added) {
      scene.add(this.mesh);
      this.added = true;
    }
  }

  remove(scene) {
    if (this.added) {
      scene.remove(this.mesh);
      this.added = false;
    }
  }

  createMesh(waterdrops) {
    if (!this.mesh) {
      this.initializeMesh(waterdrops);
    }

    this.updateMesh(waterdrops);

    return this.mesh;
  }

  initializeMesh(waterdrops) {
    const pointsGeometry = new THREE.BufferGeometry();

    const vertices = [];
    const colors = [];

    for (let i = 0; i < waterdrops.nodes.length; i++) {
      const { id, globalX: x, globalY: y, levs, domLev } = waterdrops.nodes[i];

      const color = domLev > 0 ? interpolateWatercolorBlue(domLev) : "white";

      vertices.push(x, -y, 0);
      const t_color = new THREE.Color(color);
      colors.push(t_color.r, t_color.g, t_color.b);

      this.vertToId[i] = id;
      this.idToVert[id] = i;
    }

    const pointsMaterial = new THREE.PointsMaterial({
      size: LOD_2_RAD_PX * 2,
      sizeAttenuation: true,
      vertexColors: true,
      map: new THREE.TextureLoader().load("drop.png"),
      transparent: true,
    });

    pointsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(vertices), 3)
    );

    pointsGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(colors), 3)
    );

    this.mesh = new THREE.Points(pointsGeometry, pointsMaterial);
  }

  updateMesh(waterdrops) {
    const positionAttr = this.mesh.geometry.getAttribute("position");
    for (let i = 0; i < waterdrops.nodes.length; i++) {
      const { id, globalX: newX, globalY: newY } = waterdrops.nodes[i];
      const idx = this.idToVert[id];
      positionAttr.setXY(idx, newX, -newY);
    }
    positionAttr.needsUpdate = true;
  }

  updatePoints(waterdrops, translations, dt) {
    const verts = this.mesh.geometry.vertices;

    for (let i = 0; i < waterdrops.nodes.length; i++) {
      const { id } = waterdrops.nodes[i];
      const idx = this.idToVert[id];

      const [dx, dy] = translations[id];

      const x = verts[idx].x;
      const y = verts[idx].y;

      verts[idx].setX(x + dt * dx);
      verts[idx].setY(y - dt * dy);
    }

    this.mesh.geometry.verticesNeedUpdate = true;
  }

  intersectObject(camera, x, y) {
    const intersects = camera.intersectObject(x, y, this.mesh);

    if (intersects[0]) {
      const intersect = sortBy(intersects, "distanceToRay")[0];
      return this.vertToId[intersect.index];
    }

    return null;
  }
}

export class Camera {
  fov;
  near;
  far;
  width;
  height;
  camera;
  zoom;
  view;
  curTransform;

  // for zooming calculations, keep track of original starting camera position
  startCamera;

  raycaster = new THREE.Raycaster();

  constructor({ fov, near, far, zoomFn }) {
    this.fov = fov;
    this.near = near;
    this.far = far;

    this.zoom = d3.zoom().on("zoom", (e) => {
      this._d3ZoomHandler(e.transform);
      this.curTransform = e.transform;

      zoomFn && zoomFn(e.transform);
    });
  }

  callZoom(transform) {
    this.zoom.transform(
      this.view,
      d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k)
    );
  }

  callZoomFromWorldViewport({ worldX, worldY, farHeight }) {
    const k = this.height / farHeight;

    const x = -(worldX * k) + this.width / 2;
    const y = worldY * k + this.height / 2;

    this.callZoom({
      x,
      y,
      k,
    });
  }

  getZFromFarHeight(farHeight) {
    return (Math.tan(toRadians(90 - this.fov / 2)) * farHeight) / 2;
  }

  getZoomInterpolator([x, y, z]) {
    return d3.interpolateZoom(
      [
        this.camera.position.x,
        this.camera.position.y,
        this.height / this.curTransform.k,
      ],
      [x, -y, Math.tan(toRadians(this.fov) / 2) * z * 2]
    );
  }

  mount(domElement) {
    this.view = d3.select(domElement);
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;

    // TODO prevent user from escaping bounds but allow transitions to
    // this.zoom = this.zoom.scaleExtent([
    //   this.getScaleFromZ(this.far),
    //   this.getScaleFromZ(this.near),
    // ]);

    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      width / height,
      this.near,
      this.far + 1000
    );

    this.camera.position.set(0, 0, this.far);

    this.view.call(this.zoom);
    this.zoom.transform(
      this.view,
      d3.zoomIdentity
        .translate(this.width / 2, this.height / 2)
        .scale(this.getScaleFromZ(this.far))
    );

    this.camera.updateProjectionMatrix();
    this.camera.updateWorldMatrix();

    this.startCamera = this.camera.clone();
  }

  _d3ZoomHandler(transform) {
    const scale = transform.k;
    const x = -(transform.x - this.width / 2) / scale;
    const y = (transform.y - this.height / 2) / scale;
    const z = this.getZFromScale(scale);
    this.camera.position.set(x, y, z);
  }

  getScaleFromZ(camera_z_position) {
    const half_fov = this.fov / 2;
    const half_fov_radians = toRadians(half_fov);
    const half_fov_height = Math.tan(half_fov_radians) * camera_z_position;
    const fov_height = half_fov_height * 2;
    const scale = this.height / fov_height;
    return scale;
  }

  getZFromScale(scale) {
    const half_fov = this.fov / 2;
    const half_fov_radians = toRadians(half_fov);
    const scale_height = this.height / scale;
    const camera_z_position = scale_height / (2 * Math.tan(half_fov_radians));
    return camera_z_position;
  }

  intersectObject(mouseX, mouseY, mesh) {
    this.raycaster.setFromCamera(
      {
        x: mouseX,
        y: mouseY,
      },
      this.camera
    );

    return this.raycaster.intersectObject(mesh);
  }
}
