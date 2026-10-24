import type { Object3D } from 'three';

/**
 * Named parts inside the baked kit GLBs in public/models/.
 *
 * Each file is produced by `npm run build:kits` from the source packs under ../assets — every part
 * listed in tools/kit-manifest.mjs becomes one top-level node named exactly as below, so these
 * string literals are the lookup keys. Keep the two lists in sync; `loadKit` throws on a missing
 * part rather than silently rendering nothing.
 *
 * Licensing: Medieval Village MegaKit (Standard license), Downtown City and Ultimate Fantasy RTS,
 * all from the ../assets folder — see the licence files shipped alongside each source pack.
 */

export const KIT_URLS = {
  medieval: '/models/medieval.glb',
  downtown: '/models/downtown.glb',
  fantasy: '/models/fantasy.glb',
  ships: '/models/ships.glb',
} as const;

export type KitName = keyof typeof KIT_URLS;

/**
 * Medieval Village MegaKit parts. The pack is fully modular — there are no prefab houses, so
 * `house-builder.ts` assembles these walls/roofs/floors into one house per project.
 *
 * Shared conventions measured from the source models (tools/inspect-kit.mjs):
 * - Walls span x ∈ [-1, 1] and y ∈ [0, 3], with the *outer* face at local z ≈ 0 and the thickness
 *   extending toward -z. So a wall placed at z = d facing +z encloses space on its -z side.
 * - Window inserts are centred on x and vertically positioned for a 3-unit wall, so they drop into
 *   the matching `Wall_*_Window_*` opening at the wall's own transform with no extra offset.
 * - Floors are 2x2 tiles centred on the origin, flush with y = 0.
 * - `Roof_RoundTiles_WxD` covers a wall footprint of W by D units (x by z) and models its own
 *   overhang beyond that, extending ~0.5 below its origin to lap over the wall top.
 */
export const MEDIEVAL = {
  wallPlaster: 'Wall_Plaster_Straight',
  wallPlasterWindowWide: 'Wall_Plaster_Window_Wide_Round',
  wallPlasterWindowThin: 'Wall_Plaster_Window_Thin_Round',
  wallPlasterDoor: 'Wall_Plaster_Door_Round',
  wallPlasterWoodGrid: 'Wall_Plaster_WoodGrid',
  wallBrick: 'Wall_UnevenBrick_Straight',
  wallBrickWindowWide: 'Wall_UnevenBrick_Window_Wide_Round',
  wallBrickDoor: 'Wall_UnevenBrick_Door_Round',

  windowWide: 'Window_Wide_Round1',
  windowThin: 'Window_Thin_Round1',
  door: 'Door_2_Round',
  doorAlt: 'Door_4_Round',

  roof4x4: 'Roof_RoundTiles_4x4',
  roof4x6: 'Roof_RoundTiles_4x6',
  roof6x4: 'Roof_RoundTiles_6x4',
  roof6x6: 'Roof_RoundTiles_6x6',

  floorBrick: 'Floor_Brick',
  floorWood: 'Floor_WoodDark',

  cornerBrick: 'Corner_Exterior_Brick',
  cornerWood: 'Corner_Exterior_Wood',

  chimney: 'Prop_Chimney',
  chimneyAlt: 'Prop_Chimney2',
  crate: 'Prop_Crate',
  wagon: 'Prop_Wagon',
  fence: 'Prop_WoodenFence_Single',
  vine: 'Prop_Vine1',
  stairs: 'Stairs_Exterior_Straight',
} as const;

/**
 * Downtown City parts. The pack follows the same wall grid as the Medieval kit (see
 * building-grid.ts), so `tower-builder.ts` stacks these the same way houses are assembled:
 * - Wall modules span x ∈ [-1, 1] and y ∈ [0, 3], outer face at local z = 0, thickness toward -z.
 *
 *   Watch the width: the pack also ships double-width (4-unit) panels whose names are not always
 *   obvious — `Brick_Window_CurvedDouble`, `Brick_RedWhite_DoubleWindow`, `Brick_Inset` and
 *   `Metal_Window` are all 4 wide. Dropping one of those into a single module slot overhangs it by
 *   a unit on each side and visibly shreds the facade, so only 2-wide parts belong below. Check a
 *   new part with `node tools/inspect-kit.mjs <kit-dir> <Part>` before adding it.
 * - `Floor_2x2` and `Roof_2x2` are flat 2x2 planes offset 0.1/0.2 from their origin, tiled across
 *   the footprint rather than picked per footprint size.
 * - `Cornice_*_Center` is a 2x1 crown band using the same outward-facing convention as the walls.
 */
