import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { BuildingSide } from './building-grid';
import type { Kit } from './kits';
import { addGlow } from './glow';

export type WallStyle = 'plaster' | 'brick';

export interface HouseBlueprint {
  widthModules: 2 | 3;
  depthModules: 2 | 3;
  storeys: 1 | 2;
  style: WallStyle;
  entranceSide: BuildingSide;
  seed: number;
}

const MODULE_WIDTH = 2;
const STOREY_HEIGHT = 2.4;

const palette = {
  wall: [0xd3bd91, 0xc9ae80, 0xe0cda4, 0xbfa77e],
  roof: [0x76534a, 0x53605a, 0x765c48, 0x59636a],
  timber: 0x604637,
  stone: 0x756d60,
  glass: 0x526b70,
  door: 0x654936,
} as const;

function material(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
}

function block(
  parent: Group,
  size: [number, number, number],
  position: [number, number, number],
  surface: MeshStandardMaterial,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), surface);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

/**
 * Builds a small, stylised village house from simple faceted forms. Shared earthy colours, broad
 * roof planes and restrained timber details keep the project village in the world's low-poly style.
 */
export function buildHouse(_kit: Kit, blueprint: HouseBlueprint): Group {
  const { widthModules, depthModules, storeys, style, seed } = blueprint;
  const width = widthModules * MODULE_WIDTH;
  const depth = depthModules * MODULE_WIDTH;
  const wallHeight = storeys * STOREY_HEIGHT;
  const roofHeight = Math.max(1.15, depth * 0.3);
  const house = new Group();

  const wall = material(palette.wall[seed % palette.wall.length]);
  const roof = material(palette.roof[(seed + (style === 'brick' ? 1 : 0)) % palette.roof.length]);
  const timber = material(palette.timber);
  const stone = material(palette.stone);
  const glass = material(palette.glass);
  const warmGlass = new MeshStandardMaterial({
    color: 0xffd89a,
    emissive: 0xff9f3a,
    emissiveIntensity: 2.4,
    roughness: 0.8,
    flatShading: true,
  });
  const door = material(palette.door);

  block(house, [width + 0.22, 0.24, depth + 0.22], [0, 0.12, 0], stone);
  block(house, [width, wallHeight, depth], [0, wallHeight / 2 + 0.24, 0], wall);

  // A dark timber frame breaks up the broad plaster planes without adding noisy trim.
  for (const x of [-width / 2 + 0.12, width / 2 - 0.12]) {
    block(house, [0.14, wallHeight, 0.16], [x, wallHeight / 2 + 0.24, depth / 2 + 0.04], timber);
  }
  block(house, [width, 0.14, 0.16], [0, wallHeight + 0.16, depth / 2 + 0.04], timber);

  // Entrance on the front (+z) and evenly spaced square windows on each visible wall.
  block(house, [0.58, 1.05, 0.12], [0, 0.765, depth / 2 + 0.08], door);
  block(house, [0.72, 0.12, 0.16], [0, 1.34, depth / 2 + 0.08], timber);
  for (let index = 0; index < widthModules; index++) {
    const x = -width / 2 + ((index + 0.5) * width) / widthModules;
    const groundFloorY = storeys === 1 ? 1.75 : 2.0;
    addWindow(house, x, groundFloorY, depth / 2 + 0.085, glass, warmGlass, timber, (seed + index) % 2 === 0);
    if (storeys === 2) {
      addWindow(house, x, 4.18, depth / 2 + 0.085, glass, warmGlass, timber, (seed + index + 1) % 3 === 0);
    }
  }
  for (const [index, z] of [-depth / 4, depth / 4].entries()) {
    addWindow(house, width / 2 + 0.085, 1.8, z, glass, warmGlass, timber, (seed + index + 1) % 2 === 0, true);
  }

  // Two broad roof planes meet at a simple ridge, giving the silhouette a clear, toy-like profile.
  const roofLength = Math.hypot(depth / 2 + 0.16, roofHeight);
  const roofAngle = Math.atan2(roofHeight, depth / 2 + 0.16);
  for (const side of [-1, 1]) {
    const plane = block(
      house,
      [width + 0.5, 0.22, roofLength],
      [0, wallHeight + 0.24 + roofHeight / 2, side * (depth / 4 + 0.04)],
      roof,
    );
    plane.rotation.x = side * roofAngle;
  }
  block(house, [0.28, roofHeight * 0.72, 0.32], [width * 0.25, wallHeight + 0.38 + roofHeight * 0.64, -depth * 0.18], stone);

  return house;
}

function addWindow(
  house: Group,
  x: number,
  y: number,
  z: number,
  glass: MeshStandardMaterial,
  warmGlass: MeshStandardMaterial,
  frame: MeshStandardMaterial,
  lit: boolean,
  sideWall = false,
): void {
  const width = 0.5;
  const height = 0.48;
  const pane = lit ? warmGlass : glass;
  if (sideWall) {
    block(house, [0.1, height, width], [x, y, z], pane);
    for (const dy of [-height / 2, height / 2]) block(house, [0.13, 0.08, width + 0.12], [x + 0.04, y + dy, z], frame);
    if (lit) addGlow(house, new Vector3(x + 0.075, y, z), 0xffc66d, 0.72, 0.7);
  } else {
    block(house, [width, height, 0.1], [x, y, z], pane);
    for (const dy of [-height / 2, height / 2]) block(house, [width + 0.12, 0.08, 0.13], [x, y + dy, z + 0.04], frame);
    if (lit) addGlow(house, new Vector3(x, y, z + 0.075), 0xffc66d, 0.72, 0.7);
  }
}

/** Approximate footprint radius used to keep trees and props clear of a house. */
export function houseFootprintRadius(blueprint: HouseBlueprint): number {
  return Math.hypot(blueprint.widthModules * MODULE_WIDTH, blueprint.depthModules * MODULE_WIDTH) / 2;
}
