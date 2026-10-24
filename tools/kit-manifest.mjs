/**
 * Which source parts get baked into each runtime kit GLB (see tools/build-kits.mjs).
 *
 * The two source packs ship as ~150 MB of loose .gltf files sharing a handful of 4K PNGs. Bundling
 * the parts we actually use into one GLB per pack lets those shared textures be deduplicated once
 * instead of re-embedded per part, which is what keeps the web payload small.
 *
 * Part names are the source filenames without extension, and double as the runtime lookup keys —
 * `src/app/features/cube/engine/kits.ts` must stay in sync with these lists.
 */

/** Medieval Village MegaKit — modular pieces the house builder assembles into project houses. */
export const MEDIEVAL_PARTS = [
  // Walls: 2 units wide, 3 tall, outer skin at local z = 0, thickness toward -z.
  'Wall_Plaster_Straight',
  'Wall_Plaster_Window_Wide_Round',
  'Wall_Plaster_Window_Thin_Round',
  'Wall_Plaster_Door_Round',
  'Wall_Plaster_WoodGrid',
  'Wall_UnevenBrick_Straight',
  'Wall_UnevenBrick_Window_Wide_Round',
  'Wall_UnevenBrick_Door_Round',

  // Inserts that drop into the matching wall's opening at the wall's own transform.
  'Window_Wide_Round1',
  'Window_Thin_Round1',
  'Door_2_Round',
  'Door_4_Round',

  // Roofs: `WxD` is the wall footprint in units (x by z); the model itself adds the overhang.
  'Roof_RoundTiles_4x4',
  'Roof_RoundTiles_4x6',
  'Roof_RoundTiles_6x4',
  'Roof_RoundTiles_6x6',

  // Floors: 2x2 tiles, centered, flush with y = 0.
  'Floor_Brick',
  'Floor_WoodDark',

  // Vertical trim that hides the seam where two wall runs meet at a building corner.
  'Corner_Exterior_Brick',
  'Corner_Exterior_Wood',

  // Village dressing.
  'Prop_Chimney',
  'Prop_Chimney2',
  'Prop_Crate',
  'Prop_Wagon',
  'Prop_WoodenFence_Single',
  'Prop_Vine1',
  'Stairs_Exterior_Straight',
];

/**
 * Downtown City kit — modular skyscraper pieces for the Skills island, plus street dressing.
 *
 * Shares the Medieval kit's authoring grid exactly (2-unit-wide, 3-unit-tall wall modules with the
 * outer face at local z = 0), which is why `building-grid.ts` can place both.
 */
export const DOWNTOWN_PARTS = [
  // Upper-floor walls, one set per facade style.
  'Brick_Plain_3',
  'Brick_Window_Square_Single',
  'Brick_Window_Trim_Single',
  'Metal_Plain_3',
  'Metal_FullWindow',
  'Metal_Window_Half',
  'Trim_Plain_3',
  'Trim_Window',

  // Ground-floor walls: taller glazing and storefront detailing.
  'Metal_FirstFloor_Wall',
  'Metal_FirstFloor_Window',
  'Trim_FirstFloor_Wall',
  'Trim_FirstFloor_Window_001',

  // Entrance.
  'Door_1',
  'DoorFrame_Metal_Single',
  'Entrance_Concrete_2x1',

  // Crown bands, one per style, capping the facade below the roof.
  'Cornice_Brick_Center',
  'Cornice_Metal_Center',
  'Cornice_Trim_Center',

  // Slabs. Both are flat planes, tiled across the footprint's module grid.
  'Floor_2x2',
  'Roof_2x2',

  // Street level and rooftop dressing.
  'Prop_ACUnit',
  'Prop_Bollard',
  'Prop_Planter_Single',
  // The asphalt tile is used for its material, which the procedural round plaza borrows.
  'Street_Asphalt_6x6',
  // A quarter-circle road. Four of them around a shared centre close into a ring. The asphalt-only
  // variant is used deliberately: `Street_Curve_2Lane` carries the same arc plus a concrete apron
  // and painted red kerbs, which is exactly the sidewalk-and-red clutter this island is without.
  'Street_Asphalt_Curve_2Lane',
];

/**
 * Ultimate Fantasy RTS — the castle, mountains, trees and rocks making up the About island.
 *
 * Unlike the other three packs these models carry no textures at all, only flat per-material base
 * colours, so this kit stays tiny however many parts are added to it.
 */
export const FANTASY_PARTS = [
  // The castle at the island's centre, and the only interactive object on it.
  'Temple_SecondAge_Level3',

  'MountainLarge_Single',
  'Mountain_Single',
  'Mountain_Group_1',
  'Mountain_Group_2',

  'Resource_PineTree',
  'Resource_PineTree_Group',
  'Resource_Tree1',
  'Resource_Tree2',
  'Resource_Tree_Group',

  'Rock',
  'Rock_Group',
  'Resource_Rock_1',
  'Resource_Rock_2',
  'Resource_Rock_3',
];

/**
 * Ships — the fleet anchored around the Contact island.
 *
 * This pack ships no glTF, only .blend/.fbx/.obj, so the kit is built from OBJ (see `format`
 * below). Its materials are flat colours with no textures, so nothing is lost on the way.
 *
 * Two of the source files have a space in their name. The build replaces it with an underscore in
 * the baked part name, because three.js sanitizes node names that way when loading — so the
 * constants in kits.ts spell them `Sail_ship` and `Viking_boat`.
 */
export const SHIP_PARTS = [
  'CruiseShip',
  'Sail ship',
  'Viking boat',
  'BoatWSail',
  'Lifeboat',
  'Boat',
];

export const KITS = [
  {
    name: 'medieval',
    sourceDir: '../assets/Medieval Village MegaKit[Standard]/glTF',
    parts: MEDIEVAL_PARTS,
  },
  {
    name: 'downtown',
    sourceDir: '../assets/downtown_city/Exports/glTF (Godot)',
    parts: DOWNTOWN_PARTS,
  },
  {
    name: 'fantasy',
    sourceDir: '../assets/Ultimate Fantasy RTS - Aug 2022/glTF',
    parts: FANTASY_PARTS,
  },
  {
    name: 'ships',
    sourceDir: '../assets/Ships/OBJ',
    parts: SHIP_PARTS,
    format: 'obj',
  },
];
