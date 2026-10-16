import { Box3, ColorRepresentation, Material, Mesh, Object3D, Vector3 } from 'three';

/** Deep-clones a loaded GLTF template, giving every mesh its own material instance so one
 * clone can be tinted without affecting the others (or the cached template). */
export function cloneModel(template: Object3D): Object3D {
  const clone = template.clone(true);
  clone.traverse((object) => {
    if (object instanceof Mesh) {
      object.material = Array.isArray(object.material)
        ? object.material.map((material: Material) => material.clone())
        : object.material.clone();
    }
  });
  return clone;
}

/** Multiplies every mesh material's base color — Kenney GLBs default to white, so this is a
 * straightforward tint rather than a color replacement. */
export function tintModel(object: Object3D, color: ColorRepresentation): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if ('color' in material) {
          (material as Material & { color: { set(value: ColorRepresentation): void } }).color.set(
            color,
          );
        }
      }
    }
  });
}

/**
 * Kenney kits don't share one consistent unit scale or pivot across packs. Rather than guess,
 * this measures the model's actual bounding box and scales/repositions it so it's exactly
 * `targetHeight` tall, sitting on the ground (local y = 0) and horizontally centered — a
 * predictable contract every face builder can rely on regardless of the source asset.
 */
export function normalizeModel(object: Object3D, targetHeight: number): void {
  normalizeModelByDimension(object, targetHeight, (size) => size.y);
}

/**
 * Same contract as `normalizeModel`, but scales by the model's LARGEST dimension instead of
 * specifically its height. Decorative props (fences, carts, shipping containers, solar panels...)
 * are often naturally wider/longer than they are tall — scaling those to a target *height* blows
 * their width up disproportionately (a fence meant to be low and wide becomes a towering slab).
 * Scaling by the largest dimension keeps any prop, regardless of its native aspect ratio, within
 * a sensible, bounded footprint.
 */
export function normalizeModelToSize(object: Object3D, targetSize: number): void {
  normalizeModelByDimension(object, targetSize, (size) => Math.max(size.x, size.y, size.z));
}

function normalizeModelByDimension(
  object: Object3D,
  target: number,
  pickDimension: (size: Vector3) => number,
): void {
  object.updateMatrixWorld(true);
  const initialBox = new Box3().setFromObject(object);
  const initialSize = new Vector3();
  initialBox.getSize(initialSize);

  const scale = target / Math.max(pickDimension(initialSize), 0.0001);
  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);

  const scaledBox = new Box3().setFromObject(object);
  const center = new Vector3();
  scaledBox.getCenter(center);

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= scaledBox.min.y;
}
