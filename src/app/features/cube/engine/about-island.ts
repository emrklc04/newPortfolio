/**
 * Builds the About island: a single castle standing in a forest clearing, ringed by woodland and
 * a wall of mountains at the rim.
 *
 * Unlike the other two islands this one has exactly one interactive object — the castle — so the
 * scenery carries the whole character of the place. Content is built in local Y-up space sitting
 * on the island base's top face (local y = 0).
 */
import {
  BufferGeometry,
  CatmullRomCurve3,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  SpriteMaterial,
  Vector3,
} from 'three';
import { IslandBuildResult, place } from './island-decor';
import { flatTopRadius } from './island-base';
import { findIsland } from './islands';
import { addGlow } from './glow';
import { kitPart } from './kit-loader';
import { FANTASY, Kit, Kits } from './kits';
import { cloneModel, normalizeModel, normalizeModelToSize } from './model-utils';
import { ScatterCircle, scatterPoints } from './scatter';
import { InteractiveObject } from './types';

const ISLAND = findIsland('about');
const ISLAND_RADIUS = ISLAND.radius;

/**
 * Scenery is seated at y = 0, so anything standing past this hangs over the island's rounded rim.
 * Multi-trunk models (groves, mountain clusters) need their whole footprint inside it; a single
 * tree only needs its trunk, so its canopy may overhang the edge as it naturally would.
 */
const FLAT_RADIUS = flatTopRadius(ISLAND.radius, ISLAND.radialSegments);

/** World-space height of the castle. Matches this island's contentHeight in islands.ts, which the
 * camera framing and the title chip are both sized against. */
const CASTLE_HEIGHT = 6.5;

/** Clearing kept free around the castle so the forest never crowds it. */
const CASTLE_CLEARING = 3.0;

/** Forest band: starts outside the clearing and runs to the foot of the mountains. Groves are
 * multi-trunk clusters, so the band's outer edge leaves room for half of one. */
const FOREST_INNER = 3.2;
const GROVE_SIZE = 1.9;
const FOREST_OUTER = 6.2;

/**
 * Mountains stand in a broken ring around the rim, behind the treeline. Like the groves, a cluster
 * has to sit fully on level ground, so the outer edge leaves room for half its width.
 */
const MOUNTAIN_GROUP_SIZE = 3.05;
const MOUNTAIN_INNER = 5.4;
const MOUNTAIN_OUTER = FLAT_RADIUS - MOUNTAIN_GROUP_SIZE / 2;
const RIVER_WIDTH = 0.78;
const RIVER_BANK_WIDTH = 0.2;
const RIVER_SEGMENTS = 100;

/** The stream wanders along the eastern side of the clearing, bending around the forest band. */
const RIVER_PATH = new CatmullRomCurve3(
  [
    new Vector3(3.35, 0, -6.55),
    new Vector3(3.9, 0, -5.15),
    new Vector3(4.95, 0, -3.65),
    new Vector3(5.0, 0, -2.0),
    new Vector3(4.35, 0, -0.45),
    new Vector3(3.75, 0, 1.3),
    new Vector3(3.65, 0, 3.05),
    new Vector3(4.35, 0, 4.75),
    new Vector3(4.75, 0, 6.5),
  ],
  false,
  'catmullrom',
  0.18,
);
const WATER_TIME = { value: 0 };

export function buildAboutIsland(kits: Kits): IslandBuildResult {
  const group = new Group();
  const detailGroup = new Group();

  const { interactiveObjects, clearances } = addCastle(group, kits.fantasy);
  const fireflyUpdate = addFireflies(group);
  const riverClearances = createRiverClearances();
  clearances.push(...riverClearances);
  addRiverSourceMountain(group, kits.fantasy, clearances);
  const riverUpdate = addRiver(group);

  addMountains(group, kits.fantasy, clearances);
  addForest(group, kits.fantasy, clearances);
  addUndergrowth(detailGroup, kits.fantasy, clearances);

  group.add(detailGroup);
  return {
    group,
    detailGroup,
    interactiveObjects,
    update: (elapsedSeconds) => {
      fireflyUpdate(elapsedSeconds);
      riverUpdate(elapsedSeconds);
    },
  };
}

