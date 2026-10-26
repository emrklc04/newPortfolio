/**
 * Builds the Contact island: an irregular landmass sitting in open water, with a fleet of ships
 * slowly sailing around it.
 *
 * The island base's top surface is the sea here rather than ground, so the land is a separate
 * extruded mesh raised above it — which is what gives this island a coastline instead of the flat
 * discs the others stand on. Content is built in local Y-up space with the waterline at y = 0.
 */
import {
  DoubleSide,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';
import { flatTopRadius } from './island-base';
import { IslandBuildResult, place } from './island-decor';
import { findIsland } from './islands';
import { addGlow } from './glow';
import { kitPart } from './kit-loader';
import { FANTASY, Kit, Kits, SHIPS } from './kits';
import { cloneModel, normalizeModel, normalizeModelToSize } from './model-utils';
import { ScatterPoint, scatterPoints } from './scatter';
import { InteractiveObject } from './types';

const ISLAND = findIsland('contact');

/** Ships must stay inside this or they drift off the water's rounded rim. */
const FLAT_RADIUS = flatTopRadius(ISLAND.radius, ISLAND.radialSegments);

/** Mean radius of the landmass; the coastline wobbles around it. */
const LAND_RADIUS = 4.6;

/** How far the land stands proud of the waterline, and how deep the mesh runs below it so the
 * shore never shows a cut edge. */
const LAND_HEIGHT = 0.42;
const LAND_DEPTH = 1.2;

const LAND_COLOR = 0x5f9247;
const SHIP_ORBIT_SPEED = 0.030;

interface ShipMotion {
  rig: Group;
  radius: number;
  startAngle: number;
  phase: number;
}

interface WakeMotion {
  mesh: Mesh;
  material: MeshBasicMaterial;
  phase: number;
}

const LIGHTHOUSE_HEIGHT = 4.8;

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

  const { clearances, update } = addFleet(group, kits.ships);
  const lighthouse = addLighthouse(group);
  clearances.push({ x: 0, z: 0, radius: 2.4 });
  addWoodland(group, kits.fantasy, clearances);
  addShoreDetail(detailGroup, kits.fantasy, clearances);

  group.add(detailGroup);
  return { group, detailGroup, interactiveObjects: [lighthouse], update };
}

