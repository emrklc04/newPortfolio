import { Group, MathUtils, Object3D } from 'three';
import { Skill } from '../../../../core/models/skill.model';
import { ModelKey } from '../model-urls';
import { cloneModel, normalizeModel, normalizeModelToSize } from '../model-utils';
import { scatterPoints } from '../scatter';
import { FaceBuildResult, InteractiveObject } from '../types';

// Five distinct Kenney industrial structures (City Kit: Industrial) — one per skill, standing
// in for the original literal pyramids while keeping the "taller = more experience" idea.
const STRUCTURE_TEMPLATES: ModelKey[] = [
  'waterTower',
  'chimneyLarge',
  'chimneyBasic',
  'chimneyMedium',
  'chimneySmall',
];

// Decor items are naturally wider/longer than tall (shipping containers, solar panels) — sized by
// their largest dimension (normalizeModelToSize) rather than height, or they'd blow up oversized.
const DECOR_TEMPLATES: ReadonlyArray<{ key: ModelKey; size: number }> = [
  { key: 'shippingContainerA', size: 0.85 },
  { key: 'shippingContainerB', size: 0.85 },
  { key: 'shippingContainerC', size: 0.85 },
  { key: 'solarPanel', size: 0.55 },
  { key: 'solarPanelFlat', size: 0.5 },
  { key: 'solarPanelPortrait', size: 0.55 },
  { key: 'detailTank', size: 0.6 },
];

/** One Kenney industrial structure per skill, scattered rather than lined up in a row; shipping
 * containers/solar panels/a small tank fill out the yard so it doesn't read as empty. */
export function buildPyramidsFace(
  skills: Skill[],
  templates: Record<ModelKey, Group>,
): FaceBuildResult {
  const group = new Group();
  const interactiveObjects: InteractiveObject[] = [];

  // Kept fairly close to center — tall props positioned far off-axis under this camera's
  // elevated angle visibly "lean" (correct perspective, but reads as a bug at a glance).
  const structurePoints = scatterPoints(121, skills.length, 0, 1.5, 1.0);

  skills.forEach((skill, index) => {
    const height = MathUtils.clamp(1.0 + skill.description.length * 0.2, 1.0, 2.2);
    const { x, z } = structurePoints[index];

    const templateKey = STRUCTURE_TEMPLATES[index % STRUCTURE_TEMPLATES.length];
    const structure = cloneModel(templates[templateKey]);
    normalizeModel(structure, height);
    structure.position.x += x;
    structure.position.z += z;
    structure.userData['interactive'] = true;
    group.add(structure);

    const labelAnchor = new Object3D();
    labelAnchor.position.set(x, height + 0.3, z);
    group.add(labelAnchor);

    interactiveObjects.push({
      object: structure,
      kind: 'skill',
      payload: skill,
      label: skill.name,
      labelAnchor,
    });
  });

  const decorPoints = scatterPoints(222, 24, 1.15, 2.85, 0.4);
  decorPoints.forEach((point, index) => {
    const { key, size } = DECOR_TEMPLATES[index % DECOR_TEMPLATES.length];
    const decor = cloneModel(templates[key]);
    normalizeModelToSize(decor, size);
    decor.position.x += point.x;
    decor.position.z += point.z;
    decor.rotation.y = ((index * 61) % 360) * (Math.PI / 180);
    group.add(decor);
  });

  return { group, interactiveObjects };
}
