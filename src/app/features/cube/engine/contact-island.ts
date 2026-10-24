/**
 * Builds the Contact island: an irregular landmass sitting in open water, with a fleet of ships
 * anchored around it.
 *
 * The island base's top surface is the sea here rather than ground, so the land is a separate
 * extruded mesh raised above it — which is what gives this island a coastline instead of the flat
 * discs the others stand on. Content is built in local Y-up space with the waterline at y = 0.
 */
import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Shape } from 'three';
import { HouseBlueprint, buildHouse } from './house-builder';
import { flatTopRadius } from './island-base';
import { IslandBuildResult, place } from './island-decor';
import { findIsland } from './islands';
import { kitPart } from './kit-loader';
import { FANTASY, Kit, Kits, SHIPS } from './kits';
import { cloneModel, normalizeModel, normalizeModelToSize } from './model-utils';
import { ScatterPoint, scatterPoints } from './scatter';
import { InteractiveObject } from './types';

const ISLAND = findIsland('contact');
const ISLAND_RADIUS = ISLAND.radius;

/** Ships must stay inside this or they drift off the water's rounded rim. */
const FLAT_RADIUS = flatTopRadius(ISLAND.radius, ISLAND.radialSegments);

/** Mean radius of the landmass; the coastline wobbles around it. */
const LAND_RADIUS = 4.6;

/** How far the land stands proud of the waterline, and how deep the mesh runs below it so the
 * shore never shows a cut edge. */
const LAND_HEIGHT = 0.42;
const LAND_DEPTH = 1.2;

const LAND_COLOR = 0x5f9247;

/** Kept clear around the two houses so trees don't grow through them. */
const BUILDING_CLEARANCE = 1.1;

/**
 * Coastline radius at a given angle.
 *
 * Built from harmonics of the angle rather than random noise: every term is 2π-periodic, so the
 * outline closes on itself seamlessly instead of leaving a visible join where it wraps.
 */
function coastRadius(angle: number): number {
  const wobble =
    Math.sin(angle * 2 + 0.8) * 0.13 +
    Math.sin(angle * 3 - 1.7) * 0.09 +
    Math.sin(angle * 5 + 2.4) * 0.05;
  return LAND_RADIUS * (1 + wobble);
}

/** Widest the coastline ever reaches — where the water starts. */
const MAX_COAST_RADIUS = LAND_RADIUS * 1.27;

/** True when a point is far enough inside the coastline to stand on dry land. */
function isInland(x: number, z: number, margin: number): boolean {
  return Math.hypot(x, z) < coastRadius(Math.atan2(z, x)) - margin;
}

/** Scatters over the land's bounding disc, then drops whatever fell in the sea. */
function scatterInland(
  seed: number,
  count: number,
  minDistance: number,
  margin: number,
  exclusions: readonly { x: number; z: number; radius: number }[] = [],
): ScatterPoint[] {
  return scatterPoints({
    seed,
    count,
    minRadius: 0,
    maxRadius: MAX_COAST_RADIUS,
    minDistance,
    exclusions,
  }).filter((point) => isInland(point.x, point.z, margin));
}

export function buildContactIsland(kits: Kits): IslandBuildResult {
  const group = new Group();
  const detailGroup = new Group();

  group.add(createLandmass());

  const { interactiveObjects, clearances } = addFleet(group, kits.ships);
  addSettlement(group, kits.medieval, clearances);
  addWoodland(group, kits.fantasy, clearances);
  addShoreDetail(detailGroup, kits.fantasy, clearances);

  group.add(detailGroup);
  return { group, detailGroup, interactiveObjects };
}

/**
 * The irregular landmass. Extruded from the coastline outline and sunk so the waterline cuts
 * across it, which is what makes the shore read as a beach rather than a cliff edge.
 */
function createLandmass(): Mesh {
  const steps = 96;
  const shape = new Shape();
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const radius = coastRadius(angle);
    // The shape's y becomes world -z once the geometry is laid flat, so it is negated here to keep
    // `coastRadius(angle)` meaning the same thing in world space as it does on the outline.
    const point = [Math.cos(angle) * radius, -Math.sin(angle) * radius] as const;
    if (i === 0) {
      shape.moveTo(point[0], point[1]);
    } else {
      shape.lineTo(point[0], point[1]);
    }
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: LAND_DEPTH,
    bevelEnabled: true,
    bevelSize: 0.3,
    bevelThickness: 0.22,
    bevelSegments: 2,
  });
  // ExtrudeGeometry builds in the XY plane and extrudes along +z; this lays it flat, turning the
  // extrusion into height.
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();

  const land = new Mesh(
    geometry,
    new MeshStandardMaterial({ color: LAND_COLOR, flatShading: true, roughness: 0.95 }),
  );
  land.position.y = LAND_HEIGHT - (geometry.boundingBox?.max.y ?? LAND_DEPTH);
  return land;
}

/**
 * The anchored fleet. The cruise ship is the island's one interactive object — it is the largest
 * thing here and unmistakably the subject, so it carries the Contact panel.
 */
