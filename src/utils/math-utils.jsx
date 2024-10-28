import * as d3 from "d3";
import * as THREE from "three";
import Matter from "matter-js";

import { CIRC_RAD, DROP_HEIGHT } from "./render-utils";

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function generateWaterdrop(width) {
  const rad = width / 2;
  const partitions = 16;
  const delta = (Math.PI * 3) / 2 / partitions;

  const outer = [
    {
      x: Math.cos((Math.PI * 5) / 4) * rad,
      y: Math.sin((Math.PI * 5) / 4) * rad,
    },
    {
      x: 0,
      y: -Math.SQRT2 * rad,
    },
  ];

  for (let i = 0; i <= partitions; i++) {
    outer.push({
      x: Math.cos(i * delta - Math.PI / 4) * rad,
      y: Math.sin(i * delta - Math.PI / 4) * rad,
    });
  }

  return outer;
}

export function generateRandoPoints(shape, count) {
  const bounds = Matter.Bounds.create(shape);

  const minX = bounds.min.x,
    maxX = bounds.max.x,
    minY = bounds.min.y,
    maxY = bounds.max.y;

  const genX = d3.scaleLinear([minX, maxX]);
  const genY = d3.scaleLinear([minY, maxY]);

  const points = [];

  for (let i = 0; i < count; i++) {
    while (true) {
      const x = genX(Math.random());
      const y = genY(Math.random());

      if (Matter.Vertices.contains(shape, { x, y })) {
        points.push([x, y]);
        break;
      }
    }
  }

  return points;
}

// inner diameter of 1
export const WATERDROP_CAGE_COORDS = (function () {
  const outer = generateWaterdrop(3);
  const inner = generateWaterdrop(1);

  const coords = [];

  for (let i = 0; i < outer.length - 2; i++) {
    coords.push([
      outer[i],
      outer[i + (i < 2 ? 1 : 2)],
      inner[i + (i < 2 ? 1 : 2)],
      inner[i],
    ]);
  }

  return coords;
})();

let RANDO_CACHE;
let lastNodesLen;

let DET_CACHE;
let lastDetNodesLen;

export function radsToDropWidth(nodes) {
  const AREA = d3.sum(nodes.map((r) => r ** 2 * 3.14));
  return Math.floor(Math.sqrt(AREA / 3.14));
}

// assuming nodes is already ordered and first nodes are going to be put on the bottom
export function placeDropsUsingPhysics(
  x,
  y,
  nodes,
  packingFactor = 1,
  reuse = false
) {
  if (reuse && DET_CACHE && nodes.length === lastDetNodesLen) return DET_CACHE;

  // first generate random points within water droplet. we can stop here, but points might not be the most uniformly distributed

  if (!RANDO_CACHE || nodes.length !== lastNodesLen)
    RANDO_CACHE = d3
      .range(4)
      .map(() =>
        generateRandoPoints(generateWaterdrop(1), (lastNodesLen = nodes.length))
      );

  const WIDTH_AREA = radsToDropWidth(nodes.map(({ r }) => r)) / packingFactor;

  const randoPoints = RANDO_CACHE[
    Math.floor(Math.random() * RANDO_CACHE.length)
  ].map(([x, y]) => [x * WIDTH_AREA, y * WIDTH_AREA]);

  // thus, we use physics engine to take care of distributing the points evenly and based on radius
  const Engine = Matter.Engine,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite;

  const engine = Engine.create();

  const nodePos = randoPoints.sort((a, b) => b[1] - a[1]);

  const node_bodies = nodes.map(({ r, id }, i) => {
    const [nx, ny] = nodePos[i];
    return Bodies.circle(nx, ny, r, {
      restitution: 0,
      id: id,
    });
  });

  const parts = WATERDROP_CAGE_COORDS.map((quad) =>
    Matter.Body.create({
      position: Matter.Vertices.centre(quad),
      vertices: quad,
      isStatic: true,
    })
  );

  const cage = Matter.Body.create({
    isStatic: true,
  });

  Matter.Body.setParts(cage, parts);

  Matter.Body.setCentre(cage, { x: 0, y: 0 });
  Matter.Body.scale(cage, WIDTH_AREA, WIDTH_AREA);

  Composite.add(engine.world, [...node_bodies, cage]);

  // run engine for SECS second at FPS fps
  for (let i = 0, FPS = 60, SECS = 0.1; i < FPS * SECS; i++)
    Engine.update(engine, 1000 / FPS);

  const retVal = node_bodies.map(({ position, id }) => ({
    id,
    x: position.x + x,
    y: position.y + y,
  }));

  retVal.height = (WIDTH_AREA / 2 / CIRC_RAD) * DROP_HEIGHT;

  if (reuse && (!DET_CACHE || retVal.length !== lastDetNodesLen)) {
    DET_CACHE = retVal;
    lastDetNodesLen = retVal.length;
  }

  return retVal;
}

export function percentToRatioFilled(p) {
  p -= 0.0088;
  return clamp(
    (3.1304 * p ** 3 - 4.2384 * p ** 2 + 3.3471 * p + 0.0298) / 2.2326,
    0,
    1
  );
}

export function toRadians(a) {
  return (a * Math.PI) / 180;
}

export function interp(x, a, b) {
  return x * (b - a) + a;
}

export function revInterp(t, a, b) {
  return (t - a) / (b - a);
}

export function distSq([x1, y1], [x2, y2]) {
  return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}

export function dist([x1, y1], [x2, y2]) {
  return Math.sqrt(distSq([x1, y1], [x2, y2]));
}

export function getCenterDomRect(domRect) {
  return [domRect.left + domRect.width / 2, domRect.top + domRect.height / 2];
}

export function clipEnds([from, to], shortenByStart, shortenByEnd) {
  const len = Math.sqrt((from[0] - to[0]) ** 2 + (from[1] - to[1]) ** 2);
  const normed = [(to[0] - from[0]) / len, (to[1] - from[1]) / len];

  if (shortenByEnd === undefined) shortenByEnd = shortenByStart;

  from[0] += normed[0] * shortenByStart;
  from[1] += normed[1] * shortenByStart;
  to[0] -= normed[0] * shortenByEnd;
  to[1] -= normed[1] * shortenByEnd;

  return [from, to];
}

export function dropRadToDropHeight(rad) {
  return (1 + Math.SQRT2) * rad;
}

export function dropCenterCorrection({ rad, height }) {
  if (rad !== undefined) return dropRadToDropHeight(rad) * 0.08;
  return height * 0.08;
}

export function avgCoords(coords) {
  return [d3.mean(coords, (c) => c[0]), d3.mean(coords, (c) => c[1])];
}

export function rotatePoint(x, y, deg) {
  const vec = new THREE.Vector3(x, y, 0).applyEuler(
    new THREE.Euler(0, 0, toRadians(deg))
  );
  return [vec.x, vec.y];
}

// modifies arr!
export function rotatePoints(arr, deg) {
  for (const a of arr) {
    const newPoint = rotatePoint(a[0], a[1], deg);
    a[0] = newPoint[0];
    a[1] = newPoint[1];
  }
  return arr;
}

// https://stackoverflow.com/a/2450976
export function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
