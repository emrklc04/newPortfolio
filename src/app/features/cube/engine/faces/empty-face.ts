import { Group } from 'three';
import { FaceBuildResult } from '../types';

/** Reserved for future content — just the bare slab, no props. */
export function buildEmptyFace(): FaceBuildResult {
  return { group: new Group(), interactiveObjects: [] };
}
