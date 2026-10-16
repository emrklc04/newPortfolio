import type { Group, Object3D } from 'three';

export type FaceKey = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

export type ThemeKey = 'suburb' | 'city' | 'ice' | 'pyramids' | 'forest' | 'empty';

export type InteractionKind = 'project' | 'experience' | 'skill' | 'about' | 'contact';

export interface InteractiveObject {
  object: Object3D;
  kind: InteractionKind;
  payload: unknown;
  label: string;
  /** Local-space anchor (relative to the face's content group) used for the floating HTML chip. */
  labelAnchor: Object3D;
}

export interface FaceBuildResult {
  /** Content built in local Y-up space, sitting on the slab's top face (y = slabHeight / 2). */
  group: Group;
  interactiveObjects: InteractiveObject[];
}
