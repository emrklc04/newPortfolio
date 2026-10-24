import { ConeGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three';

export interface IslandBaseOptions {
  topRadius: number;
  topHeight?: number;
  /** Defaults to a fixed proportion of `topRadius`, which keeps the rock looking like the same
   * landmass whatever the island is scaled to. */
  undersideHeight?: number;
  /** Fewer segments reads as a jagged/rocky landmass, more segments as a smooth round platform. */
  radialSegments?: number;
  topColor: number;
  rockColor: number;
  /** Lower values give the top surface a wet sheen — used to read the Contact island's top as
   * open water rather than ground. */
  topRoughness?: number;
}

/** Proportion of the island's radius the rocky underside hangs below the ground slab. */
const UNDERSIDE_RATIO = 0.85;

/** How far the ground slab's rim is rounded off, as a proportion of its height. */
const RIM_ROUND_RATIO = 0.55;

/** Facets across the rounded rim. Kept low so the roll reads as a soft chamfer under flat shading
 * rather than a smooth, CAD-like fillet. */
const RIM_SEGMENTS = 3;

/** Radius the slab narrows to where it meets the rock, as a proportion of the top radius. */
const SLAB_TAPER = 0.9;

function defaultTopHeight(topRadius: number): number {
  return Math.max(0.6, topRadius * 0.07);
}

function rimRadius(topRadius: number, topHeight: number): number {
  return Math.min(topHeight * RIM_ROUND_RATIO, topRadius * 0.05);
}

/**
 * Radius out to which the island's top surface is actually flat and level with y = 0 — which is
 * less than `topRadius`, for two compounding reasons:
 *
 * 1. The rim is rounded, so the surface starts curving downward `rim` units before the edge.
 * 2. The slab is a lathe, i.e. a polygon rather than a circle, so between two of its vertices the
 *    edge sits closer to the centre by a factor of cos(π / segments).
 *
 * Scenery is seated at y = 0, so anything placed past this radius hangs in the air over the rim.
 * Island builders size their outermost scatter rings against this rather than against `topRadius`.
 */
export function flatTopRadius(
  topRadius: number,
  radialSegments: number,
  topHeight = defaultTopHeight(topRadius),
): number {
  const flatToVertex = topRadius - rimRadius(topRadius, topHeight);
  return flatToVertex * Math.cos(Math.PI / radialSegments);
}

/**
 * Lathe profile for the ground slab, as (radius, height) pairs running from the centre of the
 * grass surface out to the rim, around the rounded corner, and down to where the rock begins.
 *
 * Returned bottom-to-top: LatheGeometry derives its winding from the profile's direction, and a
 * top-down profile produces inward-facing normals — which backface-culls the grass surface and
 * leaves the rock below showing through it.
 */
function slabProfile(topRadius: number, topHeight: number): Vector2[] {
  const rim = rimRadius(topRadius, topHeight);
  const points = [new Vector2(0, 0), new Vector2(topRadius - rim, 0)];

  for (let i = 1; i <= RIM_SEGMENTS; i++) {
    const angle = (i / RIM_SEGMENTS) * (Math.PI / 2);
    points.push(new Vector2(topRadius - rim + Math.sin(angle) * rim, -rim + Math.cos(angle) * rim));
  }

  points.push(new Vector2(topRadius * SLAB_TAPER, -topHeight));
  return points.reverse();
}

/**
 * Stylized "floating island" base: a flat low-poly top (where content stands, at local y = 0)
 * tapering into a rocky underside point below. Content builders only rely on the top surface
 * sitting at y = 0.
 */
export function createIslandBase(options: IslandBaseOptions): Group {
  const {
    topRadius,
    topHeight = defaultTopHeight(topRadius),
    undersideHeight = topRadius * UNDERSIDE_RATIO,
    radialSegments = 8,
    topColor,
    rockColor,
    topRoughness = 0.9,
  } = options;

  const group = new Group();

  const topMaterial = new MeshStandardMaterial({
    color: topColor,
    flatShading: true,
    roughness: topRoughness,
    metalness: 0.02,
  });
  // Revolved from a profile rather than built as a cylinder, so the rim where the grass meets the
  // side is rounded off instead of meeting at a hard edge. The slab also narrows toward the
  // bottom, so the ground doesn't read as a flat disc welded onto the rock underside.
  const top = new Mesh(
    new LatheGeometry(slabProfile(topRadius, topHeight), radialSegments),
    topMaterial,
  );
  group.add(top);

  const rockMaterial = new MeshStandardMaterial({
    color: rockColor,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  });
  // ConeGeometry puts its apex at +height/2 and its base circle at -height/2, which is upside down
  // for an island — flipping it puts the wide end flush against the ground slab and tapers the
  // rock to a point below.
  // Matches the slab's bottom radius so the two meet flush instead of leaving a lip.
  const underside = new Mesh(
    new ConeGeometry(topRadius * SLAB_TAPER, undersideHeight, radialSegments),
    rockMaterial,
  );
  underside.rotation.x = Math.PI;
  underside.position.y = -topHeight - undersideHeight / 2;
  group.add(underside);

  return group;
}
