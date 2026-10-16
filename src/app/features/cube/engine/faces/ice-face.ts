import { Group, Object3D } from 'three';
import { ModelKey } from '../model-urls';
import { cloneModel, normalizeModel, normalizeModelToSize } from '../model-utils';
import { scatterPoints } from '../scatter';
import { FaceBuildResult, InteractiveObject } from '../types';

// Decor items are naturally wider/flatter than tall (a satellite dish, a crater) — sized by their
// largest dimension (normalizeModelToSize) rather than height, or they'd blow up oversized.
const DECOR_TEMPLATES: ReadonlyArray<{ key: ModelKey; size: number }> = [
  { key: 'spaceRockA', size: 0.55 },
  { key: 'spaceRockB', size: 0.5 },
  { key: 'spaceRockLargeA', size: 0.6 },
  { key: 'spaceRockLargeB', size: 0.6 },
  { key: 'spaceRock', size: 0.4 },
  { key: 'satelliteDish', size: 0.6 },
  { key: 'spaceBarrel', size: 0.35 },
  { key: 'spaceBarrels', size: 0.5 },
  { key: 'spaceMeteor', size: 0.45 },
  { key: 'spaceCrater', size: 0.6 },
  { key: 'spacePlatform', size: 0.65 },
];

/** A Kenney astronaut (Space Kit) standing amid scattered rocks/satellite dishes/debris; click
 * opens "about me". */
export function buildIceFace(templates: Record<ModelKey, Group>): FaceBuildResult {
  const group = new Group();
  const interactiveObjects: InteractiveObject[] = [];

  const figure = cloneModel(templates.astronaut);
  normalizeModel(figure, 0.9);
  figure.userData['interactive'] = true;
  group.add(figure);

  const labelAnchor = new Object3D();
  labelAnchor.position.set(0, 1.4, 0);
  group.add(labelAnchor);

  interactiveObjects.push({
    object: figure,
    kind: 'about',
    payload: null,
    label: 'Über mich',
    labelAnchor,
  });

  const decorPoints = scatterPoints(131, 28, 0.65, 2.85, 0.38);
  decorPoints.forEach((point, index) => {
    const { key, size } = DECOR_TEMPLATES[index % DECOR_TEMPLATES.length];
    const decor = cloneModel(templates[key]);
    normalizeModelToSize(decor, size);
    decor.position.x += point.x;
    decor.position.z += point.z;
    decor.rotation.y = ((index * 73) % 360) * (Math.PI / 180);
    group.add(decor);
  });

  return { group, interactiveObjects };
}
