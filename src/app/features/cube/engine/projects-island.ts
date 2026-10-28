/**
 * Builds the Projects island: one Medieval Village MegaKit house per project, standing in a
 * village green ringed by Ultimate Fantasy RTS woodland.
 *
 * Content is built in local Y-up space sitting on the island base's top face (local y = 0).
 */
import {
  BoxGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PointLight,
} from 'three';
import { Project } from '../../../core/models/project.model';
import { HouseBlueprint, buildHouse, houseFootprintRadius } from './house-builder';
import { IslandBuildResult, place } from './island-decor';
import { flatTopRadius } from './island-base';
import { findIsland } from './islands';
import { kitPart } from './kit-loader';
import { FANTASY, Kit, Kits, MEDIEVAL } from './kits';
import { cloneModel, normalizeModel, normalizeModelToSize, tintModelMaterial } from './model-utils';
import { ScatterCircle, scatterPoints } from './scatter';
import { InteractiveObject } from './types';

const ISLAND = findIsland('projects');
const ISLAND_RADIUS = ISLAND.radius;

/**
 * Scenery is seated at y = 0, so anything standing past this hangs over the island's rounded rim.
 * Multi-trunk models (groves, rock clusters) need their whole footprint inside it; a single tree
 * only needs its trunk, so its canopy may overhang the edge as it naturally would.
 */
const FLAT_RADIUS = flatTopRadius(ISLAND.radius, ISLAND.radialSegments);

/** Match Contact island house heights by storey count. */
const HOUSE_HEIGHTS = { 1: 1.8, 2: 2.3 } as const;

/**
 * Houses sit on a ring around the village green. With only a handful of them, spacing the angles
 * evenly beats a random scatter — a scatter reliably clumps two or three together and leaves a
 * bare arc, which both hides houses behind each other and piles their labels up on screen.
 */
const HOUSE_RING_RADIUS = 4.45;
/** Per-house radial and angular wobble, so the ring doesn't read as a drawn circle. */
const HOUSE_RING_JITTER = 0.75;
const HOUSE_ANGLE_JITTER = Math.PI / 13;

/**
 * Trees occupy a narrow band around the island's rim. Scattering them across the whole island
 * buries the houses, and even a wide outer band hides the near-side ones from the orbiting camera
 * — the band has to stay thin enough to read as a fringe rather than a forest you look through.
 */
const TREELINE_INNER = 5.9;
/** Single trunks reach the flat edge; groves are pulled in by half their own width. */
const TREELINE_OUTER = FLAT_RADIUS;
const GROVE_SIZE = 1.9;
const GROVE_OUTER = FLAT_RADIUS - GROVE_SIZE / 2;

/** Extra clearance around each house that greenery is kept out of. */
const HOUSE_CLEARANCE = 0.9;
const CAMPFIRE_CLEARANCE = 1.15;

/**
 * The blueprint variants houses are drawn from, cycled by project index. Mixing footprint, storey
 * count and wall material is what keeps the village from reading as the same building
 * copy-pasted six times.
 *
 * Every entrance is on side 0 (+z), then each house is rotated toward the village green so all
 * six front doors face the island centre.
 */
const BLUEPRINTS: readonly Omit<HouseBlueprint, 'seed'>[] = [
  { widthModules: 2, depthModules: 2, storeys: 2, style: 'plaster', entranceSide: 0 },
  { widthModules: 3, depthModules: 2, storeys: 1, style: 'brick', entranceSide: 0 },
  { widthModules: 2, depthModules: 3, storeys: 2, style: 'brick', entranceSide: 0 },
  { widthModules: 3, depthModules: 3, storeys: 1, style: 'plaster', entranceSide: 0 },
  { widthModules: 2, depthModules: 2, storeys: 1, style: 'plaster', entranceSide: 0 },
  { widthModules: 3, depthModules: 3, storeys: 2, style: 'brick', entranceSide: 0 },
];

