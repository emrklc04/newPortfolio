import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { BuildingSide } from './building-grid';
import { addGlow } from './glow';

export type FacadeStyle = 'brick' | 'metal' | 'trim';

export interface TowerBlueprint {
  widthModules: 2 | 3;
  depthModules: 2 | 3;
  floors: number;
  style: FacadeStyle;
  entranceSide: BuildingSide;
  seed: number;
}

const TOWER_PALETTE = {
  brick: { body: 0xa77e62, accent: 0x715749, trim: 0xd0b28c },
  metal: { body: 0x71898a, accent: 0x465d61, trim: 0xb5c1ad },
  trim: { body: 0xc5aa7e, accent: 0x686052, trim: 0xe0cb9f },
} as const;

function standard(color: number, emissive = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? 2.8 : 0,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
}

function addBlock(
  parent: Group,
  geometry: BoxGeometry | CylinderGeometry,
  material: MeshStandardMaterial,
  x: number,
  y: number,
  z: number,
  rotationY = 0,
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}

/** A clean low-poly downtown tower with stepped crowns and selectively lit windows. */
export function buildTower(blueprint: TowerBlueprint, height: number): Group {
  const { widthModules, depthModules, floors, style, seed } = blueprint;
  const width = 0.78 + widthModules * 0.36;
  const depth = 0.78 + depthModules * 0.36;
  const bodyHeight = height - 0.48;
  const bodyBottom = 0.12;
  const palette = TOWER_PALETTE[style];
  const bodyMaterial = standard(palette.body);
  const accentMaterial = standard(palette.accent);
  const trimMaterial = standard(palette.trim);
  const darkWindowMaterial = standard(0x40535a);
  const warmWindowMaterial = standard(0xffdda0, 0xffa642);
  const tower = new Group();

  addBlock(
    tower,
    new BoxGeometry(width + 0.2, 0.24, depth + 0.2),
    accentMaterial,
    0,
    0.12,
    0,
  );

  if (style === 'metal') {
    const shaft = new CylinderGeometry(width * 0.43, width * 0.58, bodyHeight, 6, 1);
    addBlock(tower, shaft, bodyMaterial, 0, bodyBottom + bodyHeight / 2, 0, Math.PI / 6);
  } else {
    addBlock(
      tower,
      new BoxGeometry(width, bodyHeight, depth),
      bodyMaterial,
      0,
      bodyBottom + bodyHeight / 2,
      0,
    );
  }

  // A few broad floor bands make the silhouette legible without the old dense, realistic facade.
  for (let floor = 1; floor <= floors; floor++) {
    const y = bodyBottom + (bodyHeight * floor) / (floors + 1);
    const band = new BoxGeometry(width + 0.08, 0.075, depth + 0.08);
    addBlock(tower, band, trimMaterial, 0, y, 0);
  }

  const capY = height - 0.2;
  addBlock(tower, new BoxGeometry(width + 0.14, 0.18, depth + 0.14), accentMaterial, 0, capY, 0);
  const roofTierWidth = style === 'trim' ? width * 0.68 : width * 0.42;
  const roofTierDepth = style === 'trim' ? depth * 0.68 : depth * 0.42;
  if (style === 'metal') {
    addBlock(
      tower,
      new CylinderGeometry(roofTierWidth * 0.34, roofTierWidth / 2, 0.45, 6),
      trimMaterial,
      0,
      height - 0.24,
      0,
      Math.PI / 6,
    );
  } else {
    addBlock(
      tower,
      new BoxGeometry(roofTierWidth, 0.36, roofTierDepth),
      trimMaterial,
      0,
      height - 0.24,
      0,
    );
  }

  addWindows(
    tower,
    blueprint,
    width,
    depth,
    bodyBottom,
    bodyHeight,
    darkWindowMaterial,
    warmWindowMaterial,
  );
  return tower;
}

function addWindows(
  tower: Group,
  blueprint: TowerBlueprint,
  width: number,
  depth: number,
  bodyBottom: number,
  bodyHeight: number,
  darkMaterial: MeshStandardMaterial,
  warmMaterial: MeshStandardMaterial,
): void {
  const { floors, seed } = blueprint;
  const windowHeight = Math.min(0.26, bodyHeight / (floors + 1) * 0.34);
  const frontColumns = Math.max(2, blueprint.widthModules);
  const sideColumns = Math.max(2, blueprint.depthModules);
  const rowCount = floors + 1;

  for (let row = 0; row < rowCount; row++) {
    const y = bodyBottom + (bodyHeight * (row + 0.52)) / rowCount;
    for (let column = 0; column < frontColumns; column++) {
      const x = -width * 0.34 + (width * 0.68 * column) / Math.max(1, frontColumns - 1);
      addWindow(
        tower,
        x,
        y,
        depth / 2 + 0.025,
        0,
        windowHeight,
        seed + row * 11 + column,
        darkMaterial,
        warmMaterial,
      );
    }
    for (let side = -1; side <= 1; side += 2) {
      for (let column = 0; column < sideColumns; column++) {
        const z = -depth * 0.34 + (depth * 0.68 * column) / Math.max(1, sideColumns - 1);
        addWindow(
          tower,
          side * (width / 2 + 0.025),
          y,
          z,
          Math.PI / 2,
          windowHeight,
          seed + row * 13 + column * 3 + side,
          darkMaterial,
          warmMaterial,
        );
      }
    }
  }
}

function addWindow(
  tower: Group,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  height: number,
  variation: number,
  darkMaterial: MeshStandardMaterial,
  warmMaterial: MeshStandardMaterial,
): void {
  const lit = Math.abs(variation * 17 + Math.round(y * 100)) % 5 === 0;
  const windowMaterial = lit ? warmMaterial : darkMaterial;
  const window = new Mesh(new BoxGeometry(0.19, height, 0.045), windowMaterial);
  window.position.set(x, y, z);
  window.rotation.y = rotationY;
  tower.add(window);

  if (lit) {
    addGlow(tower, new Vector3(x, y, z), 0xffc66d, 0.48, 0.62);
  }
}

/** Approximate radius of the custom tower's base, used to keep greenery clear. */
export function towerFootprintRadius(blueprint: TowerBlueprint): number {
  const width = 0.78 + blueprint.widthModules * 0.36;
  const depth = 0.78 + blueprint.depthModules * 0.36;
  return Math.hypot(width, depth) / 2;
}
