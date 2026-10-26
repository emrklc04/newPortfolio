import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { addGlow } from './glow';
import { flatTopRadius } from './island-base';
import { ISLANDS, IslandDefinition, IslandId } from './islands';

const BRIDGE_WIDTH = 0.98;
const PLANK_LENGTH = 0.38;
const DECK_SAG_RATIO = 0.085;
const UP = new Vector3(0, 1, 0);

const plankMaterials = [
  new MeshStandardMaterial({ color: 0x9b7149, roughness: 0.92 }),
  new MeshStandardMaterial({ color: 0xa77b50, roughness: 0.94 }),
  new MeshStandardMaterial({ color: 0x87603d, roughness: 0.96 }),
];
const ropeMaterial = new MeshStandardMaterial({ color: 0x694d35, roughness: 1 });
const hangerMaterial = new MeshStandardMaterial({ color: 0x795739, roughness: 0.96 });
const torchWoodMaterial = new MeshStandardMaterial({ color: 0x503923, roughness: 1 });
const flameMaterial = new MeshBasicMaterial({ color: 0xff8736, toneMapped: false });
const flameCoreMaterial = new MeshBasicMaterial({ color: 0xffe58a, toneMapped: false });
const plankGeometry = new BoxGeometry(BRIDGE_WIDTH, 0.1, PLANK_LENGTH * 0.84);
const ropeSegmentGeometry = new CylinderGeometry(0.032, 0.032, 1, 6);
const hangerGeometry = new CylinderGeometry(0.019, 0.019, 1, 5);
const postGeometry = new BoxGeometry(0.1, 0.64, 0.1);
const torchShaftGeometry = new CylinderGeometry(0.035, 0.05, 0.34, 6);
const torchFlameGeometry = new ConeGeometry(0.078, 0.21, 6);
const torchCoreGeometry = new ConeGeometry(0.044, 0.13, 5);

const CONNECTIONS: readonly [IslandId, IslandId][] = [
  ['projects', 'contact'],
  ['projects', 'about'],
  ['projects', 'skills'],
  ['contact', 'about'],
];

interface BridgeMeshSegment {
  mesh: Mesh;
  startT: number;
  endT: number;
  side: number;
  railHeight: number;
}

interface BridgeHanger {
  mesh: Mesh;
  t: number;
  side: number;
}

interface BridgeTorch {
  group: Group;
  t: number;
  side: number;
  flame: Mesh;
  core: Mesh;
  light: PointLight;
  glow: Sprite;
}

interface IslandBridge {
  group: Group;
  update(elapsedSeconds: number): void;
}

/** Hangs wooden plank bridges between the nearest clear rim points of each island pair. */
export function createIslandBridges(): { group: Group; update(elapsedSeconds: number): void } {
  const group = new Group();
  const bridges = CONNECTIONS.map(([from, to]) =>
    createBridge(group, findIsland(from), findIsland(to)),
  );

  return {
    group,
    update: (elapsedSeconds) => bridges.forEach((bridge) => bridge.update(elapsedSeconds)),
  };
}