function addFleet(
  group: Group,
  kit: Kit,
): {
  interactiveObjects: InteractiveObject[];
  clearances: { x: number; z: number; radius: number }[];
} {
  /**
   * Hulls are modelled sitting on y = 0, so each is sunk to put a waterline on it. `draft` is an
   * absolute depth in world units, deliberately not derived from the model's size: on a tall ship
   * the masts dominate both its height and its longest dimension, so any fraction of those sinks
   * the hull clean out of sight.
   */
  const fleet: ReadonlyArray<{
    part: string;
    length: number;
    draft: number;
    angle: number;
    offshore: number;
  }> = [
    // The cruise ship sits broadside on the near side, where the opening view can read it.
    { part: SHIPS.cruise, length: 5.2, draft: 0.2, angle: 1.9, offshore: 2.0 },
    { part: SHIPS.sail, length: 3.0, draft: 0.11, angle: 4.3, offshore: 1.5 },
    { part: SHIPS.viking, length: 2.4, draft: 0.08, angle: 3.3, offshore: 1.2 },
    { part: SHIPS.smallSail, length: 1.3, draft: 0.05, angle: 5.3, offshore: 0.9 },
    { part: SHIPS.lifeboat, length: 1.0, draft: 0.03, angle: 0.4, offshore: 0.8 },
    { part: SHIPS.rowboat, length: 0.9, draft: 0.03, angle: 0.95, offshore: 0.75 },
  ];

  const interactiveObjects: InteractiveObject[] = [];
  const clearances: { x: number; z: number; radius: number }[] = [];

  for (const { part, length, draft, angle, offshore } of fleet) {
    const ship = cloneModel(kitPart(kit, part));
    normalizeModelToSize(ship, length);

    // Far enough out that the hull clears the shore, and never past the water's flat edge.
    const radius = Math.min(
      coastRadius(angle) + offshore + length * 0.3,
      FLAT_RADIUS - length * 0.6,
    );
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    ship.position.x += x;
    ship.position.z += z;
    ship.position.y -= draft;
    // Hulls run along their local z, so negating the angle turns each one broadside to the shore.
    ship.rotation.y = -angle;
    group.add(ship);

    clearances.push({ x, z, radius: length * 0.6 });

    if (part === SHIPS.cruise) {
      ship.userData['interactive'] = true;
      const labelAnchor = new Object3D();
      labelAnchor.position.set(x, length * 0.55, z);
      group.add(labelAnchor);

      interactiveObjects.push({
        object: ship,
        kind: 'contact',
        // The Contact panel is static content, so there is nothing to carry through.
        payload: null,
        label: 'Kontakt',
        labelAnchor,
      });
    }
  }

  return { interactiveObjects, clearances };
}

/** A couple of houses inland, so the island reads as inhabited rather than deserted. */
function addSettlement(
  group: Group,
  kit: Kit,
  clearances: { x: number; z: number; radius: number }[],
): void {
  const blueprints: ReadonlyArray<{ blueprint: HouseBlueprint; x: number; z: number }> = [
    {
      blueprint: {
        widthModules: 2,
        depthModules: 2,
        storeys: 1,
        style: 'plaster',
        entranceSide: 0,
        seed: 41,
      },
      x: -1.1,
      z: -1.4,
    },
    {
      blueprint: {
        widthModules: 2,
        depthModules: 2,
        storeys: 2,
        style: 'brick',
        entranceSide: 0,
        seed: 77,
      },
      x: 1.5,
      z: 0.9,
    },
  ];

  blueprints.forEach(({ blueprint, x, z }, index) => {
    const house = buildHouse(kit, blueprint);
    normalizeModel(house, 1.5 + index * 0.45);
    house.position.x += x;
    house.position.z += z;
    house.position.y += LAND_HEIGHT;
    // Facing out to sea, away from the island's middle.
    house.rotation.y = Math.atan2(x, z);
    group.add(house);

    clearances.push({ x, z, radius: BUILDING_CLEARANCE });
  });
}

/** Trees and boulders covering the land. */
function addWoodland(
  group: Group,
  kit: Kit,
  clearances: readonly { x: number; z: number; radius: number }[],
): void {
  const groveSize = 1.5;
  const groves = scatterInland(3301, 14, 1.3, groveSize / 2 + 0.3, clearances);
  groves.forEach((point, index) => {
    const part = FANTASY.treeGroups[index % FANTASY.treeGroups.length];
    placeOnLand(group, kit, part, point, index * 53, groveSize);
  });

  const trees = scatterInland(4703, 40, 0.7, 0.35, clearances);
  trees.forEach((point, index) => {
    const parts = index % 3 === 0 ? FANTASY.pines : FANTASY.trees;
    const part = parts[index % parts.length];
    const height = 1.1 + ((index * 17) % 6) * 0.1;
    placeOnLand(group, kit, part, point, index * 37, height, normalizeModel);
  });

  const rockSize = 0.7;
  const rocks = scatterInland(5807, 12, 1.1, rockSize / 2 + 0.2, clearances);
  rocks.forEach((point, index) => {
    const part = FANTASY.rocks[index % FANTASY.rocks.length];
    placeOnLand(group, kit, part, point, index * 83, rockSize);
  });
}

/** Loose stones along the shore — the small stuff that gets hidden at a distance. */
function addShoreDetail(
  group: Group,
  kit: Kit,
  clearances: readonly { x: number; z: number; radius: number }[],
): void {
  const stoneSize = 0.3;
  const stones = scatterInland(6911, 34, 0.5, stoneSize / 2, clearances);
  stones.forEach((point, index) => {
    const part = FANTASY.pebbles[index % FANTASY.pebbles.length];
    placeOnLand(group, kit, part, point, index * 29, stoneSize);
  });
}

/** `place`, but lifted onto the landmass instead of the waterline. */
function placeOnLand(
  group: Group,
  kit: Kit,
  part: string,
  point: ScatterPoint,
  yawSeed: number,
  size: number,
  normalize: (object: Object3D, target: number) => void = normalizeModelToSize,
): void {
  const holder = new Group();
  holder.position.y = LAND_HEIGHT;
  place(holder, kit, part, point.x, point.z, yawSeed, () => size, normalize);
  group.add(holder);
}
