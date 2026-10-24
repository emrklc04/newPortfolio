export interface ScatterPoint {
  x: number;
  z: number;
}

/** A keep-out circle on the island's ground plane. */
export interface ScatterCircle extends ScatterPoint {
  radius: number;
}

export interface ScatterOptions {
  seed: number;
  count: number;
  /** Pass 0 for a filled disk, or a positive value to keep a ring clear around the center. */
  minRadius: number;
  maxRadius: number;
  /** Target spacing between placed points. */
  minDistance: number;
  /** Candidates landing inside any of these circles are rejected — used to keep greenery from
   * growing through the houses. */
  exclusions?: readonly ScatterCircle[];
}

/** Deterministic pseudo-random generator (mulberry32) — same seed always gives the same layout,
 * so the island looks organic rather than grid-aligned without reshuffling on every rebuild. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isExcluded(point: ScatterPoint, exclusions: readonly ScatterCircle[]): boolean {
  return exclusions.some(
    (circle) => Math.hypot(circle.x - point.x, circle.z - point.z) < circle.radius,
  );
}

/**
 * Scatters points within an annulus [minRadius, maxRadius] around the origin, picking (via a
 * best-of-N-attempts search) whichever candidate is furthest from already-placed points so items
 * don't overlap — a cheap approximation of Poisson-disk sampling.
 *
 * Returns *at most* `count` points: a point is dropped when every attempt for it landed inside an
 * exclusion zone, so callers scattering around obstacles should treat the count as an upper bound.
 */
export function scatterPoints(options: ScatterOptions): ScatterPoint[] {
  const { seed, count, minRadius, maxRadius, minDistance, exclusions = [] } = options;
  const rand = mulberry32(seed);
  const points: ScatterPoint[] = [];

  for (let i = 0; i < count; i++) {
    let best: ScatterPoint | null = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = rand() * Math.PI * 2;
      const r = minRadius + Math.sqrt(rand()) * (maxRadius - minRadius);
      const candidate = { x: Math.cos(angle) * r, z: Math.sin(angle) * r };

      if (isExcluded(candidate, exclusions)) {
        continue;
      }

      const closest = points.reduce(
        (min, p) => Math.min(min, Math.hypot(p.x - candidate.x, p.z - candidate.z)),
        Infinity,
      );
      const score = points.length === 0 ? 0 : closest;

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
      if (score >= minDistance) {
        break;
      }
    }

    if (best) {
      points.push(best);
    }
  }

  return points;
}
