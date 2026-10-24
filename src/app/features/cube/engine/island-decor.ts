import { Group, Object3D } from 'three';
import { kitPart } from './kit-loader';
import { Kit } from './kits';
import { cloneModel, normalizeModelToSize } from './model-utils';
import { InteractiveObject } from './types';

/** What every island builder hands back to the scene. */
export interface IslandBuildResult {
  /** Always-visible content: the island's buildings plus its larger scenery. */
  group: Group;
  /** Small ground cover, split out so it can be hidden when the camera is far away. Must be a
   * descendant of `group`, which is what the scene actually adds. */
  detailGroup: Group;
  interactiveObjects: InteractiveObject[];
}

/**
 * Clones a kit part, scales it, and drops it on the ground at (x, z) with a deterministic yaw.
 *
 * Defaults to `normalizeModelToSize` (scale by the largest dimension), which is what decorative
 * props want — ferns, pebbles and planters are naturally wider than they are tall, and scaling
 * those to a target *height* blows their footprint up. Trees pass `normalizeModel` to be sized by
 * height instead.
 */
export function place(
  group: Group,
  kit: Kit,
  part: string,
  x: number,
  z: number,
  yawSeed: number,
  size: () => number,
  normalize: (object: Object3D, target: number) => void = normalizeModelToSize,
): void {
  const model = cloneModel(kitPart(kit, part));
  normalize(model, size());
  model.position.x += x;
  model.position.z += z;
  model.rotation.y = (yawSeed % 360) * (Math.PI / 180);
  group.add(model);
}
