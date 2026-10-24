import { Camera, Object3D, Raycaster, Sphere, Vector2, Vector3 } from 'three';
import { InteractiveObject } from './types';

/** A whole object approximated by a bounding sphere, for coarse picking. */
export interface SphereCandidate<T> {
  value: T;
  center: Vector3;
  radius: number;
}

const sphereScratch = new Sphere();
const hitPointScratch = new Vector3();

/** Raycasts pointer events against the registered interactive objects of the active islands. */
export class CubeInteraction {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();

  constructor(private readonly camera: Camera) {}

  /**
   * Picks the nearest candidate whose bounding sphere the pointer ray passes through.
   *
   * Used to hit a whole island without walking its geometry: an island is a few hundred meshes, and
   * for "did I click that island over there" a sphere is both accurate enough and far cheaper.
   */
  pickSphere<T>(ndcX: number, ndcY: number, candidates: readonly SphereCandidate<T>[]): T | null {
    this.pointer.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    let nearest: T | null = null;
    let nearestDistance = Infinity;

    for (const candidate of candidates) {
      sphereScratch.set(candidate.center, candidate.radius);
      if (!this.raycaster.ray.intersectSphere(sphereScratch, hitPointScratch)) {
        continue;
      }
      const distance = this.raycaster.ray.origin.distanceTo(hitPointScratch);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate.value;
      }
    }

    return nearest;
  }

  pick(ndcX: number, ndcY: number, candidates: InteractiveObject[]): InteractiveObject | null {
    this.pointer.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const objects = candidates.map((candidate) => candidate.object);
    const hits = this.raycaster.intersectObjects(objects, true);
    if (hits.length === 0) {
      return null;
    }

    const hitRoot = findRegisteredAncestor(hits[0].object, objects);
    if (!hitRoot) {
      return null;
    }

    return candidates.find((candidate) => candidate.object === hitRoot) ?? null;
  }
}

function findRegisteredAncestor(object: Object3D, roots: Object3D[]): Object3D | null {
  let current: Object3D | null = object;
  while (current) {
    if (roots.includes(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}
