import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import {
  BuildingSide,
  MODULE_WIDTH,
  STOREY_HEIGHT,
  forEachWallSlot,
  moduleOffsets,
  seededRandom,
} from './building-grid';
import { kitPart } from './kit-loader';
import { DOWNTOWN, Kit } from './kits';
import { cloneModel } from './model-utils';

/**
 * Assembles a skyscraper out of Downtown City kit pieces.
 *
 * Like the Medieval pack, this kit is modular — it does ship three prefab buildings, but only
 * three, so stacking the modular pieces here is what lets every skill get a tower of its own
 * height and facade. The wall grid is shared with the houses (see building-grid.ts).
 *
 * Towers are built at the kit's native scale (a floor is 3 units) and are meant to be normalized
 * to a target height by the caller.
 */

/** Height of the crown band capping the facade, taken from the Cornice_* models. */
const CORNICE_HEIGHT = 1;

/** Keeps the interior shell clear of the walls' inward thickness (0.2) on every side. */
const INTERIOR_INSET = 0.5;

/** Flat roof and floor slabs are modelled as planes offset from their origin by this much. */
const SLAB_OFFSET = 0.2;

export type FacadeStyle = 'brick' | 'metal' | 'trim';

export interface TowerBlueprint {
  /** Footprint along x, in 2-unit wall modules. */
  widthModules: 2 | 3;
  /** Footprint along z, in 2-unit wall modules. */
  depthModules: 2 | 3;
  /** Storeys above the ground floor. */
  floors: number;
  style: FacadeStyle;
  /** Which face the entrance sits on: 0 = +z, 1 = +x, 2 = -z, 3 = -x. */
  entranceSide: BuildingSide;
  /** Drives the deterministic window/wall mix, so each tower differs but is stable. */
  seed: number;
}

interface FacadeParts {
  plain: string;
  window: string;
  /** Second window variant, so long runs of facade don't repeat one motif. */
  windowAlt: string;
  groundWall: string;
  groundWindow: string;
  cornice: string;
}

const FACADES: Record<FacadeStyle, FacadeParts> = {
  brick: {
    plain: DOWNTOWN.brickPlain,
    window: DOWNTOWN.brickWindow,
    windowAlt: DOWNTOWN.brickWindowTrim,
    groundWall: DOWNTOWN.trimGroundWall,
    groundWindow: DOWNTOWN.trimGroundWindow,
    cornice: DOWNTOWN.corniceBrick,
  },
  metal: {
    plain: DOWNTOWN.metalPlain,
    window: DOWNTOWN.metalWindow,
    windowAlt: DOWNTOWN.metalWindowHalf,
    groundWall: DOWNTOWN.metalGroundWall,
    groundWindow: DOWNTOWN.metalGroundWindow,
    cornice: DOWNTOWN.corniceMetal,
  },
  trim: {
    plain: DOWNTOWN.trimPlain,
    window: DOWNTOWN.trimWindow,
    windowAlt: DOWNTOWN.trimWindow,
    groundWall: DOWNTOWN.trimGroundWall,
    groundWindow: DOWNTOWN.trimGroundWindow,
    cornice: DOWNTOWN.corniceTrim,
  },
};

/**
 * An unlit dark shell just inside the walls, so the glazing reads as a dim interior instead of
 * showing straight through the building and out the far side.
 */
function createInterior(width: number, depth: number, height: number): Mesh {
  const interior = new Mesh(
    new BoxGeometry(width - INTERIOR_INSET, height, depth - INTERIOR_INSET),
    new MeshStandardMaterial({ color: 0x1b2027, roughness: 1, metalness: 0 }),
  );
  interior.position.y = height / 2;
  return interior;
}

/** Builds one tower, centred on the origin with its ground floor at y = 0. */
export function buildTower(kit: Kit, blueprint: TowerBlueprint): Group {
  const { widthModules, depthModules, floors, style, seed } = blueprint;
  const parts = FACADES[style];
  const rand = seededRandom(seed);

  const width = widthModules * MODULE_WIDTH;
  const depth = depthModules * MODULE_WIDTH;
  // The ground floor plus every storey above it.
  const facadeHeight = (floors + 1) * STOREY_HEIGHT;
  const tower = new Group();

  tower.add(createInterior(width, depth, facadeHeight));
  addSlab(tower, kit, DOWNTOWN.floor, widthModules, depthModules, 0);

  for (let storey = 0; storey <= floors; storey++) {
    addStorey(tower, kit, parts, blueprint, storey, rand);
  }

  addCornice(tower, kit, parts.cornice, widthModules, depthModules, facadeHeight);

  const roofY = facadeHeight + CORNICE_HEIGHT;
  addSlab(tower, kit, DOWNTOWN.roof, widthModules, depthModules, roofY + SLAB_OFFSET);
  addRoofUnits(tower, kit, width, depth, roofY, rand);

  return tower;
}

