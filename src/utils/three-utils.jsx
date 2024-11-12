import * as d3 from "d3";
import * as THREE from "three";
import {
  interpolateWatercolorBlue,
  levelToDropletLevel,
} from "bucket-lib/utils";
import { settings } from "settings";
import { copyCoords, sortBy } from "utils/misc-utils";
import { rotatePoints, toRadians } from "utils/math-utils";
import {
  waterdropDeltaOutline,
  waterdropDelta,
  worldToScreen,
  screenToWorld,
} from "utils/render-utils";

export function mouseToThree(mouseX, mouseY, width, height) {
  return {
    x: (mouseX / width) * 2 - 1,
    y: -(mouseY / height) * 2 + 1,
  };
}

export class WaterdropMesh {
  static MAX_POINTS_DROPS = 60 * 130000; // approx num verts per droplet * approx num droplets on screen
  static MAX_POINTS_OUTLINE = 40 * 130000; // approx num verts per droplet * approx num droplets on screen

  dropsMesh;
  outlineMesh;

  added = false;

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

  // TODO optimize!
  initializeMeshes(waterdrops) {
    const dropsGeometry = new MeshGeometry(WaterdropMesh.MAX_POINTS_DROPS);
    const outlinePoints = [];

    const outlineMeshCoords = waterdropDeltaOutline(
      0,
      1,
      settings.LOD_1_RAD_PX * 2 * 0.975
    );

    for (let i = 0; i < waterdrops.nodes.length; i++) {
      const {
        id,
        globalX: x,
        globalY: y,
        levs,
        maxLev,
        globalTilt: tilt,
      } = waterdrops.nodes[i];

      for (let k = levs.length - 1; k >= 0; k--) {
        const l1 = k !== levs.length - 1 ? levs[k + 1] : 0;
        const l2 = levs[k];

        const meshCoords = waterdropDelta(
          levelToDropletLevel(l1 / maxLev),
          levelToDropletLevel(l2 / maxLev),
          settings.LOD_1_RAD_PX * 2
        );
        const color = new THREE.Color(
          interpolateWatercolorBlue(k / settings.LOD_1_LEVELS)
        );

        dropsGeometry.addMeshCoords(
          meshCoords,
          { x: x, y: -y, rotate: tilt },
          color,
          (i % 5) / 50 + 0.02
        );
      }

      const rotOutline = rotatePoints(copyCoords(outlineMeshCoords), tilt);

      outlinePoints.push(
        ...rotOutline.map(([dx, dy]) => {
          return new THREE.Vector3(x + dx, -y - dy, (i % 5) / 50 + 0.01);
        })
      );
    }

    dropsGeometry.finish();

    this.dropsMesh = new THREE.Mesh(
      dropsGeometry.threeGeom,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 1,
      })
    );

    this.outlineMesh = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(outlinePoints),
      new THREE.LineBasicMaterial({
        color: 13421772,
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

  updateVisibility(opac) {
    if (!this.outlineMesh || !this.dropsMesh) return;
    this.outlineMesh.material.opacity = opac;
    this.outlineMesh.material.needsUpdate = true;
    this.dropsMesh.material.opacity = opac;
    this.dropsMesh.material.needsUpdate = true;
  }

  updateMeshes(waterdrops) {
    // TODO fix
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
      size: settings.LOD_1_RAD_PX * 2,
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
  webglView;
  curTransform;

  raycaster = new THREE.Raycaster();

  svgView;

  constructor({ fov, near, far }) {
    this.fov = fov;
    this.near = near;
    this.far = far;
  }

  create({ width, height, webglElement, svgElement, zoomFn }) {
    this.width = width;
    this.height = height;

    this.webglView = d3.select(webglElement);
    this.svgView = d3.select(svgElement);

    this.zoom = d3.zoom().on("zoom", (e) => {
      this.curTransform = e.transform;

      this.#THREEHandleZoom(e.transform);
      this.svgView.attr("transform", e.transform);

      zoomFn && zoomFn(e.transform);
    });

    this.#finishCreate();
  }

  callZoom(transform) {
    this.zoom.transform(
      this.webglView,
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

  interpolateZoomCamera([endx, endy, endz]) {
    const i = d3.interpolateZoom(
      [
        this.camera.position.x,
        this.camera.position.y,
        this.height / this.curTransform.k,
      ],
      [endx, -endy, this.getFarHeightFromZ(endz)]
    );

    const interper = (t) => {
      const [worldX, worldY, farHeight] = i(t);

      const k = this.height / farHeight;

      const x = -(worldX * k) + this.width / 2;
      const y = worldY * k + this.height / 2;

      return {
        x,
        y,
        k,
      };
    };

    interper.duration = i.duration;

    return interper;
  }

  getZFromFarHeight(farHeight) {
    return (Math.tan(toRadians(90 - this.fov / 2)) * farHeight) / 2;
  }

  getFarHeightFromZ(z) {
    return Math.tan(toRadians(this.fov) / 2) * z * 2;
  }

  getScaleFromZ(z) {
    const farHeight = this.getFarHeightFromZ(z);
    const scale = this.height / farHeight;
    return scale;
  }

  getZFromScale(scale) {
    const scaleHeight = this.height / scale;
    const z = this.getZFromFarHeight(scaleHeight);
    return z;
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

  worldToScreen(x, y) {
    return worldToScreen(x, y, this.curTransform);
  }

  screenToWorld(x, y) {
    return screenToWorld(x, y, this.curTransform);
  }

  #finishCreate() {
    this.zoom = this.zoom.scaleExtent([
      this.getScaleFromZ(this.far),
      this.getScaleFromZ(this.near),
    ]);

    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      this.width / this.height,
      this.near,
      this.far + 1
    );

    this.camera.position.set(0, 0, this.far);

    this.webglView.call(this.zoom);
    this.zoom.transform(
      this.webglView,
      d3.zoomIdentity
        .translate(this.width / 2, this.height / 2)
        .scale(this.getScaleFromZ(this.far))
    );
  }

  #THREEHandleZoom(transform) {
    const scale = transform.k;
    const x = -(transform.x - this.width / 2) / scale;
    const y = (transform.y - this.height / 2) / scale;
    const z = this.getZFromScale(scale);
    this.camera.position.set(x, y, z);
  }
}

class MeshGeometry {
  threeGeom = new THREE.BufferGeometry();
  triangleIdx = 0;
  positionAttribute;
  colorAttribute;

  constructor(numPoints, color = true) {
    this.threeGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3)
    );

    if (color)
      this.threeGeom.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3)
      );

    this.positionAttribute = this.threeGeom.getAttribute("position");
    this.colorAttribute = this.threeGeom.getAttribute("color");
  }

  addMeshCoords(meshCoords, transform, color, z = 0) {
    for (let j = 0; j < meshCoords.length; j++) {
      const [v1, v2, v3] = rotatePoints(
        copyCoords(meshCoords[j]),
        transform.rotate
      );

      this.positionAttribute.setXYZ(
        this.triangleIdx * 3 + 0,
        transform.x + v1[0],
        transform.y - v1[1],
        z
      );

      this.positionAttribute.setXYZ(
        this.triangleIdx * 3 + 1,
        transform.x + v2[0],
        transform.y - v2[1],
        z
      );

      this.positionAttribute.setXYZ(
        this.triangleIdx * 3 + 2,
        transform.x + v3[0],
        transform.y - v3[1],
        z
      );

      if (color) {
        this.colorAttribute.setXYZ(
          this.triangleIdx * 3 + 0,
          color.r,
          color.g,
          color.b
        );
        this.colorAttribute.setXYZ(
          this.triangleIdx * 3 + 1,
          color.r,
          color.g,
          color.b
        );
        this.colorAttribute.setXYZ(
          this.triangleIdx * 3 + 2,
          color.r,
          color.g,
          color.b
        );
      }

      this.triangleIdx++;
    }
  }

  finish() {
    this.threeGeom.setDrawRange(0, this.triangleIdx * 3);
  }
}
