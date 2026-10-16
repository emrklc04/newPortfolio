import { MathUtils, Quaternion, Vector3 } from 'three';
import { FaceKey, ThemeKey } from './types';

/**
 * The cube is "rolled" like a die: 5 successive 90° rotations around alternating world axes
 * (pitch, yaw, pitch, yaw, pitch). This specific alternating pattern is combinatorially guaranteed
 * to bring a different original face to the front at each of the 6 keyframes (identity + 5 rolls),
 * which is exactly what lets one continuous scroll direction cycle through all 6 unique sides.
 */
const ROLL_AXES: ReadonlyArray<'x' | 'y'> = ['x', 'y', 'x', 'y', 'x'];

/** Order in which themed faces appear as the cube rolls through its 6 keyframes. */
export const THEME_ORDER: readonly ThemeKey[] = [
  'suburb',
  'city',
  'ice',
  'pyramids',
  'forest',
  'empty',
];

const FACE_NORMALS: Record<FaceKey, Vector3> = {
  px: new Vector3(1, 0, 0),
  nx: new Vector3(-1, 0, 0),
  py: new Vector3(0, 1, 0),
  ny: new Vector3(0, -1, 0),
  pz: new Vector3(0, 0, 1),
  nz: new Vector3(0, 0, -1),
};

const CAMERA_FACING = new Vector3(0, 0, 1);

function resolveFrontFace(q: Quaternion): FaceKey {
  let best: FaceKey = 'pz';
  let bestDot = -Infinity;
  for (const key of Object.keys(FACE_NORMALS) as FaceKey[]) {
    const dot = FACE_NORMALS[key].clone().applyQuaternion(q).dot(CAMERA_FACING);
    if (dot > bestDot) {
      bestDot = dot;
      best = key;
    }
  }
  return best;
}

interface Keyframe {
  quaternion: Quaternion;
  frontFace: FaceKey;
}

function buildKeyframes(): Keyframe[] {
  const keyframes: Keyframe[] = [];
  let cumulative = new Quaternion();

  for (let i = 0; i <= ROLL_AXES.length; i++) {
    keyframes.push({ quaternion: cumulative.clone(), frontFace: resolveFrontFace(cumulative) });
    const axis = ROLL_AXES[i];
    if (axis) {
      const rollAxis = axis === 'x' ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
      const step = new Quaternion().setFromAxisAngle(rollAxis, -Math.PI / 2);
      cumulative = cumulative.clone().premultiply(step);
    }
  }

  return keyframes;
}

export const CUBE_KEYFRAMES = buildKeyframes();
export const FACE_SEGMENT_COUNT = CUBE_KEYFRAMES.length - 1;

/** Which local, unrotated cube face (px/nx/py/ny/pz/nz) carries which theme's content. */
export const FACE_THEME: Record<FaceKey, ThemeKey> = CUBE_KEYFRAMES.reduce(
  (map, keyframe, index) => {
    map[keyframe.frontFace] = THEME_ORDER[index];
    return map;
  },
  {} as Record<FaceKey, ThemeKey>,
);

export const FACE_NORMAL_LOOKUP: Readonly<Record<FaceKey, Vector3>> = FACE_NORMALS;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Interpolated cube orientation for a given overall scroll progress in [0, 1]. */
export function rotationForProgress(progress: number, target = new Quaternion()): Quaternion {
  const clamped = MathUtils.clamp(progress, 0, 1);
  const scaled = clamped * FACE_SEGMENT_COUNT;
  const index = Math.min(Math.floor(scaled), FACE_SEGMENT_COUNT - 1);
  const t = easeInOutCubic(scaled - index);
  return target.slerpQuaternions(
    CUBE_KEYFRAMES[index].quaternion,
    CUBE_KEYFRAMES[index + 1].quaternion,
    t,
  );
}

/** 0..1 "how close is this theme's face to being exactly front-and-center right now" — only used
 * to gate clicking to a settled (not mid-roll) face; visibility itself is a hard switch, see
 * `activeThemeIndex`. */
export function themeRevealWeight(progress: number, themeIndex: number): number {
  const clamped = MathUtils.clamp(progress, 0, 1);
  const scaled = clamped * FACE_SEGMENT_COUNT;
  return MathUtils.clamp(1 - Math.abs(scaled - themeIndex), 0, 1);
}

/** Index (into THEME_ORDER) of whichever face is currently closest to front-and-center — the
 * only one shown/interactive at any given scroll position, so a scrolling cube never shows more
 * than one face's props at once. */
export function activeThemeIndex(progress: number): number {
  const clamped = MathUtils.clamp(progress, 0, 1);
  return Math.round(clamped * FACE_SEGMENT_COUNT);
}

/** Scroll progress ([0, 1]) at which the given theme is exactly front-and-center. */
export function progressForTheme(themeIndex: number): number {
  return themeIndex / FACE_SEGMENT_COUNT;
}
