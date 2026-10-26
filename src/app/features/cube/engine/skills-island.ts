/**
 * Builds the Skills island: one Downtown City skyscraper per skill, around a clean asphalt court
 * with a circular centre marker, inside a fringe of Ultimate Fantasy RTS woodland.
 *
 * Content is built in local Y-up space sitting on the island base's top face (local y = 0).
 */
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { Skill } from '../../../core/models/skill.model';
import { IslandBuildResult, place } from './island-decor';
import { flatTopRadius } from './island-base';
import { findIsland } from './islands';
import { addGlow } from './glow';
import { kitPart } from './kit-loader';
import { DOWNTOWN, FANTASY, Kit, Kits } from './kits';
import { normalizeModel } from './model-utils';
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

/** Extra clearance around each tower that greenery is kept out of. */
const TOWER_CLEARANCE = 0.7;

/** Radius of the asphalt court the towers stand around. */
const ASPHALT_RADIUS = TOWER_RING_RADIUS + 1.3;
const ASPHALT_TILE_SIZE = 6;
const CENTER_CIRCLE_RADIUS = 1.2;
const CENTER_RING_INNER = 1.34;
const CENTER_RING_OUTER = 1.42;
const ASPHALT_Y = 0.025;
const CENTER_CIRCLE_Y = 0.045;
const CENTER_RING_Y = 0.06;
const STREET_LAMP_RING_RADIUS = 3.05;
const STREET_LAMP_COUNT = 4;

/** Greenery is confined to the island's rim, outside the city block. */
const TREELINE_INNER = ASPHALT_RADIUS + 0.1;
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

  const { interactiveObjects, clearances } = addTowers(group, skills);

  const updateStreet = addStreet(group, kits.downtown);
  addGreenery(group, detailGroup, kits.fantasy, clearances);

  group.add(detailGroup);
  return { group, detailGroup, interactiveObjects, update: updateStreet };
}

