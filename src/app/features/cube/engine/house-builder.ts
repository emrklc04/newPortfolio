import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import {
  MODULE_WIDTH,
  STOREY_HEIGHT,
  BuildingSide,
  forEachWallSlot,
  moduleOffsets,
  seededRandom,
} from './building-grid';
import { kitPart } from './kit-loader';
import { Kit, MEDIEVAL } from './kits';
import { cloneModel } from './model-utils';

/**
 * Assembles a house out of Medieval Village MegaKit pieces.
 *
 * The pack is purely modular — it ships walls, roofs, floors and openings, but no prefab houses —
 * so every project's house is put together here from those parts. The wall grid itself lives in
 * building-grid.ts, shared with the Downtown City towers; see kits.ts for the pack-specific
 * conventions.
 *
 * Houses are built at the kit's native scale (a one-storey house is ~7 units tall) and are meant
 * to be normalized to a target height by the caller.
 */

/**
 * The door opening is centred on the wall module and ~1.3 wide, but the door leaf is modelled
 * hinge-first spanning x ∈ [-0.04, 1.07]. Shifting it by half its own width re-centres the leaf in
 * the opening (measured with tools/probe-opening.mjs). Window inserts need no such offset — they
 * are already centred.
 */
const DOOR_LEAF_OFFSET_X = -0.515;

/** Keeps the interior shell clear of the walls' inward thickness (0.4) on every side. */
const INTERIOR_INSET = 0.9;

export type WallStyle = 'plaster' | 'brick';

export interface HouseBlueprint {
  /** Footprint along x, in 2-unit wall modules. */
  widthModules: 2 | 3;
  /** Footprint along z, in 2-unit wall modules. */
  depthModules: 2 | 3;
  storeys: 1 | 2;
  style: WallStyle;
  /** Which face the entrance sits on: 0 = +z, 1 = +x, 2 = -z, 3 = -x. */
  entranceSide: BuildingSide;
  /** Drives the deterministic window/wall mix, so each house looks different but is stable. */
  seed: number;
}

interface StyleParts {
  plain: string;
  window: string;
  windowInsert: string;
  door: string;
  doorLeaf: string;
  floor: string;
}

const STYLES: Record<WallStyle, StyleParts> = {
  plaster: {
    plain: MEDIEVAL.wallPlaster,
    window: MEDIEVAL.wallPlasterWindowWide,
    windowInsert: MEDIEVAL.windowWide,
    door: MEDIEVAL.wallPlasterDoor,
    doorLeaf: MEDIEVAL.door,
    floor: MEDIEVAL.floorWood,
  },
  brick: {
    plain: MEDIEVAL.wallBrick,
    window: MEDIEVAL.wallBrickWindowWide,
    windowInsert: MEDIEVAL.windowWide,
    door: MEDIEVAL.wallBrickDoor,
    doorLeaf: MEDIEVAL.doorAlt,
    floor: MEDIEVAL.floorBrick,
  },
};

/** `Roof_RoundTiles_WxD` covers a wall footprint of W by D units, so the key is the footprint. */
const ROOFS: Record<string, string> = {
  '4x4': MEDIEVAL.roof4x4,
  '4x6': MEDIEVAL.roof4x6,
  '6x4': MEDIEVAL.roof6x4,
  '6x6': MEDIEVAL.roof6x6,
};

/**
 * An unlit dark shell just inside the walls. Without it the door and window openings look straight
 * through the house and out the other side, which breaks the illusion far more than a crude
 * interior does.
 */
function createInterior(width: number, depth: number, height: number): Mesh {
  const interior = new Mesh(
    new BoxGeometry(width - INTERIOR_INSET, height, depth - INTERIOR_INSET),
    new MeshStandardMaterial({ color: 0x2a1f18, roughness: 1, metalness: 0 }),
  );
  interior.position.y = height / 2;
  return interior;
}

/** Builds one house, centred on the origin with its ground floor at y = 0. */
export function buildHouse(kit: Kit, blueprint: HouseBlueprint): Group {
  const { widthModules, depthModules, storeys, style, entranceSide, seed } = blueprint;
  const parts = STYLES[style];
  const rand = seededRandom(seed);

  const width = widthModules * MODULE_WIDTH;
  const depth = depthModules * MODULE_WIDTH;
  const house = new Group();

  house.add(createInterior(width, depth, storeys * STOREY_HEIGHT));

  for (let storey = 0; storey < storeys; storey++) {
    const baseY = storey * STOREY_HEIGHT;
    addFloor(house, kit, parts.floor, widthModules, depthModules, baseY);
    addWalls(house, kit, parts, blueprint, baseY, storey === 0, rand);
    addCorners(house, kit, width, depth, baseY);
  }

  addRoof(house, kit, width, depth, storeys * STOREY_HEIGHT);
  addChimney(house, kit, width, depth, storeys * STOREY_HEIGHT, entranceSide, rand);

  return house;
}