function createBridge(parent: Group, from: IslandDefinition, to: IslandDefinition): IslandBridge {
  const horizontal = new Vector3(to.position.x - from.position.x, 0, to.position.z - from.position.z);
  const horizontalLength = horizontal.length();
  const direction = horizontal.normalize();
  const fromRadius = flatTopRadius(from.radius, from.radialSegments) - 0.12;
  const toRadius = flatTopRadius(to.radius, to.radialSegments) - 0.12;
  const start = from.position.clone().addScaledVector(direction, fromRadius);
  const end = to.position.clone().addScaledVector(direction, -toRadius);
  const sag = Math.min(1.25, Math.max(0.28, horizontalLength * DECK_SAG_RATIO));
  const plankCount = Math.max(6, Math.ceil(horizontalLength / PLANK_LENGTH));
  const yaw = Math.atan2(direction.x, direction.z);
  const sideAxis = new Vector3(direction.z, 0, -direction.x);
  const plankBasis = new Matrix4();

  const group = new Group();
  parent.add(group);

  const planks = Array.from({ length: plankCount }, (_, index) => {
    const mesh = new Mesh(plankGeometry, plankMaterials[index % plankMaterials.length]);
    group.add(mesh);
    return { mesh, t: (index + 0.5) / plankCount };
  });

  const railSegments: BridgeMeshSegment[] = [];
  const railSections = Math.max(12, plankCount);
  for (const side of [-1, 1]) {
    for (const railHeight of [0.32, 0.58]) {
      for (let index = 0; index < railSections; index++) {
        const mesh = new Mesh(ropeSegmentGeometry, ropeMaterial);
        group.add(mesh);
        railSegments.push({
          mesh,
          startT: index / railSections,
          endT: (index + 1) / railSections,
          side,
          railHeight,
        });
      }
    }
  }

  const hangers: BridgeHanger[] = [];
  const hangerStep = Math.max(1, Math.round(plankCount / Math.max(8, horizontalLength / 0.85)));
  for (let index = 0; index < plankCount; index += hangerStep) {
    for (const side of [-1, 1]) {
      const mesh = new Mesh(hangerGeometry, hangerMaterial);
      group.add(mesh);
      hangers.push({ mesh, t: (index + 0.5) / plankCount, side });
    }
  }

  const posts = [0, 1].flatMap((endT) =>
    [-1, 1].map((side) => {
      const mesh = new Mesh(postGeometry, hangerMaterial);
      mesh.rotation.y = yaw;
      group.add(mesh);
      return { mesh, t: endT, side };
    }),
  );

  const torches = [createTorch(group, 0, -1), createTorch(group, 1, 1)];

  const islandBob = (island: IslandDefinition, elapsedSeconds: number): number => {
    const phase = ISLANDS.indexOf(island) * 1.7;
    return island.position.y + Math.sin(elapsedSeconds * 0.4 + phase) * 0.12;
  };

  const deckPoint = (t: number, startY: number, endY: number): Vector3 =>
    new Vector3(
      start.x + (end.x - start.x) * t,
      startY + (endY - startY) * t - sag * 4 * t * (1 - t),
      start.z + (end.z - start.z) * t,
    );

  const sidePoint = (t: number, y: number, side: number, startY: number, endY: number): Vector3 =>
    deckPoint(t, startY, endY).add(
      new Vector3(
        direction.z * side * (BRIDGE_WIDTH / 2 - 0.08),
        y,
        -direction.x * side * (BRIDGE_WIDTH / 2 - 0.08),
      ),
    );

  const update = (elapsedSeconds: number): void => {
    const startY = islandBob(from, elapsedSeconds);
    const endY = islandBob(to, elapsedSeconds);

    planks.forEach(({ mesh, t }) => {
      mesh.position.copy(deckPoint(t, startY, endY));
      const before = deckPoint(Math.max(0, t - 0.01), startY, endY);
      const after = deckPoint(Math.min(1, t + 0.01), startY, endY);
      const tangent = after.sub(before).normalize();
      const plankUp = tangent.clone().cross(sideAxis).normalize();
      mesh.quaternion.setFromRotationMatrix(plankBasis.makeBasis(sideAxis, plankUp, tangent));
    });

    railSegments.forEach(({ mesh, startT, endT, side, railHeight }) => {
      const a = sidePoint(startT, railHeight, side, startY, endY);
      const b = sidePoint(endT, railHeight, side, startY, endY);
      setCylinderBetween(mesh, a, b);
    });

    hangers.forEach(({ mesh, t, side }) => {
      const bottom = sidePoint(t, 0.04, side, startY, endY);
      const top = sidePoint(t, 0.58, side, startY, endY);
      setCylinderBetween(mesh, bottom, top);
    });

    posts.forEach(({ mesh, t, side }) => {
      const deck = sidePoint(t, 0.03, side, startY, endY);
      mesh.position.set(deck.x, deck.y + 0.31, deck.z);
    });

    torches.forEach(({ group: torch, t, side, flame, core, light, glow }, index) => {
      const position = deckPoint(t, startY, endY).add(
        sideAxis.clone().multiplyScalar(side * (BRIDGE_WIDTH / 2 - 0.08)),
      );
      position.y += 0.63;
      torch.position.set(position.x, position.y, position.z);
      const flicker = Math.sin(elapsedSeconds * 8.5 + index * 2.7 + yaw) * 0.5 + 0.5;
      flame.scale.set(0.88 + flicker * 0.18, 0.82 + flicker * 0.34, 0.88 + flicker * 0.18);
      flame.rotation.z = Math.sin(elapsedSeconds * 4.2 + index) * 0.1;
      core.scale.y = 0.78 + flicker * 0.3;
      light.intensity = 1.05 + flicker * 0.45;
      (glow.material as SpriteMaterial).opacity = 0.55 + flicker * 0.2;
    });
  };

  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  update(0);
  return { group, update };
}

function setCylinderBetween(mesh: Mesh, start: Vector3, end: Vector3): void {
  const direction = end.clone().sub(start);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
  mesh.scale.y = direction.length();
}

function createTorch(parent: Group, t: number, side: number): BridgeTorch {
  const group = new Group();
  parent.add(group);

  const shaft = new Mesh(torchShaftGeometry, torchWoodMaterial);
  shaft.position.y = 0.17;
  group.add(shaft);

  const flame = new Mesh(torchFlameGeometry, flameMaterial);
  flame.position.y = 0.42;
  group.add(flame);

  const core = new Mesh(torchCoreGeometry, flameCoreMaterial);
  core.position.y = 0.4;
  group.add(core);

  const light = new PointLight(0xffa347, 1.4, 3.8, 2);
  light.position.y = 0.43;
  group.add(light);
  const glow = addGlow(group, new Vector3(0, 0.45, 0), 0xff9a3d, 0.62, 0.72);

  return { group, t, side, flame, core, light, glow };
}

function findIsland(id: IslandId): IslandDefinition {
  const definition = ISLANDS.find((island) => island.id === id);
  if (!definition) throw new Error(`Missing island definition: ${id}`);
  return definition;
}