/** One tower per skill, ringed around the plaza. */
function addTowers(
  group: Group,
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
    // Taller blueprints get proportionally more world height, so the floor count stays legible
    // after normalization instead of every tower ending up the same size.
    const floorSpan = Math.max(...FLOOR_COUNTS) - Math.min(...FLOOR_COUNTS);
    const t = (floors - Math.min(...FLOOR_COUNTS)) / (floorSpan || 1);
    const height = TOWER_MIN_HEIGHT + t * (TOWER_MAX_HEIGHT - TOWER_MIN_HEIGHT);

    const tower = buildTower(blueprint, height);
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

/** Creates a circular tiled ground surface using a cloned kit material. */
function createPavedDisc(
  kit: Kit,
  part: string,
  radius: number,
  y: number,
  tileSize: number,
): Mesh {
  const geometry = new CircleGeometry(radius, 64);
  geometry.rotateX(-Math.PI / 2);

  const material = borrowMaterial(kitPart(kit, part));
  // CircleGeometry lays UV 0..1 across the whole diameter, which would stretch one texture repeat
  // over the entire disc; repeating it at the source tile's density keeps the grain believable.
  const repeat = (radius * 2) / tileSize;
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

/** A clear asphalt court with one restrained circular marker in the middle. */
function addStreet(group: Group, kit: Kit): (elapsedSeconds: number) => void {
  group.add(
    createPavedDisc(kit, DOWNTOWN.asphalt, ASPHALT_RADIUS, ASPHALT_Y, ASPHALT_TILE_SIZE),
  );
  group.add(
    createPavedDisc(kit, DOWNTOWN.concrete, CENTER_CIRCLE_RADIUS, CENTER_CIRCLE_Y, 3),
  );

  const ringGeometry = new RingGeometry(CENTER_RING_INNER, CENTER_RING_OUTER, 64);
  ringGeometry.rotateX(-Math.PI / 2);
  const ring = new Mesh(
    ringGeometry,
    new MeshStandardMaterial({ color: 0xb8aa91, roughness: 0.95, metalness: 0 }),
  );
  ring.position.y = CENTER_RING_Y;
  group.add(ring);

  addStreetLamps(group);
  return addCirclingCar(group);
}

/** A compact low-poly car slowly follows the circular lane around the plaza marker. */
function addCirclingCar(group: Group): (elapsedSeconds: number) => void {
  const car = new Group();
  const paint = new MeshStandardMaterial({ color: 0xc95d3a, roughness: 0.72, metalness: 0.08 });
  const trim = new MeshStandardMaterial({ color: 0x27313a, roughness: 0.82 });
  const glass = new MeshStandardMaterial({
    color: 0x9fc6cc,
    roughness: 0.32,
    metalness: 0.12,
    emissive: 0x34535a,
    emissiveIntensity: 0.25,
  });
  const headlight = new MeshStandardMaterial({
    color: 0xffe6a6,
    emissive: 0xffb84d,
    emissiveIntensity: 1.8,
    roughness: 0.38,
  });
  const taillight = new MeshStandardMaterial({
    color: 0xc83b32,
    emissive: 0xa32018,
    emissiveIntensity: 0.8,
    roughness: 0.42,
  });

  const chassis = new Mesh(new BoxGeometry(0.92, 0.24, 0.48), paint);
  chassis.position.y = 0.28;
  car.add(chassis);

  const hood = new Mesh(new BoxGeometry(0.34, 0.12, 0.46), paint);
  hood.position.set(0.31, 0.42, 0);
  car.add(hood);

  const cabin = new Mesh(new BoxGeometry(0.43, 0.25, 0.39), glass);
  cabin.position.set(-0.08, 0.51, 0);
  car.add(cabin);

  const roof = new Mesh(new BoxGeometry(0.3, 0.045, 0.36), paint);
  roof.position.set(-0.08, 0.66, 0);
  car.add(roof);

  const wheelGeometry = new CylinderGeometry(0.115, 0.115, 0.09, 8);
  const wheelPositions = [
    [0.28, 0.18, -0.27],
    [0.28, 0.18, 0.27],
    [-0.3, 0.18, -0.27],
    [-0.3, 0.18, 0.27],
  ] as const;
  for (const [x, y, z] of wheelPositions) {
    const wheel = new Mesh(wheelGeometry, trim);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y, z);
    car.add(wheel);
  }

  for (const z of [-0.16, 0.16]) {
    const frontLamp = new Mesh(new BoxGeometry(0.045, 0.075, 0.09), headlight);
    frontLamp.position.set(0.48, 0.33, z);
    car.add(frontLamp);

    const rearLamp = new Mesh(new BoxGeometry(0.035, 0.07, 0.08), taillight);
    rearLamp.position.set(-0.48, 0.32, z);
    car.add(rearLamp);
  }

  const orbitRadius = CENTER_RING_OUTER + 0.42;
  const orbitSpeed = 0.2;
  const orbitPhase = Math.PI / 8;
  car.position.y = ASPHALT_Y;
  group.add(car);

  return (elapsedSeconds: number) => {
    const angle = orbitPhase + elapsedSeconds * orbitSpeed;
    car.position.x = Math.cos(angle) * orbitRadius;
    car.position.z = Math.sin(angle) * orbitRadius;
    // Three.js rotates local +X toward negative Z for positive Y rotation. This heading matches
    // the circle's tangent (-sin(angle), cos(angle)) so the front lights lead into each turn.
    car.rotation.y = -angle - Math.PI / 2;
  };
}

/** Four compact low-poly lamps around the centre, with the heads facing inward. */
function addStreetLamps(group: Group): void {
  const frameMaterial = new MeshStandardMaterial({
    color: 0x26313a,
    roughness: 0.62,
    metalness: 0.48,
  });
  const lampMaterial = new MeshStandardMaterial({
    color: 0xffe7b2,
    emissive: 0xffb84d,
    emissiveIntensity: 4.5,
    roughness: 0.4,
  });

  const baseGeometry = new CylinderGeometry(0.12, 0.17, 0.14, 8);
  const poleGeometry = new CylinderGeometry(0.045, 0.075, 2.15, 8);
  const elbowGeometry = new CylinderGeometry(0.04, 0.055, 0.58, 6);
  const headGeometry = new BoxGeometry(0.58, 0.14, 0.32);
  const diffuserGeometry = new BoxGeometry(0.46, 0.025, 0.22);

  for (let index = 0; index < STREET_LAMP_COUNT; index++) {
    const angle = Math.PI / 4 + (index / STREET_LAMP_COUNT) * Math.PI * 2;
    const lamp = new Group();
    lamp.position.set(
      Math.cos(angle) * STREET_LAMP_RING_RADIUS,
      ASPHALT_Y,
      Math.sin(angle) * STREET_LAMP_RING_RADIUS,
    );
    // Local +X is the arm direction; rotate it to point radially inward.
    lamp.rotation.y = Math.PI - angle;
    lamp.scale.setScalar(0.72);

    const base = new Mesh(baseGeometry, frameMaterial);
    base.position.y = 0.07;
    lamp.add(base);

    const pole = new Mesh(poleGeometry, frameMaterial);
    pole.position.y = 1.21;
    lamp.add(pole);

    const elbow = new Mesh(new SphereGeometry(0.07, 8, 6), frameMaterial);
    elbow.position.set(0, 2.23, 0);
    lamp.add(elbow);

    const arm = new Mesh(elbowGeometry, frameMaterial);
    arm.position.set(0.2, 2.34, 0);
    arm.rotation.z = -Math.PI / 4;
    lamp.add(arm);

    const head = new Mesh(headGeometry, frameMaterial);
    head.position.set(0.55, 2.52, 0);
    lamp.add(head);

    const diffuser = new Mesh(diffuserGeometry, lampMaterial);
    diffuser.position.set(0.55, 2.435, 0);
    lamp.add(diffuser);
    addGlow(lamp, new Vector3(0.55, 2.44, 0), 0xffb94f, 3.2, 1);

    // A broad halo, hot diffuser and longer falloff make the lamp glow visible across the plaza.
    const light = new PointLight(0xffc879, 3.2, 8, 2);
    light.position.set(0.55, 2.39, 0);
    lamp.add(light);

    group.add(lamp);
  }
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