/** Restore the original Fantasy mountain at the river source, without the waterfall. */
function addRiverSourceMountain(group: Group, kit: Kit, clearances: ScatterCircle[]): void {
  const source = { x: 2.55, z: -4.75 };
  place(group, kit, FANTASY.mountains[0], source.x, source.z, 31, () => 3.8, normalizeModel);
  clearances.push({ x: source.x, z: source.z, radius: 2.0 });
}

/** Add scrolling turbulence, smooth vertex waves, and moving caustic highlights to water. */
function createFlowingWaterMaterial(color: number): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color,
    emissive: 0x0b313a,
    emissiveIntensity: 0.18,
    roughness: 0.16,
    metalness: 0.08,
    side: DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uWaterTime'] = WATER_TIME;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       attribute vec2 waterUv;
       varying vec2 vWaterUv;
       varying vec3 vWaterPosition;
       uniform float uWaterTime;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vWaterUv = waterUv;
       vWaterPosition = position;
       float broadWave = sin(position.x * 1.8 + position.z * 1.25 - uWaterTime * 1.4);
       float crossWave = sin(position.x * 3.2 - position.z * 2.1 + uWaterTime * 1.05);
       transformed.y += broadWave * 0.018 + crossWave * 0.009;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec2 vWaterUv;
       varying vec3 vWaterPosition;
       uniform float uWaterTime;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      `vec4 diffuseColor = vec4( diffuse, opacity );
       float flowV = vWaterUv.y * 29.0 - uWaterTime * 1.1;
       float crossV = vWaterUv.x * 24.0 + sin(flowV * 0.17 + uWaterTime) * 2.1;
       float turbulenceA = sin(flowV + sin(crossV * 0.75 + uWaterTime * 0.7));
       float turbulenceB = sin(flowV * 1.63 - crossV * 0.48 + sin(flowV * 0.31));
       float turbulence = turbulenceA * 0.58 + turbulenceB * 0.42;
       float crest = smoothstep(0.48, 0.96, turbulence);
       float depth = 0.78 + (0.5 + turbulence * 0.5) * 0.16;
       vec3 waterTint = mix(diffuse * depth, diffuse * 1.14 + vec3(0.025, 0.09, 0.1), crest * 0.52);
       diffuseColor.rgb = waterTint;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor = mix(roughnessFactor, 0.075, crest * 0.65);`,
    );
  };
  material.customProgramCacheKey = () => 'flowing-water-river-v1';
  return material;
}

/** Warm fireflies drift in loose, staggered loops around the castle clearing at dusk. */
function addFireflies(group: Group): (elapsedSeconds: number) => void {
  const geometry = new SphereGeometry(0.09, 6, 5);
  const fireflies = Array.from({ length: 9 }, (_, index) => {
    const color = index % 3 === 0 ? 0xffe69a : 0xd7ffa0;
    const material = new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const mesh = new Mesh(geometry, material);
    const glow = addGlow(mesh, new Vector3(), color, 0.52, 0.9);
    group.add(mesh);
    return {
      mesh,
      material,
      glowMaterial: glow.material as SpriteMaterial,
      phase: (index / 9) * Math.PI * 2,
      radius: 2.6 + (index % 3) * 0.32,
    };
  });

  return (elapsedSeconds) => {
    for (const { mesh, material, glowMaterial, phase, radius } of fireflies) {
      const time = elapsedSeconds * (0.22 + (phase % 0.2)) + phase;
      mesh.position.set(
        Math.cos(time) * radius,
        1.15 + Math.sin(time * 1.7) * 0.45,
        Math.sin(time) * radius,
      );
      const pulse = (Math.sin(elapsedSeconds * 2.2 + phase) + 1) / 2;
      material.opacity = 0.72 + pulse * 0.25;
      glowMaterial.opacity = 0.65 + pulse * 0.25;
    }
  };
}