export const DOWNTOWN = {
  brickPlain: 'Brick_Plain_3',
  brickWindow: 'Brick_Window_Square_Single',
  brickWindowTrim: 'Brick_Window_Trim_Single',

  metalPlain: 'Metal_Plain_3',
  metalWindow: 'Metal_FullWindow',
  metalWindowHalf: 'Metal_Window_Half',
  metalGroundWall: 'Metal_FirstFloor_Wall',
  metalGroundWindow: 'Metal_FirstFloor_Window',

  trimPlain: 'Trim_Plain_3',
  trimWindow: 'Trim_Window',
  trimGroundWall: 'Trim_FirstFloor_Wall',
  trimGroundWindow: 'Trim_FirstFloor_Window_001',

  door: 'Door_1',
  doorFrame: 'DoorFrame_Metal_Single',
  entranceStep: 'Entrance_Concrete_2x1',
  /** Same model as `entranceStep`, aliased because the Skills plaza borrows its concrete material
   * (MI_Trim_MetalConcrete) for the procedurally built paving disc. */
  concrete: 'Entrance_Concrete_2x1',

  corniceBrick: 'Cornice_Brick_Center',
  corniceMetal: 'Cornice_Metal_Center',
  corniceTrim: 'Cornice_Trim_Center',

  floor: 'Floor_2x2',
  roof: 'Roof_2x2',

  acUnit: 'Prop_ACUnit',
  bollard: 'Prop_Bollard',
  planter: 'Prop_Planter_Single',
  asphalt: 'Street_Asphalt_6x6',
  /**
   * Quarter-circle road surface, asphalt only. Its pivot is the arc's centre and the band runs
   * from radius 6 to 10, so four copies rotated 90° apart around one point close into a ring of
   * centreline radius 8.
   */
  roadCurve: 'Street_Asphalt_Curve_2Lane',
} as const;

/**
 * Ultimate Fantasy RTS parts: the About island's castle and mountains, plus the trees and rocks
 * used as scenery on all three islands.
 *
 * These are whole props rather than modular pieces, so there is no shared grid to respect — each
 * one is simply scattered and normalized to a target size. They carry no textures, only flat
 * per-material base colours, which is what gives the scenery its clean low-poly look against the
 * textured buildings.
 */
export const FANTASY = {
  /** The castle at the island's centre — the only thing on it you can click. */
  castle: 'Temple_SecondAge_Level3',

  mountains: ['MountainLarge_Single', 'Mountain_Single'],
  mountainGroups: ['Mountain_Group_1', 'Mountain_Group_2'],

  trees: ['Resource_Tree1', 'Resource_Tree2'],
  pines: ['Resource_PineTree'],
  treeGroups: ['Resource_Tree_Group', 'Resource_PineTree_Group'],

  rocks: ['Resource_Rock_1', 'Resource_Rock_2', 'Resource_Rock_3'],
  pebbles: ['Rock', 'Rock_Group'],
} as const;

/**
 * Ships, anchored around the Contact island.
 *
 * Built from the pack's OBJ files (it ships no glTF). Two source filenames contain a space, which
 * the build replaces with an underscore because three.js sanitizes node names that way on load.
 *
 * Every hull is modelled lying on y = 0 rather than at its waterline, so the Contact island sinks
 * each one by a share of its height to put it *in* the water instead of on it. All are modelled
 * lengthwise along their local z axis.
 */
export const SHIPS = {
  cruise: 'CruiseShip',
  sail: 'Sail_ship',
  viking: 'Viking_boat',
  smallSail: 'BoatWSail',
  lifeboat: 'Lifeboat',
  rowboat: 'Boat',
} as const;

/** A loaded kit: part name -> that part's template node, ready to be cloned. */
export type Kit = ReadonlyMap<string, Object3D>;

/** Every kit, keyed by name, as handed to the island builders. */
export type Kits = Record<KitName, Kit>;
