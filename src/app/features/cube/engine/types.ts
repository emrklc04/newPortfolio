import type { Object3D } from 'three';

/** Which panel a clicked object opens. */
export type InteractionKind = 'project' | 'skill' | 'about' | 'contact';

export interface InteractiveObject {
  object: Object3D;
  kind: InteractionKind;
  payload: unknown;
  /** Local-space anchor (relative to the island's content group) used for the floating HTML chip. */
  labelAnchor: Object3D;
  label: string;
}
