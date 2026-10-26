import { Vector3 } from 'three';

/**
 * The islands making up the world, and how they sit relative to each other.
 *
 * Ids mirror the header nav's link ids, so the same identifier works for a camera fly-to and for
 * nav routing. Sections without an island of their own open as panels instead — see
 * cube-experience.ts.
 *
 * Bridges are assembled separately in the scene so they can span between island wrappers.
 */
export type IslandId = 'projects' | 'skills' | 'about' | 'contact';

export interface IslandDefinition {
  id: IslandId;
  title: string;
  position: Vector3;
  /** Footprint radius of the island's top surface. */
  radius: number;
  /** How far the tallest building on this island reaches above the ground. Camera framing and the
   * title chip's height both derive from it — without it, the Skills towers overshoot the top of
   * a view framed on footprint alone. */
  contentHeight: number;
  /** Fewer segments reads as a jagged landmass, more as a smooth platform. */
  radialSegments: number;
  colors: { grass: number; rock: number };
  /** Lower values give the top surface a wet sheen. Defaults to a dry, matte ground. */
  topRoughness?: number;
}

/** Radius of a sphere enclosing both the island's footprint and the buildings standing on it. */
export function framingRadius(island: IslandDefinition): number {
  return Math.hypot(island.radius, island.contentHeight);
}

export const ISLANDS: readonly IslandDefinition[] = [
  {
    id: 'projects',
    title: 'Projekte',
    position: new Vector3(0, 0, 0),
    radius: 8,
    contentHeight: 3.1,
    radialSegments: 14,
    colors: { grass: 0x6f9e4a, rock: 0x6b5f4e },
  },
  {
    id: 'skills',
    title: 'Skills',
    // Offset far enough that the two read as separate places rather than one landmass, and raised
    // slightly so the skyline doesn't sit flush with the village.
    position: new Vector3(26, 2.5, -4),
    radius: 7,
    contentHeight: 5.4,
    radialSegments: 16,
    // Cooler, greyer ground than the village: this island is a city block, not a meadow.
    colors: { grass: 0x5c7d4e, rock: 0x5a5a60 },
  },
  {
    id: 'about',
    title: 'Über mich',
    // Set off from the line between the other two so the three read as a triangle rather than a
    // row, and dropped below them so the castle does not compete with the Skills skyline.
    position: new Vector3(13, -3, 21),
    radius: 8.5,
    contentHeight: 6.5,
    radialSegments: 13,
    // Deeper forest green over darker rock than the village's meadow.
    colors: { grass: 0x4f7a3c, rock: 0x5f5546 },
  },
  {
    id: 'contact',
    title: 'Kontakt',
    // Opposite the Skills island, completing a loose quad rather than a line.
    position: new Vector3(-16, 1.5, 16),
    radius: 9.5,
    contentHeight: 5.2,
    // Smoother than the others: this island's "ground" is open water, which should not read as a
    // chunk of rock.
    radialSegments: 22,
    // `grass` is the island's top surface, which here is the sea.
    colors: { grass: 0x2f6f96, rock: 0x4a4f57 },
    topRoughness: 0.35,
  },
];

export function findIsland(id: IslandId): IslandDefinition {
  const island = ISLANDS.find((entry) => entry.id === id);
  if (!island) {
    throw new Error(`Unknown island id: ${id}`);
  }
  return island;
}

/** Smallest sphere containing every island — used to frame the initial "whole world" view. */
export function worldBounds(): { center: Vector3; radius: number } {
  const center = new Vector3();
  ISLANDS.forEach((island) => center.add(island.position));
  center.divideScalar(ISLANDS.length);

  const radius = ISLANDS.reduce(
    (max, island) => Math.max(max, island.position.distanceTo(center) + framingRadius(island)),
    0,
  );

  return { center, radius };
}