/** A compact, faceted lighthouse at the island's centre, and its sole contact link. */
function addLighthouse(group: Group): InteractiveObject {
  const towerMaterial = new MeshStandardMaterial({ color: 0xe8dfc5, roughness: 0.92, flatShading: true });
  const roofMaterial = new MeshStandardMaterial({ color: 0x455b62, roughness: 0.9, flatShading: true });
  const stoneMaterial = new MeshStandardMaterial({ color: 0x817b70, roughness: 1, flatShading: true });
  const windowMaterial = new MeshStandardMaterial({
    color: 0xffd47a, emissive: 0xffa52f, emissiveIntensity: 1.4, roughness: 0.5,
  });
  const lighthouse = new Group();
  lighthouse.position.y = LAND_HEIGHT;
  lighthouse.userData['interactive'] = true;

  const foundation = new Mesh(new CylinderGeometry(0.9, 1.05, 0.32, 8), stoneMaterial);
  foundation.position.y = 0.16;
  lighthouse.add(foundation);

  const tower = new Mesh(new CylinderGeometry(0.52, 0.78, 3.15, 8), towerMaterial);
  tower.position.y = 1.88;
  lighthouse.add(tower);

  const door = new Mesh(new BoxGeometry(0.34, 0.72, 0.08), roofMaterial);
  door.position.set(0, 0.52, 0.69);
  lighthouse.add(door);

  for (const y of [1.25, 2.25, 3.05]) {
    const slit = new Mesh(new BoxGeometry(0.13, 0.28, 0.04), windowMaterial);
    slit.position.set(0, y, 0.53 - (y - 1.25) * 0.065);
    lighthouse.add(slit);
  }

  const balcony = new Mesh(new CylinderGeometry(0.8, 0.8, 0.16, 8), roofMaterial);
  balcony.position.y = 3.58;
  lighthouse.add(balcony);

  const lanternRoom = new Mesh(new CylinderGeometry(0.48, 0.54, 0.68, 8), windowMaterial);
  lanternRoom.position.y = 4.0;
  lighthouse.add(lanternRoom);

  const roof = new Mesh(new ConeGeometry(0.72, 0.58, 8), roofMaterial);
  roof.position.y = 4.63;
  lighthouse.add(roof);

  const beacon = new PointLight(0xffd27d, 1.4, 8, 2);
  beacon.position.set(0, 4.02, 0);
  lighthouse.add(beacon);
  addGlow(lighthouse, new Vector3(0, 4.02, 0), 0xffbd58, 2.8, 0.95);
  addGlow(lighthouse, new Vector3(0, 2.25, 0.56), 0xffc96f, 0.8, 0.72);
  group.add(lighthouse);

  const labelAnchor = new Object3D();
  labelAnchor.position.y = LAND_HEIGHT + LIGHTHOUSE_HEIGHT + 0.35;
  group.add(labelAnchor);
  return {
    object: lighthouse,
    kind: 'contact',
    payload: null,
    label: 'Kontakt',
    labelAnchor,
  };
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

/** The fleet sails around the shore as scenery; the lighthouse is the island's contact target. */
function addFleet(
  group: Group,
  kit: Kit,
): {
  clearances: { x: number; z: number; radius: number }[];
  update: (elapsedSeconds: number) => void;
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

  const clearances: { x: number; z: number; radius: number }[] = [];
  const movingShips: ShipMotion[] = [];
  const movingWakes: WakeMotion[] = [];

  for (const [index, { part, length, draft, angle, offshore }] of fleet.entries()) {
    const ship = cloneModel(kitPart(kit, part));
    normalizeModelToSize(ship, length);

    // The ship keeps moving around the coast, so use the coastline's maximum radius rather than
    // the radius at its starting angle. Its long axis follows the orbit, so only a small fraction
    // of its length contributes to its radial footprint. This keeps the hull and wake offshore
    // even where the coastline bulges out.
    const footprintRadius = length * 0.6;
    const maxCenterRadius = Math.sqrt(
      Math.max(0, FLAT_RADIUS * FLAT_RADIUS - footprintRadius * footprintRadius),
    );
    const radius = Math.min(MAX_COAST_RADIUS + offshore + length * 0.08, maxCenterRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const shipRig = new Group();
    shipRig.position.set(x, 0, z);
    shipRig.rotation.y = -angle;
    ship.position.y -= draft;
    shipRig.add(ship);
    if (part === SHIPS.cruise) addShipWindowGlows(shipRig);

    const wake = new Group();
    wake.position.set(0, 0.025, -length * 0.48);
    for (const [side, phase] of [
      [-1, index * 0.9],
      [1, index * 0.9 + 1.4],
    ] as const) {
      const wakeMotion = createWakeRibbon(side);
      wakeMotion.phase = phase;
      wake.add(wakeMotion.mesh);
      movingWakes.push(wakeMotion);
    }
    shipRig.add(wake);

    movingShips.push({ rig: shipRig, radius, startAngle: angle, phase: index });

    clearances.push({ x, z, radius: length * 0.6 });

    group.add(shipRig);
  }

  return {
    clearances,
    update: (elapsedSeconds) => {
      movingShips.forEach(({ rig, radius, startAngle, phase }) => {
        const currentAngle = startAngle + elapsedSeconds * SHIP_ORBIT_SPEED;
        rig.position.set(
          Math.cos(currentAngle) * radius,
          Math.sin(elapsedSeconds * 0.8 + phase) * 0.025,
          Math.sin(currentAngle) * radius,
        );
        // The hull's local +Z points along its course, keeping the wake trailing astern.
        rig.rotation.y = -currentAngle;
      });

      movingWakes.forEach(({ mesh, material, phase }) => {
        const pulse = (Math.sin(elapsedSeconds * 1.2 + phase) + 1) / 2;
        material.opacity = 0.07 + pulse * 0.1;
        mesh.scale.z = 0.9 + pulse * 0.16;
      });
    },
  };
}

/** A few warm cabin windows sit along both sides of the cruise ship and follow its motion. */
function addShipWindowGlows(shipRig: Group): void {
  const windowMaterial = new MeshStandardMaterial({
    color: 0xffd58a,
    emissive: 0xffa83b,
    emissiveIntensity: 2.6,
    roughness: 0.75,
  });
  const windowGeometry = new BoxGeometry(0.035, 0.075, 0.105);
  const positions = [-1.35, -0.45, 0.45, 1.35];

  for (const side of [-1, 1]) {
    for (const [index, z] of positions.entries()) {
      const y = index % 2 === 0 ? 0.92 : 1.2;
      const window = new Mesh(windowGeometry, windowMaterial);
      window.position.set(side * 0.565, y, z);
      shipRig.add(window);
      addGlow(shipRig, new Vector3(side * 0.59, y, z), 0xffc36b, 0.34, 0.72);
    }
  }
}

/** A faint, widening water streak that follows the ship and softly pulses as it moves. */
function createWakeRibbon(side: -1 | 1): WakeMotion {
  const shape = new Shape();
  shape.moveTo(side * 0.2, 0);
  shape.bezierCurveTo(side * 0.25, 0.3, side * 0.48, 0.95, side * 0.7, 1.55);
  shape.lineTo(side * 0.54, 1.55);
  shape.bezierCurveTo(side * 0.38, 0.9, side * 0.18, 0.3, side * 0.12, 0.04);
  shape.closePath();

  const geometry = new ShapeGeometry(shape, 8);
  geometry.rotateX(-Math.PI / 2);
  const material = new MeshBasicMaterial({
    color: 0xd8f2f5,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: DoubleSide,
  });
  const ribbon = new Mesh(geometry, material);
  return { mesh: ribbon, material, phase: 0 };
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
