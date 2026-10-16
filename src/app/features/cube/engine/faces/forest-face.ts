import { Group, Object3D } from 'three';
import { ModelKey } from '../model-urls';
import { cloneModel, normalizeModel, normalizeModelToSize } from '../model-utils';
import { scatterPoints } from '../scatter';
import { FaceBuildResult, InteractiveObject } from '../types';

// Decor items are naturally wider/flatter than tall (a grass patch, a stone cluster) — sized by
// their largest dimension (normalizeModelToSize) rather than height, or they'd blow up oversized.
const DECOR_TEMPLATES: ReadonlyArray<{ key: ModelKey; size: number }> = [
  { key: 'forestRock', size: 0.45 },
  { key: 'forestRockHigh', size: 0.55 },
  { key: 'forestRockRamp', size: 0.5 },
  { key: 'forestStones', size: 0.4 },
  { key: 'forestPlant', size: 0.35 },
  { key: 'forestGrassPatch', size: 0.5 },
  { key: 'forestFence', size: 0.55 },
];

/** Kenney mini-forest trees scattered around a large central tree; clicking that tree opens the
 * "let's work together" panel. Rocks/plants/stones fill out the forest floor. */
export function buildForestFace(templates: Record<ModelKey, Group>): FaceBuildResult {
  const group = new Group();
  const interactiveObjects: InteractiveObject[] = [];

  const treePoints = scatterPoints(141, 18, 0.7, 2.85, 0.4);
  treePoints.forEach(({ x, z }, index) => {
    const height = 0.45 + ((index * 53) % 7) * 0.06;
    const tree = cloneModel(templates.tree);
    normalizeModel(tree, height);
    tree.position.x += x;
    tree.position.z += z;
    group.add(tree);
  });

  const decorPoints = scatterPoints(241, 16, 0.6, 2.85, 0.4);
  decorPoints.forEach((point, index) => {
    const { key, size } = DECOR_TEMPLATES[index % DECOR_TEMPLATES.length];
    const decor = cloneModel(templates[key]);
    normalizeModelToSize(decor, size);
    decor.position.x += point.x;
    decor.position.z += point.z;
    decor.rotation.y = ((index * 83) % 360) * (Math.PI / 180);
    group.add(decor);
  });

  const bigTree = cloneModel(templates.treeHigh);
  normalizeModel(bigTree, 2.0);
  bigTree.userData['interactive'] = true;
  group.add(bigTree);

  const labelAnchor = new Object3D();
  labelAnchor.position.set(0, 2.3, 0);
  group.add(labelAnchor);

  interactiveObjects.push({
    object: bigTree,
    kind: 'contact',
    payload: null,
    label: 'Lust auf eine Zusammenarbeit?',
    labelAnchor,
  });

  return { group, interactiveObjects };
}
