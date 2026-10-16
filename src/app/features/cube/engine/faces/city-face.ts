import { Group, MathUtils, Object3D } from 'three';
import { TimelineEntry } from '../../../../core/models/timeline-entry.model';
import { ModelKey } from '../model-urls';
import { cloneModel, normalizeModel, normalizeModelToSize } from '../model-utils';
import { scatterPoints } from '../scatter';
import { FaceBuildResult, InteractiveObject } from '../types';

// Five distinct Kenney skyscraper models (City Kit: Commercial) — matches the five
// work-experience entries 1:1, so each job gets its own recognizable building.
const SKYSCRAPER_TEMPLATES: ModelKey[] = [
  'skyscraperA',
  'skyscraperB',
  'skyscraperC',
  'skyscraperD',
  'skyscraperE',
];

const BACKGROUND_TEMPLATES: ModelKey[] = [
  'lowDetailBuildingA',
  'lowDetailBuildingB',
  'lowDetailBuildingC',
  'lowDetailBuildingD',
  'lowDetailBuildingE',
  'lowDetailBuildingF',
  'lowDetailBuildingG',
];

/** One Kenney skyscraper per work-experience entry, scattered rather than lined up in a row;
 * smaller background buildings fill out the rest of the block as a skyline. */
export function buildCityFace(
  workExperience: TimelineEntry[],
  templates: Record<ModelKey, Group>,
): FaceBuildResult {
  const group = new Group();
  const interactiveObjects: InteractiveObject[] = [];

  // Kept fairly close to center — tall props positioned far off-axis under this camera's
  // elevated angle visibly "lean" (correct perspective, but reads as a bug at a glance).
  const towerPoints = scatterPoints(111, workExperience.length, 0, 1.55, 1.05);

  workExperience.forEach((entry, index) => {
    const charCount = entry.description.join(' ').length;
    const height = MathUtils.clamp(1.1 + charCount / 170, 1.1, 2.3);
    const { x, z } = towerPoints[index];

    const templateKey = SKYSCRAPER_TEMPLATES[index % SKYSCRAPER_TEMPLATES.length];
    const tower = cloneModel(templates[templateKey]);
    normalizeModel(tower, height);
    tower.position.x += x;
    tower.position.z += z;
    tower.userData['interactive'] = true;
    group.add(tower);

    const labelAnchor = new Object3D();
    labelAnchor.position.set(x, height + 0.3, z);
    group.add(labelAnchor);

    interactiveObjects.push({
      object: tower,
      kind: 'experience',
      payload: entry,
      label: entry.organization,
      labelAnchor,
    });
  });

  const backgroundPoints = scatterPoints(212, 24, 1.2, 2.85, 0.4);
  backgroundPoints.forEach((point, index) => {
    const key = BACKGROUND_TEMPLATES[index % BACKGROUND_TEMPLATES.length];
    const height = 0.6 + ((index * 37) % 5) * 0.08;
    const building = cloneModel(templates[key]);
    normalizeModelToSize(building, height);
    building.position.x += point.x;
    building.position.z += point.z;
    group.add(building);
  });

  return { group, interactiveObjects };
}
