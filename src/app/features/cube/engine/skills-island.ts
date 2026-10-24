/**
 * Builds the Skills island: one Downtown City skyscraper per skill, ringed around a round paved
 * plaza with a crossroads at its centre, inside a fringe of Ultimate Fantasy RTS woodland.
 *
 * Content is built in local Y-up space sitting on the island base's top face (local y = 0).
 */
import { CircleGeometry, Group, Mesh, MeshStandardMaterial, Object3D, RepeatWrapping } from 'three';
import { Skill } from '../../../core/models/skill.model';
import { IslandBuildResult, place } from './island-decor';
import { flatTopRadius } from './island-base';
import { findIsland } from './islands';
import { kitPart } from './kit-loader';
import { DOWNTOWN, FANTASY, Kit, Kits } from './kits';
import { cloneModel, normalizeModel, normalizeModelToSize } from './model-utils';
import { ScatterCircle, scatterPoints } from './scatter';
import { InteractiveObject } from './types';
import { TowerBlueprint, buildTower, towerFootprintRadius } from './tower-builder';

const ISLAND = findIsland('skills');
const ISLAND_RADIUS = ISLAND.radius;

/** Scenery is seated at y = 0, so anything standing past this hangs over the island's rounded
 * rim — see flatTopRadius. */
const FLAT_RADIUS = flatTopRadius(ISLAND.radius, ISLAND.radialSegments);

/** Towers ring a plaza, close enough in that the block reads as a downtown core but far enough
 * apart that none hides behind another. */
const TOWER_RING_RADIUS = 4.1;
const TOWER_RING_JITTER = 0.35;
const TOWER_ANGLE_JITTER = Math.PI / 20;

/** World-space height of the shortest and tallest tower. Each skill lands between the two. The
 * ceiling is the island's declared contentHeight in islands.ts, which the camera framing and the
 * title chip are both sized against. */
const TOWER_MIN_HEIGHT = 3.4;
const TOWER_MAX_HEIGHT = 5.4;

/** Extra clearance around each tower that street dressing and greenery are kept out of. */
const TOWER_CLEARANCE = 0.7;

/**
 * Heights of the island's stacked flat surfaces. They are spelled out rather than derived from one
 * another because the order matters: each has to sit clear above the one below, or it z-fights
 * with it — or worse, gets covered by it, which is what hides the ring road's open middle.
 */
const PLAZA_Y = 0.02;
const ROAD_Y = 0.05;
const ROUNDABOUT_Y = 0.09;

/** Radius of the round paved plaza the towers stand around. */
const PLAZA_RADIUS = TOWER_RING_RADIUS + 1.3;

/**
 * The ring road: one closed circle laid from four quarter-curve pieces, sized so its outer edge
 * passes inside the towers standing around it. The inner radius is where the paved island covers
 * the asphalt back up — the difference between the two is the carriageway width.
 */
const RING_ROAD_OUTER = 3.0;
const RING_ROAD_INNER = 1.7;

/** Outer radius of the kit's quarter-circle road piece, in its own units. */
const CURVE_NATIVE_OUTER = 10;

/** How far the curve's flat surface sits below its own origin, in native units. */
const CURVE_SURFACE_DROP = 0.15;

/** World units covered by one repeat of the plaza's paving texture. */
const PAVING_TILE_SIZE = 3;

/** Greenery is confined to the island's rim, outside the city block. */
const TREELINE_INNER = PLAZA_RADIUS + 0.1;
/** Single trunks may stand right up to the flat edge; their canopies overhang it as a tree's
 * would. There is no room for grove models here — the band between the plaza and the rim is
 * narrower than one is wide, so they would hang off the island. */
const TREELINE_OUTER = FLAT_RADIUS;

/**
 * Facade variants, cycled by skill index. Three styles across five towers means at most one
 * repeat, and footprint and floor count vary independently on top of that.
 */
const BLUEPRINTS: readonly Omit<TowerBlueprint, 'seed' | 'floors'>[] = [
  { widthModules: 2, depthModules: 2, style: 'metal', entranceSide: 0 },
  { widthModules: 2, depthModules: 3, style: 'brick', entranceSide: 0 },
  { widthModules: 3, depthModules: 2, style: 'trim', entranceSide: 0 },
  { widthModules: 2, depthModules: 2, style: 'brick', entranceSide: 0 },
  { widthModules: 3, depthModules: 3, style: 'metal', entranceSide: 0 },
];

/** Storey counts the towers are drawn from, paired with BLUEPRINTS by index so the skyline has a
 * deliberate high/low rhythm rather than a random one. */
