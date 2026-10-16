import { Camera, Vector3 } from 'three';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

const projected = new Vector3();

/** Projects a world-space position to CSS pixel coordinates within a `width`x`height` viewport. */
export function projectToScreen(
  worldPosition: Vector3,
  camera: Camera,
  width: number,
  height: number,
): ScreenPoint {
  projected.copy(worldPosition).project(camera);

  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
    visible: projected.z < 1,
  };
}
