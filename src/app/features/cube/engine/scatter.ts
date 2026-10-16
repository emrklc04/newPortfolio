export interface ScatterPoint {
  x: number;
  z: number;
}

/** Deterministic pseudo-random generator (mulberry32) — same seed always gives the same layout,
 * so faces look organic rather than grid-aligned without reshuffling on every rebuild. */
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

/**
 * Scatters `count` points within an annulus [minRadius, maxRadius] around the origin, picking
 * (via a best-of-N-attempts search) whichever candidate is furthest from already-placed points
 * so items don't overlap — a cheap approximation of Poisson-disk sampling. Pass minRadius 0 for
 * a filled disk, or a positive minRadius to keep a ring clear around the center (e.g. for decor
 * framing a focal point that sits at the origin).
 */
export function scatterPoints(
  seed: number,
  count: number,
  minRadius: number,
  maxRadius: number,
  minDistance: number,
): ScatterPoint[] {
  const rand = mulberry32(seed);
  const points: ScatterPoint[] = [];

  for (let i = 0; i < count; i++) {
    let best: ScatterPoint = { x: 0, z: 0 };
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = rand() * Math.PI * 2;
      const r = minRadius + Math.sqrt(rand()) * (maxRadius - minRadius);
      const candidate = { x: Math.cos(angle) * r, z: Math.sin(angle) * r };

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

    points.push(best);
  }

  return points;
}
