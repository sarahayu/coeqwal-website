import * as d3 from "d3";
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
  return Math.floor((Math.sqrt(AREA / 3.14) * 2) / 2);
}

// assuming nodes is already ordered and first nodes are going to be put on the bottom
export function placeDropsUsingPhysics(x, y, nodes, reuse = false) {
  if (reuse && DET_CACHE && nodes.length === lastDetNodesLen) return DET_CACHE;

  // first generate random points within water droplet. we can stop here, but points might not be the most uniformly distributed

  if (!RANDO_CACHE || nodes.length !== lastNodesLen)
    RANDO_CACHE = d3
      .range(4)
      .map(() =>
        generateRandoPoints(generateWaterdrop(1), (lastNodesLen = nodes.length))
      );

  const WIDTH_AREA = radsToDropWidth(nodes.map(({ r }) => r));

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
