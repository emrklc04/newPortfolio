import { Group } from 'three';

/**
 * The modular building grid shared by the Medieval Village and Downtown City kits.
 *
 * Both packs happen to be authored to the same convention, measured off the source models with
 * tools/inspect-kit.mjs: wall modules are 2 units wide and 3 units tall, with the *outer* face at
 * local z = 0 and the wall's thickness extending toward -z. So a wall placed at z = d facing +z
 * encloses space on its -z side, and the pieces can be laid out by the same code regardless of
 * which kit they came from.
 */

export const MODULE_WIDTH = 2;
export const STOREY_HEIGHT = 3;

/** Which face a wall run sits on: 0 = +z, 1 = +x, 2 = -z, 3 = -x. */
export type BuildingSide = 0 | 1 | 2 | 3;

/** Rotation that turns a module's outward (+z) face toward each side. */
const SIDE_ROTATIONS: Record<BuildingSide, number> = {
  0: 0,
  1: Math.PI / 2,
  2: Math.PI,
  3: -Math.PI / 2,
};

export interface WallSlot {
  side: BuildingSide;
  /** Index of this module along its side, 0-based. */
  moduleIndex: number;
  /** How many modules that side holds, so callers can find its middle. */
  moduleCount: number;
  /** Index of the side's middle module — where an entrance goes. With an even module count there
   * is no true middle, so it lands just left of centre. */
  middleIndex: number;
}

/** Evenly spaced module centre offsets along one side, e.g. 3 modules -> [-2, 0, 2]. */
export function moduleOffsets(moduleCount: number): number[] {
  return Array.from(
    { length: moduleCount },
    (_, index) => (index - (moduleCount - 1) / 2) * MODULE_WIDTH,
  );
}

/**
 * Creates an empty, correctly positioned and rotated group for one wall module, ready for kit
 * pieces to be added at its local origin.
 */
export function createWallSlotGroup(
  side: BuildingSide,
  offset: number,
  width: number,
  depth: number,
  baseY: number,
): Group {
  const group = new Group();
  group.rotation.y = SIDE_ROTATIONS[side];

  // Sides 0 and 2 run along x, sides 1 and 3 along z.
  if (side % 2 === 0) {
    group.position.set(offset, baseY, side === 0 ? depth / 2 : -depth / 2);
  } else {
    group.position.set(side === 1 ? width / 2 : -width / 2, baseY, offset);
  }
  return group;
}

/**
 * Walks every wall module of one storey, in side order, handing the caller a positioned group to
 * fill. Returning the group rather than taking a part name keeps this agnostic about what each
 * kit wants to stack into a slot.
 */
export function forEachWallSlot(
  widthModules: number,
  depthModules: number,
  baseY: number,
  visit: (slotGroup: Group, slot: WallSlot) => void,
): void {
  const width = widthModules * MODULE_WIDTH;
  const depth = depthModules * MODULE_WIDTH;

  for (let side = 0 as BuildingSide; side < 4; side = (side + 1) as BuildingSide) {
    const moduleCount = side % 2 === 0 ? widthModules : depthModules;
    const middleIndex = Math.floor((moduleCount - 1) / 2);

    moduleOffsets(moduleCount).forEach((offset, moduleIndex) => {
      const slotGroup = createWallSlotGroup(side, offset, width, depth, baseY);
      visit(slotGroup, { side, moduleIndex, moduleCount, middleIndex });
    });
  }
}

/** Deterministic pseudo-random generator (mulberry32) — a given seed always rebuilds the same
 * building, so facades look varied without reshuffling on every reload. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