/** Tiles a flat slab model (floor or roof) across the footprint's module grid. */
function addSlab(
  tower: Group,
  kit: Kit,
  part: string,
  widthModules: number,
  depthModules: number,
  y: number,
): void {
  for (const x of moduleOffsets(widthModules)) {
    for (const z of moduleOffsets(depthModules)) {
      const tile = cloneModel(kitPart(kit, part));
      tile.position.set(x, y, z);
      tower.add(tile);
    }
  }
}

function addStorey(
  tower: Group,
  kit: Kit,
  parts: FacadeParts,
  blueprint: TowerBlueprint,
  storey: number,
  rand: () => number,
): void {
  const { widthModules, depthModules, entranceSide } = blueprint;
  const isGroundFloor = storey === 0;
  const baseY = storey * STOREY_HEIGHT;

  forEachWallSlot(widthModules, depthModules, baseY, (wall, slot) => {
    if (isGroundFloor) {
      const isEntrance = slot.side === entranceSide && slot.moduleIndex === slot.middleIndex;
      wall.add(cloneModel(kitPart(kit, isEntrance ? parts.groundWall : parts.groundWindow)));
      if (isEntrance) {
        addEntrance(wall, kit);
      }
    } else {
      // Offices are mostly glazed; the occasional solid panel keeps the facade from looking like
      // a uniform grid.
      const roll = rand();
      const part = roll < 0.18 ? parts.plain : roll < 0.6 ? parts.window : parts.windowAlt;
      wall.add(cloneModel(kitPart(kit, part)));
    }
    tower.add(wall);
  });
}

/** Door, frame and a stoop, added into an already-positioned ground-floor wall slot. */
function addEntrance(wall: Group, kit: Kit): void {
  wall.add(cloneModel(kitPart(kit, DOWNTOWN.doorFrame)));

  // Door_1 is modelled hinge-first spanning x ∈ [-1, 0], so it fills the left half of the module
  // as authored; shifting it by half its width centres it in the frame.
  const door = cloneModel(kitPart(kit, DOWNTOWN.door));
  door.position.x = 0.5;
  wall.add(door);

  // The stoop sits proud of the facade, on the outward (+z) side of the slot.
  const stoop = cloneModel(kitPart(kit, DOWNTOWN.entranceStep));
  stoop.position.z = 0.02;
  wall.add(stoop);
}

/** The crown band that caps the facade, running around all four sides. */
function addCornice(
  tower: Group,
  kit: Kit,
  part: string,
  widthModules: number,
  depthModules: number,
  y: number,
): void {
  forEachWallSlot(widthModules, depthModules, y, (slotGroup) => {
    slotGroup.add(cloneModel(kitPart(kit, part)));
    tower.add(slotGroup);
  });
}

/** Air-conditioning units scattered on the roof, so the skyline isn't flat and bare. */
function addRoofUnits(
  tower: Group,
  kit: Kit,
  width: number,
  depth: number,
  roofY: number,
  rand: () => number,
): void {
  const count = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const unit = cloneModel(kitPart(kit, DOWNTOWN.acUnit));
    // Inset from the parapet so units never hang over the edge.
    unit.position.set((rand() - 0.5) * (width - 1.6), roofY, (rand() - 0.5) * (depth - 1.6));
    unit.rotation.y = rand() * Math.PI * 2;
    tower.add(unit);
  }
}

/** Footprint radius of a built tower in kit units — used to keep decor from growing into it. */
export function towerFootprintRadius(blueprint: TowerBlueprint): number {
  const width = blueprint.widthModules * MODULE_WIDTH;
  const depth = blueprint.depthModules * MODULE_WIDTH;
  return Math.hypot(width, depth) / 2;
}