function addFloor(
  house: Group,
  kit: Kit,
  floorPart: string,
  widthModules: number,
  depthModules: number,
  baseY: number,
): void {
  for (const x of moduleOffsets(widthModules)) {
    for (const z of moduleOffsets(depthModules)) {
      const tile = cloneModel(kitPart(kit, floorPart));
      tile.position.set(x, baseY, z);
      house.add(tile);
    }
  }
}

function addWalls(
  house: Group,
  kit: Kit,
  parts: StyleParts,
  blueprint: HouseBlueprint,
  baseY: number,
  isGroundFloor: boolean,
  rand: () => number,
): void {
  const { widthModules, depthModules, entranceSide } = blueprint;

  forEachWallSlot(widthModules, depthModules, baseY, (wall, slot) => {
    const isEntrance =
      isGroundFloor && slot.side === entranceSide && slot.moduleIndex === slot.middleIndex;

    // Upper storeys get windows more freely; on the ground floor they compete with the door and
    // read better kept sparser.
    const windowChance = isGroundFloor ? 0.45 : 0.7;
    const hasWindow = !isEntrance && rand() < windowChance;

    let wallPart = parts.plain;
    let insertPart: string | null = null;
    if (isEntrance) {
      wallPart = parts.door;
      insertPart = parts.doorLeaf;
    } else if (hasWindow) {
      wallPart = parts.window;
      insertPart = parts.windowInsert;
    }

    wall.add(cloneModel(kitPart(kit, wallPart)));
    if (insertPart) {
      const insert = cloneModel(kitPart(kit, insertPart));
      if (isEntrance) {
        insert.position.x = DOOR_LEAF_OFFSET_X;
      }
      wall.add(insert);
    }
    house.add(wall);
  });
}

/** Vertical timber posts hiding the seam where two wall runs meet. */
function addCorners(house: Group, kit: Kit, width: number, depth: number, baseY: number): void {
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-depth / 2, depth / 2]) {
      const post = cloneModel(kitPart(kit, MEDIEVAL.cornerWood));
      post.position.set(x, baseY, z);
      house.add(post);
    }
  }
}

function addRoof(house: Group, kit: Kit, width: number, depth: number, topY: number): void {
  const roofPart = ROOFS[`${width}x${depth}`];
  if (!roofPart) {
    throw new Error(`No roof model for a ${width}x${depth} footprint.`);
  }
  const roof = cloneModel(kitPart(kit, roofPart));

  // Most roofs in the pack are modelled centred on their origin, but not all of them —
  // Roof_RoundTiles_6x4 sits entirely on +z, for instance. Measuring and re-centring horizontally
  // makes placement independent of each model's authored pivot.
  roof.updateMatrixWorld(true);
  const box = new Box3().setFromObject(roof);
  const center = new Vector3();
  box.getCenter(center);
  roof.position.x -= center.x;
  roof.position.z -= center.z;

  // Roofs model their own overhang dipping below the origin, so the origin goes at the wall top
  // and the fascia laps over it. That vertical relationship is deliberate, so y is left alone.
  roof.position.y = topY;
  house.add(roof);
}

/**
 * Stands a chimney on the wall top, inset from a corner so it rises through the roof's lower slope
 * rather than the ridge. Deliberately not on the entrance side, so it never hides the front door.
 */
function addChimney(
  house: Group,
  kit: Kit,
  width: number,
  depth: number,
  topY: number,
  entranceSide: number,
  rand: () => number,
): void {
  const part = rand() < 0.5 ? MEDIEVAL.chimney : MEDIEVAL.chimneyAlt;
  const chimney = cloneModel(kitPart(kit, part));

  // Along the entrance axis it goes to the far side; across it, either corner will do.
  const xSign = entranceSide % 2 === 0 ? (rand() < 0.5 ? -1 : 1) : entranceSide === 1 ? -1 : 1;
  const zSign = entranceSide % 2 === 1 ? (rand() < 0.5 ? -1 : 1) : entranceSide === 0 ? -1 : 1;
  chimney.position.set(xSign * (width / 2 - 0.9), topY, zSign * (depth / 2 - 0.9));
  house.add(chimney);
}

/** Footprint radius of a built house in kit units — used to keep greenery from growing into it. */
export function houseFootprintRadius(blueprint: HouseBlueprint): number {
  const width = blueprint.widthModules * MODULE_WIDTH;
  const depth = blueprint.depthModules * MODULE_WIDTH;
  return Math.hypot(width, depth) / 2;
}