const FLOOR_COUNTS = [6, 4, 7, 3, 5];

export function buildSkillsIsland(skills: Skill[], kits: Kits): IslandBuildResult {
  const group = new Group();
  const detailGroup = new Group();

  const { interactiveObjects, clearances } = addTowers(group, kits.downtown, skills);

  addStreet(group, detailGroup, kits.downtown, clearances);
  addGreenery(group, detailGroup, kits.fantasy, clearances);

  group.add(detailGroup);
  return { group, detailGroup, interactiveObjects };
}

/** One tower per skill, ringed around the plaza. */
function addTowers(
  group: Group,
  kit: Kit,
  skills: Skill[],
): { interactiveObjects: InteractiveObject[]; clearances: ScatterCircle[] } {
  const interactiveObjects: InteractiveObject[] = [];
  const clearances: ScatterCircle[] = [];

  skills.forEach((skill, index) => {
    const angle =
      (index / skills.length) * Math.PI * 2 + Math.sin(index * 12.99) * TOWER_ANGLE_JITTER;
    const radius = TOWER_RING_RADIUS + Math.cos(index * 4.1) * TOWER_RING_JITTER;
    const plot = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };

    const floors = FLOOR_COUNTS[index % FLOOR_COUNTS.length];
    const blueprint: TowerBlueprint = {
      ...BLUEPRINTS[index % BLUEPRINTS.length],
      floors,
      seed: skill.id * 97 + 13,
    };
    const tower = buildTower(kit, blueprint);

    // Taller blueprints get proportionally more world height, so the floor count stays legible
    // after normalization instead of every tower ending up the same size.
    const floorSpan = Math.max(...FLOOR_COUNTS) - Math.min(...FLOOR_COUNTS);
    const t = (floors - Math.min(...FLOOR_COUNTS)) / (floorSpan || 1);
    const height = TOWER_MIN_HEIGHT + t * (TOWER_MAX_HEIGHT - TOWER_MIN_HEIGHT);

    normalizeModel(tower, height);
    tower.position.x += plot.x;
    tower.position.z += plot.z;
    // Entrances face away from the plaza, toward the orbiting camera.
    tower.rotation.y = Math.atan2(plot.x, plot.z);
    tower.userData['interactive'] = true;
    group.add(tower);

    const worldRadius = towerFootprintRadius(blueprint) * tower.scale.x;
    clearances.push({ x: plot.x, z: plot.z, radius: worldRadius + TOWER_CLEARANCE });

    const labelAnchor = new Object3D();
    labelAnchor.position.set(plot.x, height + 0.5, plot.z);
    group.add(labelAnchor);

    interactiveObjects.push({
      object: tower,
      kind: 'skill',
      payload: skill,
      label: skill.name,
      labelAnchor,
    });
  });

  return { interactiveObjects, clearances };
}

/**
 * A round paved surface — the plaza the towers stand on, and the island inside the ring road.
 *
 * Built as geometry rather than placed from the kit, which only ships square tiles. The material
 * is borrowed from a kit part — cloned along with its textures, because other parts share that
 * material and must keep their own tiling.
 *
 * Paved in the kit's pale concrete rather than its asphalt, so the dark road laid on top reads
 * against it. (Tinting the asphalt lighter is not an option: the material colour multiplies the
 * texture, so any colour below white only darkens it further.)
 */
function createPavedDisc(kit: Kit, radius: number, y: number): Mesh {
  const geometry = new CircleGeometry(radius, 64);
  geometry.rotateX(-Math.PI / 2);

  const material = borrowMaterial(kitPart(kit, DOWNTOWN.concrete));
  // CircleGeometry lays UV 0..1 across the whole diameter, which would stretch one texture repeat
  // over the entire disc; repeating it at the source tile's density keeps the grain believable.
  const repeat = (radius * 2) / PAVING_TILE_SIZE;
  for (const map of [material.map, material.normalMap]) {
    if (map) {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.repeat.set(repeat, repeat);
      map.needsUpdate = true;
    }
  }

  const disc = new Mesh(geometry, material);
  // The island's grass surface is also at y = 0, and two coplanar surfaces z-fight.
  disc.position.y = y;
  return disc;
}

/** Clones the first standard material found on a kit part, along with its textures. */
function borrowMaterial(source: Object3D): MeshStandardMaterial {
  let found: MeshStandardMaterial | null = null;
  source.traverse((child) => {
    if (found || !(child instanceof Mesh)) {
      return;
    }
    const material = Array.isArray(child.material) ? child.material[0] : child.material;
    if (material instanceof MeshStandardMaterial) {
      found = material.clone();
      // `clone()` keeps the original texture objects, so changing wrapping or repeat here would
      // also change every other part using them.
      found.map = found.map?.clone() ?? null;
      found.normalMap = found.normalMap?.clone() ?? null;
    }
  });

  if (!found) {
    throw new Error(`No standard material found on kit part "${source.name}".`);
  }
  return found;
}