/** A winding stream with shaped banks, scattered stones, and flowing surface highlights. */
function addRiver(group: Group): (elapsedSeconds: number) => void {
  const waterMaterial = createFlowingWaterMaterial(0x3b879a);
  const water = new Mesh(createRiverRibbon(RIVER_WIDTH / 2), waterMaterial);
  water.position.y = 0.035;
  group.add(water);

  const bankMaterial = new MeshStandardMaterial({
    color: 0x6d765b,
    roughness: 1,
    flatShading: true,
    side: DoubleSide,
  });
  for (const side of [-1, 1]) {
    const bank = new Mesh(createRiverRibbon(RIVER_WIDTH / 2 + RIVER_BANK_WIDTH, side), bankMaterial);
    bank.position.y = 0.018;
    group.add(bank);
  }

  const bankStoneGeometry = new DodecahedronGeometry(0.19, 0);
  const bankStoneMaterial = new MeshStandardMaterial({ color: 0x898778, roughness: 1, flatShading: true });
  for (let index = 0; index < 16; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const stone = new Mesh(bankStoneGeometry, bankStoneMaterial);
    const progress = (index + 0.5) / 16;
    const point = RIVER_PATH.getPointAt(progress);
    const tangent = RIVER_PATH.getTangentAt(progress);
    stone.position.set(
      point.x - tangent.z * side * (RIVER_WIDTH / 2 + 0.3 + (index % 3) * 0.08),
      0.11,
      point.z + tangent.x * side * (RIVER_WIDTH / 2 + 0.3 + (index % 3) * 0.08),
    );
    stone.scale.set(1.2, 0.7, 0.9);
    stone.rotation.set(index * 0.2, index * 0.61, index * 0.13);
    group.add(stone);
  }

  const glintGeometry = new PlaneGeometry(0.075, 0.48);
  glintGeometry.rotateX(-Math.PI / 2);
  const glints = Array.from({ length: 9 }, (_, index) => {
    const material = new MeshBasicMaterial({
      color: 0xc5f2f0,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    const mesh = new Mesh(glintGeometry, material);
    group.add(mesh);
    return { mesh, material, phase: index / 9, side: index % 2 === 0 ? -1 : 1 };
  });

  return (elapsedSeconds) => {
    WATER_TIME.value = elapsedSeconds;
    glints.forEach(({ mesh, material, phase, side }, index) => {
      // Each streak follows the current of the river, with a slow lateral drift and soft pulse.
      const progress = (phase + elapsedSeconds * (0.025 + (index % 3) * 0.003)) % 1;
      const point = RIVER_PATH.getPointAt(progress);
      const tangent = RIVER_PATH.getTangentAt(progress);
      const lateral = Math.sin(elapsedSeconds * 0.7 + index * 1.9) * 0.1;
      const offset = side * (0.12 + lateral);
      mesh.position.set(
        point.x - tangent.z * offset,
        0.064 + Math.sin(elapsedSeconds * 2 + index) * 0.006,
        point.z + tangent.x * offset,
      );
      mesh.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI;
      const pulse = (Math.sin(elapsedSeconds * 1.4 + index * 1.7) + 1) / 2;
      material.opacity = 0.22 + pulse * 0.4;
    });
  };
}

function createRiverClearances(): ScatterCircle[] {
  return Array.from({ length: 45 }, (_, index) => {
    const point = RIVER_PATH.getPointAt(index / 44);
    return { x: point.x, z: point.z, radius: 1.7 };
  });
}

/** Build a low-profile ribbon along the smoothed centre line. Side is used for the outer bank. */
function createRiverRibbon(halfWidth: number, side = 0): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const inner = side === 0 ? -halfWidth : side * (RIVER_WIDTH / 2);
  const outer = side === 0 ? halfWidth : side * (RIVER_WIDTH / 2 + RIVER_BANK_WIDTH);

  for (let index = 0; index <= RIVER_SEGMENTS; index++) {
    const point = RIVER_PATH.getPointAt(index / RIVER_SEGMENTS);
    const tangent = RIVER_PATH.getTangentAt(index / RIVER_SEGMENTS);
    const normalX = -tangent.z;
    const normalZ = tangent.x;
    positions.push(
      point.x + normalX * inner, 0, point.z + normalZ * inner,
      point.x + normalX * outer, 0, point.z + normalZ * outer,
    );
    uvs.push(0, index / RIVER_SEGMENTS, 1, index / RIVER_SEGMENTS);

    if (index < RIVER_SEGMENTS) {
      const start = index * 2;
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('waterUv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The castle at the centre, and the island's only interactive object. */
function addCastle(
  group: Group,
  kit: Kit,
): { interactiveObjects: InteractiveObject[]; clearances: ScatterCircle[] } {
  const castle = cloneModel(kitPart(kit, FANTASY.castle));
  normalizeModel(castle, CASTLE_HEIGHT);
  castle.userData['interactive'] = true;
  group.add(castle);

  const labelAnchor = new Object3D();
  labelAnchor.position.set(0, CASTLE_HEIGHT + 0.5, 0);
  group.add(labelAnchor);

  return {
    interactiveObjects: [
      {
        object: castle,
        kind: 'about',
        // The About panel is static content, so there is nothing to carry through.
        payload: null,
        label: 'Über mich',
        labelAnchor,
      },
    ],
    clearances: [{ x: 0, z: 0, radius: CASTLE_CLEARING }],
  };
}

/**
 * A broken ring of mountains at the rim. Placed before the forest so the trees scatter around
 * them, and deliberately varied in size so the ring reads as a range rather than a fence.
 */
function addMountains(group: Group, kit: Kit, clearances: ScatterCircle[]): void {
  const peaks = scatterPoints({
    seed: 6421,
    count: 13,
    minRadius: MOUNTAIN_INNER,
    maxRadius: MOUNTAIN_OUTER,
    minDistance: 1.7,
    exclusions: clearances,
  });

  peaks.forEach((point, index) => {
    // Every third peak is a cluster, which breaks up the rhythm of single summits.
    const isGroup = index % 3 === 2;
    const parts = isGroup ? FANTASY.mountainGroups : FANTASY.mountains;
    const part = parts[index % parts.length];

    // Clusters are scaled by their largest dimension, single peaks by height. The cluster models
    // are roughly twice as wide as they are tall, so sizing those by height instead would spread
    // one of them across half the island.
    const size = isGroup ? MOUNTAIN_GROUP_SIZE : 2.2 + ((index * 11) % 5) * 0.22;
    const normalize = isGroup ? normalizeModelToSize : normalizeModel;
    place(group, kit, part, point.x, point.z, index * 73, () => size, normalize);

    // Trees are kept out of the footprint so they don't sprout through the rock.
    clearances.push({ x: point.x, z: point.z, radius: isGroup ? 1.5 : 0.85 });
  });
}

/** Dense woodland filling the band between the castle clearing and the mountains. */
function addForest(group: Group, kit: Kit, clearances: readonly ScatterCircle[]): void {
  const groves = scatterPoints({
    seed: 1879,
    count: 26,
    minRadius: FOREST_INNER,
    maxRadius: FOREST_OUTER,
    minDistance: 1.15,
    exclusions: clearances,
  });
  groves.forEach((point, index) => {
    const part = FANTASY.treeGroups[index % FANTASY.treeGroups.length];
    place(group, kit, part, point.x, point.z, index * 59, () => GROVE_SIZE);
  });

  // Single trees fill the gaps between the groves and carry on past the mountains to the rim, so
  // the outer band is woodland rather than bare grass.
  const singles = scatterPoints({
    seed: 2963,
    count: 72,
    minRadius: FOREST_INNER - 0.4,
    maxRadius: FLAT_RADIUS,
    minDistance: 0.72,
    exclusions: clearances,
  });
  singles.forEach((point, index) => {
    // Pines thicken toward the mountains, broadleaf stays nearer the castle.
    const distance = Math.hypot(point.x, point.z);
    const parts = distance > FOREST_OUTER * 0.78 ? FANTASY.pines : FANTASY.trees;
    const part = parts[index % parts.length];
    const height = 1.1 + ((index * 17) % 6) * 0.13;
    place(group, kit, part, point.x, point.z, index * 37, () => height, normalizeModel);
  });
}

/** Boulders and loose stones across the forest floor. */
function addUndergrowth(group: Group, kit: Kit, clearances: readonly ScatterCircle[]): void {
  const boulderSize = 0.75;
  const boulders = scatterPoints({
    seed: 4457,
    count: 26,
    minRadius: 2.4,
    maxRadius: FLAT_RADIUS - boulderSize / 2,
    minDistance: 0.95,
    exclusions: clearances,
  });
  boulders.forEach((point, index) => {
    const part = FANTASY.rocks[index % FANTASY.rocks.length];
    place(group, kit, part, point.x, point.z, index * 83, () => boulderSize);
  });

  const stoneSize = 0.45;
  const stones = scatterPoints({
    seed: 5569,
    count: 40,
    minRadius: 1.9,
    maxRadius: FLAT_RADIUS - stoneSize / 2,
    minDistance: 0.6,
    exclusions: clearances,
  });
  stones.forEach((point, index) => {
    const part = FANTASY.pebbles[index % FANTASY.pebbles.length];
    place(group, kit, part, point.x, point.z, index * 29, () => stoneSize);
  });
}