export function buildProjectsIsland(projects: Project[], kits: Kits): IslandBuildResult {
  const group = new Group();
  const detailGroup = new Group();

  const { interactiveObjects, clearances } = addHouses(group, kits.medieval, projects);
  clearances.push({ x: 0, z: 0, radius: CAMPFIRE_CLEARANCE });

  addWoodland(group, kits.fantasy, clearances);
  addGroundDetail(detailGroup, kits.fantasy, clearances);
  // Keep the central path and village props visible at every zoom level; only scattered small
  // pebbles are part of the distance-culled detail group.
  addFootpath(group, kits.fantasy);
  addVillageProps(group, kits.medieval, clearances);
  addCampfire(group);

  group.add(detailGroup);
  return { group, detailGroup, interactiveObjects };
}

/** Low-poly logs, a ring of stones, flickering flames, and smoke at the village centre. */
function addCampfire(group: Group): void {
  const stoneMaterial = new MeshStandardMaterial({
    color: 0x6d675d,
    roughness: 1,
    flatShading: true,
  });
  const logMaterial = new MeshStandardMaterial({
    color: 0x493326,
    roughness: 1,
    flatShading: true,
  });
  const flameMaterial = new MeshStandardMaterial({
    color: 0xff6b20,
    emissive: 0xf04408,
    emissiveIntensity: 1.7,
    roughness: 1,
    flatShading: true,
  });
  const innerFlameMaterial = new MeshStandardMaterial({
    color: 0xffd04d,
    emissive: 0xff8b16,
    emissiveIntensity: 1.9,
    roughness: 1,
    flatShading: true,
  });

  const stoneGeometry = new DodecahedronGeometry(0.22, 0);
  for (let index = 0; index < 9; index++) {
    const angle = (index / 9) * Math.PI * 2;
    const stone = new Mesh(stoneGeometry, stoneMaterial);
    stone.position.set(Math.cos(angle) * 0.62, 0.13, Math.sin(angle) * 0.62);
    stone.rotation.set(index * 0.37, index * 0.71, index * 0.29);
    stone.scale.set(0.8 + (index % 3) * 0.12, 0.65, 0.8 + ((index + 1) % 3) * 0.1);
    group.add(stone);
  }

  const logGeometry = new BoxGeometry(0.78, 0.12, 0.14);
  for (let index = 0; index < 3; index++) {
    const log = new Mesh(logGeometry, logMaterial);
    log.position.set(0, 0.12 + index * 0.035, 0);
    log.rotation.y = (index / 3) * Math.PI;
    group.add(log);
  }

  const fireLight = new PointLight(0xff9b42, 1.15, 3.2, 2);
  fireLight.position.set(0, 0.72, 0);
  group.add(fireLight);

  const startedAt = performance.now() / 1000;
  const flameGeometry = new ConeGeometry(0.31, 0.88, 6, 1);
  const innerFlameGeometry = new ConeGeometry(0.2, 0.58, 5, 1);
  const flames = [
    { geometry: flameGeometry, material: flameMaterial, size: 1, phase: 0, x: 0, z: 0 },
    {
      geometry: flameGeometry,
      material: flameMaterial,
      size: 0.68,
      phase: 2.1,
      x: -0.16,
      z: 0.08,
    },
    {
      geometry: innerFlameGeometry,
      material: innerFlameMaterial,
      size: 0.86,
      phase: 4.2,
      x: 0.08,
      z: -0.06,
    },
  ];

  flames.forEach(({ geometry, material, size, phase, x, z }) => {
    const flame = new Mesh(geometry, material);
    flame.position.set(x, 0.64, z);
    flame.scale.set(size, size, size);
    group.add(flame);

    flame.onBeforeRender = () => {
      const time = performance.now() / 1000 - startedAt + phase;
      const flicker =
        0.88 + Math.sin(time * 8.5) * 0.13 + Math.sin(time * 13.7) * 0.06;
      flame.scale.set(size * (1.04 - flicker * 0.08), size * flicker, size * flicker);
      flame.position.y = 0.64 + Math.sin(time * 7.2) * 0.045;
      flame.rotation.y = time * 0.45 + phase;
      flame.rotation.z = Math.sin(time * 5.1) * 0.1;
      fireLight.intensity = 0.95 + flicker * 0.45;
    };
  });

  const smokeGeometry = new DodecahedronGeometry(0.14, 0);
  const smokeCount = 5;
  for (let index = 0; index < smokeCount; index++) {
    const smokeMaterial = new MeshStandardMaterial({
      color: 0x827c74,
      roughness: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const puff = new Mesh(smokeGeometry, smokeMaterial);
    const phase = index / smokeCount;
    group.add(puff);

    puff.onBeforeRender = () => {
      const progress = ((performance.now() / 1000 - startedAt) / 3.8 + phase) % 1;
      puff.position.set(
        Math.sin(progress * Math.PI * 2 + index) * 0.18,
        0.95 + progress * 1.45,
        Math.cos(progress * Math.PI * 2 + index) * 0.12,
      );
      const size = 0.7 + progress * 1.9;
      puff.scale.set(size, size, size);
      smokeMaterial.opacity = 0.32 * (1 - progress);
    };
  }
}

/** One house per project, ringed around the village green. */
function addHouses(
  group: Group,
  kit: Kit,
  projects: Project[],
): { interactiveObjects: InteractiveObject[]; clearances: ScatterCircle[] } {
  const interactiveObjects: InteractiveObject[] = [];
  const clearances: ScatterCircle[] = [];

  projects.forEach((project, index) => {
    // Deterministic wobble from the index, so the ring is irregular but stable across reloads.
    const angle =
      (index / projects.length) * Math.PI * 2 + Math.sin(index * 12.99) * HOUSE_ANGLE_JITTER;
    const radius = HOUSE_RING_RADIUS + Math.cos(index * 4.1) * HOUSE_RING_JITTER;
    const plot = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };

    const blueprint: HouseBlueprint = {
      ...BLUEPRINTS[index % BLUEPRINTS.length],
      seed: project.id,
    };
    const house = buildHouse(kit, blueprint);
    const houseHeight = HOUSE_HEIGHTS[blueprint.storeys];

    // Slightly enlarged village houses, sitting flush on y = 0.
    normalizeModel(house, houseHeight);
    house.position.x += plot.x;
    house.position.z += plot.z;
    // The entrance is on local +Z; point that side inward, with slight variation so the ring
    // doesn't look mechanical.
    house.rotation.y =
      Math.atan2(-plot.x, -plot.z) + (((index * 37) % 21) - 10) * (Math.PI / 180);
    house.userData['interactive'] = true;
    group.add(house);

    // Scale is uniform, so the kit-space footprint converts with the house's own scale factor.
    const worldRadius = houseFootprintRadius(blueprint) * house.scale.x;
    clearances.push({ x: plot.x, z: plot.z, radius: worldRadius + HOUSE_CLEARANCE });

    const labelAnchor = new Object3D();
    labelAnchor.position.set(plot.x, houseHeight + 0.45, plot.z);
    group.add(labelAnchor);

    interactiveObjects.push({
      object: house,
      kind: 'project',
      payload: project,
      label: project.title,
      labelAnchor,
    });
  });

  return { interactiveObjects, clearances };
}

/** Trees and boulders filling the island outside the village. */
function addWoodland(group: Group, kit: Kit, clearances: readonly ScatterCircle[]): void {
  // Groves first: they are the bulk of the treeline, and the single trees fill in around them.
  const groves = scatterPoints({
    seed: 1301,
    count: 18,
    minRadius: TREELINE_INNER - 0.8,
    maxRadius: GROVE_OUTER,
    minDistance: 1.4,
    exclusions: clearances,
  });
  groves.forEach((point, index) => {
    const part = FANTASY.treeGroups[index % FANTASY.treeGroups.length];
    placeProjectTree(group, kit, part, point.x, point.z, index * 53, GROVE_SIZE);
  });

  const trees = scatterPoints({
    seed: 2207,
    count: 34,
    minRadius: TREELINE_INNER - 0.5,
    maxRadius: TREELINE_OUTER,
    minDistance: 0.85,
    exclusions: clearances,
  });
  const treeBandStart = TREELINE_INNER - 0.5;
  const pineLine = treeBandStart + (TREELINE_OUTER - treeBandStart) * 0.39;
  trees.forEach((point, index) => {
    // Pines toward the island's edge, broadleaf closer in — reads as a treeline.
    const distance = Math.hypot(point.x, point.z);
    const species = distance > pineLine ? FANTASY.pines : FANTASY.trees;
    const part = species[index % species.length];
    // Kept at a modest scale so the woodland frames the village instead of crowding it.
    const height = 1.1 + ((index * 17) % 6) * 0.13;
    placeProjectTree(group, kit, part, point.x, point.z, index * 37, height, normalizeModel);
  });

  const rockSize = 0.9;
  const rocks = scatterPoints({
    seed: 3109,
    count: 14,
    minRadius: 2.0,
    maxRadius: FLAT_RADIUS - rockSize / 2,
    minDistance: 1.5,
    exclusions: clearances,
  });
  rocks.forEach((point, index) => {
    const part = FANTASY.rocks[index % FANTASY.rocks.length];
    place(group, kit, part, point.x, point.z, index * 83, () => rockSize);
  });
}

/** Keeps foliage on every Projects tree in one muted forest-green palette. */
function placeProjectTree(
  group: Group,
  kit: Kit,
  part: string,
  x: number,
  z: number,
  yawSeed: number,
  size: number,
  normalize: (object: Object3D, target: number) => void = normalizeModelToSize,
): void {
  const tree = cloneModel(kitPart(kit, part));
  tintModelMaterial(tree, 'Green', 0x618248);
  normalize(tree, size);
  tree.position.x += x;
  tree.position.z += z;
  tree.rotation.y = (yawSeed % 360) * (Math.PI / 180);
  group.add(tree);
}

/** Loose pebbles across the village — these small details can be hidden at a distance. */
function addGroundDetail(group: Group, kit: Kit, clearances: readonly ScatterCircle[]): void {
  const stoneSize = 0.4;
  const stones = scatterPoints({
    seed: 7219,
    count: 46,
    minRadius: 0.6,
    maxRadius: FLAT_RADIUS - stoneSize / 2,
    minDistance: 0.55,
    exclusions: clearances,
  });
  stones.forEach((point, index) => {
    const part = FANTASY.pebbles[index % FANTASY.pebbles.length];
    place(group, kit, part, point.x, point.z, index * 97, () => stoneSize);
  });

}

/** A ring of stepping stones around the village green, tying the houses together. */
function addFootpath(group: Group, kit: Kit): void {
  const stoneCount = 26;
  // Just inside the houses, so the path runs past their front doors rather than through them.
  const pathRadius = HOUSE_RING_RADIUS - 1.5;

  for (let index = 0; index < stoneCount; index++) {
    const angle = (index / stoneCount) * Math.PI * 2;
    // Wobble the ring so it reads as a worn path rather than a drawn circle.
    const radius = pathRadius + Math.sin(index * 2.3) * 0.28;
    // The fantasy kit has no dedicated paving slabs, so the path is laid from its small rocks
    // pressed flat — wide and low enough to read as stepping stones rather than boulders.
    const stone = cloneModel(kitPart(kit, FANTASY.pebbles[index % FANTASY.pebbles.length]));
    normalizeModelToSize(stone, 0.6);
    stone.scale.y *= 0.35;
    stone.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    stone.rotation.y = ((index * 31) % 360) * (Math.PI / 180);
    group.add(stone);
  }
}

/** Crates, a wagon and fence sections dressing the village green. */
function addVillageProps(group: Group, kit: Kit, clearances: readonly ScatterCircle[]): void {
  const props: ReadonlyArray<{ part: string; size: number }> = [
    { part: MEDIEVAL.crate, size: 0.42 },
    { part: MEDIEVAL.wagon, size: 1.1 },
    { part: MEDIEVAL.fence, size: 0.8 },
    { part: MEDIEVAL.crate, size: 0.34 },
    { part: MEDIEVAL.fence, size: 0.8 },
  ];

  const points = scatterPoints({
    seed: 8641,
    count: props.length,
    minRadius: 1.1,
    maxRadius: HOUSE_RING_RADIUS - 2.0,
    minDistance: 1.2,
    exclusions: clearances,
  });

  points.forEach((point, index) => {
    const { part, size } = props[index];
    place(group, kit, part, point.x, point.z, index * 61, () => size);
  });
}