/**
 * One closed ring road, laid from the kit's four quarter-circle road pieces.
 *
 * Each piece pivots on its own arc centre, so placing all four at the island's centre and turning
 * each a further 90° tiles them into a seamless circle — no end-to-end alignment to get wrong.
 * They are scaled uniformly rather than through `normalizeModelToSize`, which would re-centre each
 * quarter on its own bounding box and pull the ring apart.
 *
 * The kit's quarter is a *filled* disc, not an annulus: in this pack the hole that turns it into a
 * road is whatever block sits in the middle covering the inner asphalt, the way a real roundabout
 * is built. So a paved island goes on top to open the ring up.
 */
function createRingRoad(kit: Kit): Group {
  const ring = new Group();
  const scale = RING_ROAD_OUTER / CURVE_NATIVE_OUTER;

  for (let quarter = 0; quarter < 4; quarter++) {
    const piece = cloneModel(kitPart(kit, DOWNTOWN.roadCurve));
    piece.scale.setScalar(scale);
    piece.rotation.y = quarter * (Math.PI / 2);
    // The model's surface sits below its own origin, so that offset is scaled back out before
    // lifting it above the plaza — the same coplanar reason the plaza is lifted above the grass.
    piece.position.y = CURVE_SURFACE_DROP * scale + ROAD_Y;
    ring.add(piece);
  }

  ring.add(createPavedDisc(kit, RING_ROAD_INNER, ROUNDABOUT_Y));
  return ring;
}

/**
 * Street furniture standing on the plaza.
 *
 * The plaza and ring road go in the always-visible group, not the detail group: they are large
 * surfaces that give the island its character from any distance, and culling them leaves a bare
 * green disc.
 */
function addStreet(
  group: Group,
  detailGroup: Group,
  kit: Kit,
  clearances: readonly ScatterCircle[],
): void {
  group.add(createPavedDisc(kit, PLAZA_RADIUS, PLAZA_Y));
  group.add(createRingRoad(kit));

  const furniture: ReadonlyArray<{ part: string; size: number }> = [
    { part: DOWNTOWN.planter, size: 0.7 },
    { part: DOWNTOWN.bollard, size: 0.35 },
    { part: DOWNTOWN.planter, size: 0.6 },
    { part: DOWNTOWN.bollard, size: 0.35 },
    { part: DOWNTOWN.bollard, size: 0.3 },
    { part: DOWNTOWN.planter, size: 0.65 },
  ];

  const points = scatterPoints({
    seed: 5231,
    count: furniture.length,
    minRadius: 0.7,
    maxRadius: TOWER_RING_RADIUS - 2.1,
    minDistance: 0.9,
    exclusions: clearances,
  });

  points.forEach((point, index) => {
    const { part, size } = furniture[index];
    place(detailGroup, kit, part, point.x, point.z, index * 53, () => size);
  });
}

/** A green fringe of trees around the city block, with loose stones scattered through it. */
function addGreenery(
  group: Group,
  detailGroup: Group,
  kit: Kit,
  clearances: readonly ScatterCircle[],
): void {
  const trees = scatterPoints({
    seed: 7717,
    count: 52,
    minRadius: TREELINE_INNER,
    maxRadius: TREELINE_OUTER,
    minDistance: 0.6,
    exclusions: clearances,
  });
  trees.forEach((point, index) => {
    const species = index % 2 === 0 ? FANTASY.trees : FANTASY.pines;
    const part = species[index % species.length];
    // Kept well below the towers so the skyline stays the island's silhouette.
    const height = 1.4 + ((index * 13) % 5) * 0.11;
    place(group, kit, part, point.x, point.z, index * 61, () => height, normalizeModel);
  });

  const stoneSize = 0.3;
  const stones = scatterPoints({
    seed: 4133,
    count: 30,
    minRadius: TREELINE_INNER - 1.2,
    maxRadius: FLAT_RADIUS - stoneSize / 2,
    minDistance: 0.6,
    exclusions: clearances,
  });
  stones.forEach((point, index) => {
    const part = FANTASY.pebbles[index % FANTASY.pebbles.length];
    place(detailGroup, kit, part, point.x, point.z, index * 29, () => stoneSize);
  });
}
