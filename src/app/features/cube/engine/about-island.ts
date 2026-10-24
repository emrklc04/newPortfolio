/**
 * Builds the About island: a single castle standing in a forest clearing, ringed by woodland and
 * a wall of mountains at the rim.
 *
 * Unlike the other two islands this one has exactly one interactive object — the castle — so the
 * scenery carries the whole character of the place. Content is built in local Y-up space sitting
 * on the island base's top face (local y = 0).
 */
import { Group, Object3D } from 'three';
import { IslandBuildResult, place } from './island-decor';
import { flatTopRadius } from './island-base';
import { findIsland } from './islands';
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
const CASTLE_HEIGHT = 5.2;

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

export function buildAboutIsland(kits: Kits): IslandBuildResult {
  const group = new Group();
  const detailGroup = new Group();

  const { interactiveObjects, clearances } = addCastle(group, kits.fantasy);

  addMountains(group, kits.fantasy, clearances);
  addForest(group, kits.fantasy, clearances);
  addUndergrowth(detailGroup, kits.fantasy, clearances);

  group.add(detailGroup);
  return { group, detailGroup, interactiveObjects };
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
