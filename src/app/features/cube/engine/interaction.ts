import { Camera, Object3D, Raycaster, Vector2 } from 'three';
import { InteractiveObject } from './types';

/** Raycasts pointer events against the registered interactive objects of the active cube faces. */
export class CubeInteraction {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();

  constructor(private readonly camera: Camera) {}

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
