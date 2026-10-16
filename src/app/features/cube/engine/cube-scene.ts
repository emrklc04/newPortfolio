import {
  AmbientLight,
  DirectionalLight,
  Group,
  Material,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { Project } from '../../../core/models/project.model';
import { Skill } from '../../../core/models/skill.model';
import { TimelineEntry } from '../../../core/models/timeline-entry.model';
import {
  activeThemeIndex,
  CUBE_KEYFRAMES,
  FACE_NORMAL_LOOKUP,
  FACE_THEME,
  THEME_ORDER,
  rotationForProgress,
  themeRevealWeight,
} from './cube-rotation';
import { CubeInteraction } from './interaction';
import { projectToScreen } from './label-projector';
import { ModelKey } from './model-urls';
import { PALETTE, SPACE_BACKGROUND } from './palette';
import { createSlab, SLAB_SIZE } from './primitives';
import { createStarfield } from './starfield';
import { buildCityFace } from './faces/city-face';
import { buildEmptyFace } from './faces/empty-face';
import { buildForestFace } from './faces/forest-face';
import { buildIceFace } from './faces/ice-face';
import { buildPyramidsFace } from './faces/pyramids-face';
import { buildSuburbFace } from './faces/suburb-face';
import { FaceKey, InteractionKind, InteractiveObject, ThemeKey } from './types';

export interface CubeSceneData {
  projects: Project[];
  workExperience: TimelineEntry[];
  skills: Skill[];
  templates: Record<ModelKey, Group>;
}

export interface LabelPoint {
  id: string;
  x: number;
  y: number;
  text: string;
  opacity: number;
  kind: InteractionKind;
  payload: unknown;
}

const worldPositionScratch = new Vector3();

/**
 * Where a face's wrapper content ends up on screen depends on TWO rotations stacked together:
 * the wrapper's own orientation (local Y -> that face's normal) AND the cube's rotation at the
 * moment that face is settled at the front (which brings the normal to point at the camera).
 * `Quaternion.setFromUnitVectors` only controls the first one and leaves the roll around the
 * normal unspecified, so depending on which of the 5 rolls brought a given face to the front,
 * its local X (the axis every face builder lays props out along, expecting a horizontal row)
 * can end up pointing anywhere — world X for one face, world Z or Y for another — producing a
 * diagonal cascade instead of a row for faces where it doesn't happen to line up.
 *
 * The fix: solve for the wrapper orientation that makes the COMBINED rotation (keyframe * wrapper)
 * land on one fixed, consistent target basis for every face — local X -> world X (screen
 * horizontal), local Y -> world Z (toward the camera), local Z -> world -Y — by inverting the
 * known keyframe rotation: wrapper = keyframe^-1 * target.
 */
const TARGET_SETTLED_BASIS = new Quaternion().setFromRotationMatrix(
  new Matrix4().makeBasis(new Vector3(1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, -1, 0)),
);

const KEYFRAME_QUATERNION_BY_FACE: Record<FaceKey, Quaternion> = CUBE_KEYFRAMES.reduce(
  (map, keyframe) => {
    map[keyframe.frontFace] = keyframe.quaternion;
    return map;
  },
  {} as Record<FaceKey, Quaternion>,
);

function faceWrapperOrientation(faceKey: FaceKey): Quaternion {
  const keyframeQuaternion = KEYFRAME_QUATERNION_BY_FACE[faceKey];
  return keyframeQuaternion.clone().invert().multiply(TARGET_SETTLED_BASIS);
}

export class CubeScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(26, 1, 0.1, 200);

  private readonly renderer: WebGLRenderer;
  private readonly floatGroup = new Group();
  private readonly cubeGroup = new Group();
  private readonly interaction: CubeInteraction;
  private readonly interactiveByTheme = new Map<ThemeKey, InteractiveObject[]>();
  private readonly contentByTheme = new Map<ThemeKey, Group>();

  constructor(canvas: HTMLCanvasElement, data: CubeSceneData) {
    // Steep, high-angle isometric viewpoint (~45° elevation) — the classic "looking down at a
    // die" look, matching the reference. A narrow FOV + long distance (telephoto-like) keeps
    // perspective distortion low across the whole face even from this much steeper angle.
    this.camera.position.set(3.25, 20.7, 22.6);
    this.camera.lookAt(0, -0.3, 2);
    this.interaction = new CubeInteraction(this.camera);

    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(SPACE_BACKGROUND, 1);

    this.scene.add(createStarfield());
    this.scene.add(new AmbientLight(0xffffff, 0.7));

    const keyLight = new DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(4, 6, 5);
    this.scene.add(keyLight);

    const fillLight = new DirectionalLight(0x9fc7ff, 0.35);
    fillLight.position.set(-5, -2, -4);
    this.scene.add(fillLight);

    this.floatGroup.add(this.cubeGroup);
    this.scene.add(this.floatGroup);

    this.buildFaces(data);
  }

  private buildFaces(data: CubeSceneData): void {
    const { templates } = data;
    const builders: Record<ThemeKey, () => { group: Group; interactiveObjects: InteractiveObject[] }> = {
      suburb: () => buildSuburbFace(data.projects, templates),
      city: () => buildCityFace(data.workExperience, templates),
      ice: () => buildIceFace(templates),
      pyramids: () => buildPyramidsFace(data.skills, templates),
      forest: () => buildForestFace(templates),
      empty: () => buildEmptyFace(),
    };

    (Object.keys(FACE_NORMAL_LOOKUP) as FaceKey[]).forEach((faceKey) => {
      const theme = FACE_THEME[faceKey];
      const normal = FACE_NORMAL_LOOKUP[faceKey];

      const wrapper = new Group();
      wrapper.position.copy(normal).multiplyScalar(SLAB_SIZE / 2);
      wrapper.quaternion.copy(faceWrapperOrientation(faceKey));

      const slab = createSlab(PALETTE[theme].slab);
      wrapper.add(slab);

      const { group: content, interactiveObjects } = builders[theme]();
      wrapper.add(content);

      this.cubeGroup.add(wrapper);
      this.contentByTheme.set(theme, content);
      this.interactiveByTheme.set(theme, interactiveObjects);
    });
  }

  /** Advances the cube's rotation/idle motion for the given scroll progress. Props never change
   * size — only ever exactly one face's props are visible at a time (whichever is currently
   * closest to front-and-center), so there's no partial-reveal blending between faces either. */
  update(progress: number, elapsedSeconds: number): void {
    rotationForProgress(progress, this.cubeGroup.quaternion);

    this.floatGroup.position.y = Math.sin(elapsedSeconds * 0.6) * 0.12;
    this.floatGroup.rotation.y = Math.sin(elapsedSeconds * 0.3) * 0.015;

    const activeIndex = activeThemeIndex(progress);
    THEME_ORDER.forEach((theme, index) => {
      const content = this.contentByTheme.get(theme);
      if (content) {
        content.visible = index === activeIndex;
      }
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  /** Only the currently front-and-settled face is clickable. */
  pickAtNdc(ndcX: number, ndcY: number, progress: number): InteractiveObject | null {
    const activeIndex = activeThemeIndex(progress);
    if (themeRevealWeight(progress, activeIndex) < 0.85) {
      return null;
    }
    const theme = THEME_ORDER[activeIndex];
    const candidates = this.interactiveByTheme.get(theme) ?? [];
    return this.interaction.pick(ndcX, ndcY, candidates);
  }

  /** Screen-space label chips for the single currently-visible face's props. */
  getLabels(width: number, height: number, progress: number): LabelPoint[] {
    const labels: LabelPoint[] = [];
    const theme = THEME_ORDER[activeThemeIndex(progress)];
    const objects = this.interactiveByTheme.get(theme) ?? [];

    objects.forEach((entry, objectIndex) => {
      entry.labelAnchor.getWorldPosition(worldPositionScratch);
      const screen = projectToScreen(worldPositionScratch, this.camera, width, height);
      if (!screen.visible) {
        return;
      }
      labels.push({
        id: `${theme}-${objectIndex}`,
        x: screen.x,
        y: screen.y,
        text: entry.label,
        opacity: 1,
        kind: entry.kind,
        payload: entry.payload,
      });
    });

    return labels;
  }

  dispose(): void {
    this.scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const material = object.material as Material | Material[];
        (Array.isArray(material) ? material : [material]).forEach((mat) => mat.dispose());
      }
    });
    this.renderer.dispose();
  }
}
