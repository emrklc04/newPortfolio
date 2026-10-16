import { Group, Object3D } from 'three';
import { Project } from '../../../../core/models/project.model';
import { ModelKey } from '../model-urls';
import { cloneModel, normalizeModel, normalizeModelToSize, tintModel } from '../model-utils';
import { scatterPoints } from '../scatter';
import { FaceBuildResult, InteractiveObject } from '../types';

const BASE_TEMPLATES: ModelKey[] = ['stallRed', 'stallGreen'];

// Subtle per-instance tint on top of the red/green base models so six stalls read as distinct
// "houses" rather than two repeating colors.
const TINTS = [0xffffff, 0xe8c9a0, 0xffe0b8, 0xd8f0e0, 0xffffff, 0xf0d8ff];

// Decor items are naturally wider/longer than tall (fences, a cart) — sized by their largest
// dimension (normalizeModelToSize) rather than height, or they'd blow up into oversized slabs.
const DECOR_TEMPLATES: ReadonlyArray<{ key: ModelKey; size: number }> = [
  { key: 'townFence', size: 0.7 },
  { key: 'townFenceCurved', size: 0.75 },
  { key: 'townHedge', size: 0.5 },
  { key: 'townHedgeLarge', size: 0.65 },
  { key: 'townLantern', size: 0.5 },
  { key: 'townCart', size: 0.6 },
  { key: 'townPillar', size: 0.55 },
  { key: 'townBannerGreen', size: 0.55 },
  { key: 'townBannerRed', size: 0.55 },
  { key: 'townWheel', size: 0.35 },
];

/** One Kenney market stall (Fantasy Town Kit) per project, scattered loosely across the plot,
 * framed by fences/hedges/lanterns/a cart so the slab doesn't read as empty. */
export function buildSuburbFace(
  projects: Project[],
  templates: Record<ModelKey, Group>,
): FaceBuildResult {
  const group = new Group();
  const interactiveObjects: InteractiveObject[] = [];

  const housePoints = scatterPoints(101, projects.length, 0, 1.9, 1.15);

  projects.forEach((project, index) => {
    const height = project.featured ? 1.05 : 0.85;
    const { x, z } = housePoints[index];

    const template = templates[BASE_TEMPLATES[index % BASE_TEMPLATES.length]];
    const house = cloneModel(template);
    normalizeModel(house, height);
    tintModel(house, TINTS[index % TINTS.length]);
    house.position.x += x;
    house.position.z += z;
    house.userData['interactive'] = true;
    group.add(house);

    const labelAnchor = new Object3D();
    labelAnchor.position.set(x, height + 0.3, z);
    group.add(labelAnchor);

    interactiveObjects.push({
      object: house,
      kind: 'project',
      payload: project,
      label: project.title,
      labelAnchor,
    });
  });

  const decorPoints = scatterPoints(202, 26, 0.3, 2.8, 0.42);
  decorPoints.forEach((point, index) => {
    const { key, size } = DECOR_TEMPLATES[index % DECOR_TEMPLATES.length];
    const decor = cloneModel(templates[key]);
    normalizeModelToSize(decor, size);
    decor.position.x += point.x;
    decor.position.z += point.z;
    decor.rotation.y = ((index * 47) % 360) * (Math.PI / 180);
    group.add(decor);
  });

  return { group, interactiveObjects };
}
