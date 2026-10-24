/**
 * Builds the Projects island: one Medieval Village MegaKit house per project, standing in a
 * village green ringed by Ultimate Fantasy RTS woodland.
 *
 * Content is built in local Y-up space sitting on the island base's top face (local y = 0).
 */
import { Group, Object3D } from 'three';
import { Project } from '../../../core/models/project.model';
import { HouseBlueprint, buildHouse, houseFootprintRadius } from './house-builder';
import { IslandBuildResult, place } from './island-decor';
import { flatTopRadius } from './island-base';
import { findIsland } from './islands';
import { kitPart } from './kit-loader';
import { FANTASY, Kit, Kits, MEDIEVAL } from './kits';
import { cloneModel, normalizeModel, normalizeModelToSize } from './model-utils';
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

/** World-space height each house is normalized to, whatever its blueprint. */
const HOUSE_HEIGHT = 3.1;

/**
 * Houses sit on a ring around the village green. With only a handful of them, spacing the angles
 * evenly beats a random scatter — a scatter reliably clumps two or three together and leaves a
 * bare arc, which both hides houses behind each other and piles their labels up on screen.
 */
const HOUSE_RING_RADIUS = 4.3;
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
const GROVE_SIZE = 1.8;
const GROVE_OUTER = FLAT_RADIUS - GROVE_SIZE / 2;

/** Extra clearance around each house that greenery is kept out of. */
const HOUSE_CLEARANCE = 0.9;

/**
 * The blueprint variants houses are drawn from, cycled by project index. Mixing footprint, storey
 * count and wall material is what keeps the village from reading as the same building
 * copy-pasted six times.
 *
 * Every entrance is on side 0 (+z) because each house is then rotated to face away from the
 * village green — that points all six front doors outward, where the orbiting camera can see them.
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

  addWoodland(group, kits.fantasy, clearances);
  addGroundDetail(detailGroup, kits.fantasy, clearances);
  addVillageProps(detailGroup, kits.medieval, clearances);

  group.add(detailGroup);
  return { group, detailGroup, interactiveObjects };
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

    // Built at the kit's own scale (~7 units tall); normalizing lands it on the island at a size
    // that works with the camera framing, and sits it flush on y = 0.
    normalizeModel(house, HOUSE_HEIGHT);
    house.position.x += plot.x;
    house.position.z += plot.z;
    // Turn each house to face roughly outward from the village green, with a little variation so
    // the ring doesn't look mechanical.
    house.rotation.y = Math.atan2(plot.x, plot.z) + (((index * 37) % 21) - 10) * (Math.PI / 180);
    house.userData['interactive'] = true;
    group.add(house);

    // Scale is uniform, so the kit-space footprint converts with the house's own scale factor.
    const worldRadius = houseFootprintRadius(blueprint) * house.scale.x;
    clearances.push({ x: plot.x, z: plot.z, radius: worldRadius + HOUSE_CLEARANCE });

    const labelAnchor = new Object3D();
    labelAnchor.position.set(plot.x, HOUSE_HEIGHT + 0.45, plot.z);
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
    place(group, kit, part, point.x, point.z, index * 53, () => GROVE_SIZE);
  });

  const trees = scatterPoints({
    seed: 2207,
    count: 34,
    minRadius: TREELINE_INNER - 0.5,
    maxRadius: TREELINE_OUTER,
    minDistance: 0.85,
    exclusions: clearances,
  });
  trees.forEach((point, index) => {
    // Pines toward the island's edge, broadleaf closer in — reads as a treeline.
    const distance = Math.hypot(point.x, point.z);
    const species = distance > ISLAND_RADIUS * 0.85 ? FANTASY.pines : FANTASY.trees;
    const part = species[index % species.length];
    // Deliberately kept below the houses' 3.1 so the fringe never overtops the village.
    const height = 1.5 + ((index * 13) % 7) * 0.1;
    place(group, kit, part, point.x, point.z, index * 37, () => height, normalizeModel);
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

/** Loose stones across the village, plus the footpath — the small stuff hidden at a distance. */
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

  addFootpath(group, kit);
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
    { part: MEDIEVAL.stairs, size: 0.7 },
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
