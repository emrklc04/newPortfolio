import {
  AmbientLight,
  DirectionalLight,
  Group,
  MathUtils,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  PCFSoftShadowMap,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Project } from '../../../core/models/project.model';
import { Skill } from '../../../core/models/skill.model';
import { buildAboutIsland } from './about-island';
import { buildContactIsland } from './contact-island';
import { createIslandBridges } from './island-bridges';
import { SpaceBackground, createSpaceBackground } from './space-background';
import { CubeInteraction } from './interaction';
import { IslandBuildResult } from './island-decor';
import { createIslandBase } from './island-base';
import {
  ISLANDS,
  IslandDefinition,
  IslandId,
  findIsland,
  framingRadius,
  worldBounds,
} from './islands';
import { Kits } from './kits';
import { projectToScreen } from './label-projector';
import { SPACE_BACKGROUND } from './palette';
import { buildProjectsIsland } from './projects-island';
import { buildSkillsIsland } from './skills-island';
import { createStarfield } from './starfield';
import { InteractionKind, InteractiveObject } from './types';

export interface CubeSceneData {
  projects: Project[];
  skills: Skill[];
  kits: Kits;
}

export interface LabelPoint {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: InteractionKind | null;
  payload: unknown;
}

interface IslandRuntime {
  definition: IslandDefinition;
  /** Wrapper carrying the island's world position and its idle bob. */
  wrapper: Group;
  detailGroup: Group;
  interactiveObjects: InteractiveObject[];
  update?: IslandBuildResult['update'];
  floatPhase: number;
  /** True once the camera is close enough to count as "at" this island. Gates both the dense
   * ground cover and the per-building label chips. */
  detailVisible: boolean;
  /**
   * True on islands whose building carries the island's own name — About's castle and Contact's
   * lighthouse. Their title is hidden while the building chip is up, so the same word is never
   * printed twice; from further out the title is all that labels the island, so it stays.
   */
  titleDuplicatesBuilding: boolean;
}

interface CameraFlight {
  startTime: number;
  duration: number;
  startPosition: Vector3;
  startTarget: Vector3;
  endPosition: Vector3;
  endTarget: Vector3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const worldPositionScratch = new Vector3();

/**
 * Distance at which an island's dense ground cover is dropped, as a multiple of its framing
 * radius. Two thresholds give hysteresis, so sitting right on the boundary doesn't flicker it
 * every frame.
 *
 * Measured against the framing radius, not the footprint, so that flying to an island always lands
 * inside the "show" threshold — against the footprint alone, a tall island's fly-to distance sits
 * beyond it and the camera arrives at a bare plaza.
 */
const DETAIL_SHOW_FACTOR = 2.9;
const DETAIL_HIDE_FACTOR = 3.5;

/** Distance an island is framed from, as a multiple of its radius. Fits it into the vertical
 * field of view with a little margin. */
const FRAMING_FACTOR = 2.5;

/** Same, for the opening view that has to hold every island at once. */
const WORLD_FRAMING_FACTOR = 1.9;

/** Camera height as a fraction of its distance, i.e. tan of the starting elevation angle. */
const ELEVATION_FACTOR = 0.62;

/** An island's title chip clears its tallest building by this fraction of the island radius, and
 * is dropped once the camera is closer than this multiple of its framing radius. */
const TITLE_CLEARANCE_FACTOR = 0.55;
const TITLE_VISIBLE_FACTOR = 1.5;

/**
 * The opening viewpoint: an oblique view framing every island at once, high enough (~32° above the
 * horizon) to look over each island's rim planting onto the buildings rather than through it. The
 * islands sit in a loose quad rather than a row, so the view has to pull back far enough to clear
 * their spread in depth as well as across.
 *
 * Shared by the initial camera placement and the "back to the start" button, so the two can never
 * drift apart.
 */
function openingView(): { position: Vector3; target: Vector3 } {
  const world = worldBounds();
  const distance = world.radius * responsiveFramingFactor(WORLD_FRAMING_FACTOR, 0.94);
  return {
    position: new Vector3(
      world.center.x,
      world.center.y + distance * ELEVATION_FACTOR,
      world.center.z + distance,
    ),
    target: world.center.clone(),
  };
}

/** Increase camera distance on narrow screens so a framed sphere also fits horizontally. */
function responsiveFramingFactor(baseFactor: number, mobileMargin = 1.12): number {
  const aspect = Math.max(window.innerWidth / Math.max(window.innerHeight, 1), 0.1);
  const halfHorizontalFov = Math.atan(Math.tan(MathUtils.degToRad(45) / 2) * aspect);
  const horizontalFit = mobileMargin / Math.sin(halfHorizontalFov);
  return Math.max(baseFactor, horizontalFit);
}

/** On phones, an island needs more camera distance to fit horizontally. Show its sublabels at
 * that same framing distance so they are already visible when the click-to-island flight ends. */
function detailShowFactor(): number {
  return Math.max(DETAIL_SHOW_FACTOR, responsiveFramingFactor(FRAMING_FACTOR) + 0.2);
}

function detailHideFactor(): number {
  return Math.max(DETAIL_HIDE_FACTOR, detailShowFactor() + 0.6);
}

export class CubeScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(45, 1, 0.1, 600);
  readonly controls: OrbitControls;

  private readonly renderer: WebGLRenderer;
  private readonly interaction: CubeInteraction;
  private readonly bridges: ReturnType<typeof createIslandBridges>;
  private readonly spaceBackground: SpaceBackground;
  private readonly islands: IslandRuntime[] = [];
  private flight: CameraFlight | null = null;
  private panelOpen = false;

  constructor(canvas: HTMLCanvasElement, interactionRoot: HTMLElement, data: CubeSceneData) {
    const world = worldBounds();
    const opening = openingView();

    this.camera.position.copy(opening.position);
    this.camera.lookAt(opening.target);
    this.interaction = new CubeInteraction(this.camera);

    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(SPACE_BACKGROUND, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    // Google-Earth-style free camera: left-drag orbits, right-drag/two-finger pans, wheel/pinch
    // zooms. Clamped so the camera can never dip below the world or flip fully overhead.
    //
    // Bound to `interactionRoot` (the shared parent of the canvas AND the floating HTML label
    // layer) rather than the bare canvas: a drag/wheel that starts or lands on a label chip would
    // otherwise never reach the canvas's own listeners and fall through to native page scroll
    // instead of moving the camera.
    this.controls = new OrbitControls(this.camera, interactionRoot);
    this.controls.target.copy(world.center);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    // With more than one island, dollying toward a fixed world centre would zoom into the empty
    // space between them. Zooming toward the cursor instead means pointing at an island and
    // scrolling both approaches it and drags the orbit target along — so once you have zoomed in
    // on an island, orbiting turns that island on its own axis.
    this.controls.zoomToCursor = true;
    const smallestRadius = Math.min(...ISLANDS.map((island) => island.radius));
    this.controls.minDistance = smallestRadius * 0.35;
    this.controls.maxDistance = world.radius * 8;
    this.controls.minPolarAngle = MathUtils.degToRad(25);
    this.controls.maxPolarAngle = MathUtils.degToRad(85);
    this.controls.update();

    this.scene.add(createStarfield(1800, world.radius * 3));
    this.spaceBackground = createSpaceBackground(world.center, world.radius, this.camera.position);
    this.scene.add(this.spaceBackground.group);

    // The kit models are textured PBR surfaces rather than flat-shaded blocks, so they need
    // considerably more light to read against the near-black sky.
    this.scene.add(new AmbientLight(0xffffff, 1.5));

    const keyLight = new DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(12, 18, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -48;
    keyLight.shadow.camera.right = 48;
    keyLight.shadow.camera.top = 48;
    keyLight.shadow.camera.bottom = -48;
    keyLight.shadow.camera.far = 160;
    keyLight.shadow.bias = -0.0002;
    this.scene.add(keyLight);

    const fillLight = new DirectionalLight(0xbcd8ff, 0.8);
    fillLight.position.set(-14, 2, -10);
    this.scene.add(fillLight);

    this.buildIslands(data);
    this.bridges = createIslandBridges();
    this.scene.add(this.bridges.group);
  }

  private buildIslands(data: CubeSceneData): void {
    const builders: Record<IslandId, () => IslandBuildResult> = {
      projects: () => buildProjectsIsland(data.projects, data.kits),
      skills: () => buildSkillsIsland(data.skills, data.kits),
      about: () => buildAboutIsland(data.kits),
      contact: () => buildContactIsland(data.kits),
    };

    ISLANDS.forEach((definition, index) => {
      const wrapper = new Group();
      wrapper.position.copy(definition.position);

      const base = createIslandBase({
        topRadius: definition.radius,
        radialSegments: definition.radialSegments,
        topColor: definition.colors.grass,
        rockColor: definition.colors.rock,
        topRoughness: definition.topRoughness,
      });
      base.traverse((object) => {
        if (object instanceof Mesh) object.receiveShadow = true;
      });
      wrapper.add(base);

      const result = builders[definition.id]();
      const { group, detailGroup, interactiveObjects } = result;
      wrapper.add(group);
      group.traverse((object) => {
        if (object instanceof Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      this.scene.add(wrapper);

      this.islands.push({
        definition,
        wrapper,
        detailGroup,
        interactiveObjects,
        update: result.update,
        // Offset phases so the islands don't bob in lockstep.
        floatPhase: index * 1.7,
        detailVisible: true,
        titleDuplicatesBuilding: interactiveObjects.some(
          (entry) => entry.label === definition.title,
        ),
      });
    });
  }

  /** Idle bob, OrbitControls damping, nav-triggered camera flights, and per-island culling of the
   * dense ground cover. */
  update(elapsedSeconds: number): void {
    this.advanceFlight();
    for (const island of this.islands) {
      island.update?.(elapsedSeconds);
      const bob = Math.sin(elapsedSeconds * 0.4 + island.floatPhase) * 0.12;
      island.wrapper.position.y = island.definition.position.y + bob;

      const distance = this.camera.position.distanceTo(island.wrapper.position);
      const framing = framingRadius(island.definition);
      island.detailVisible = island.detailVisible
        ? distance < framing * detailHideFactor()
        : distance < framing * detailShowFactor();
      island.detailGroup.visible = island.detailVisible;
    }

    this.bridges.update(elapsedSeconds);
    this.controls.update();
    this.spaceBackground.update(this.camera.position);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  /**
   * Suspends camera control while a modal panel is open.
   *
   * The panels render inside the same host element OrbitControls listens on, so while it is live
   * it swallows their input: `setPointerCapture` on pointerdown retargets the click away from the
   * modal's close button, and the wheel handler calls preventDefault, stopping the panel from
   * scrolling. Disabling the controls hands both back to the DOM.
   */
  setPanelOpen(open: boolean): void {
    this.panelOpen = open;
    this.controls.enabled = !open && !this.flight;
  }

  pickAtNdc(ndcX: number, ndcY: number): InteractiveObject | null {
    const candidates = this.islands.flatMap((island) => island.interactiveObjects);
    return this.interaction.pick(ndcX, ndcY, candidates);
  }

  /**
   * Picks an island the camera is too far from to interact with, so a click can fly there instead.
   *
   * Only islands showing nothing but their title qualify. Up close, a click has to keep reaching
   * the building under it — flying to an island you are already standing on would take the
   * selection away rather than give it.
   */
  pickDistantIslandAtNdc(ndcX: number, ndcY: number): IslandId | null {
    const candidates = this.islands
      .filter((island) => !island.detailVisible)
      .map((island) => ({
        value: island.definition.id,
        center: island.wrapper.position,
        radius: framingRadius(island.definition),
      }));

    return this.interaction.pickSphere(ndcX, ndcY, candidates);
  }

  /**
   * Screen-space label chips: each island's title plus one per building, so a project or skill can
   * be opened either by clicking its building or its chip.
   *
   * Building chips only appear once the camera is at that island. From the opening view that holds
   * all four at once, six project chips over a thumbnail-sized island are an unreadable pile.
   */
  getLabels(width: number, height: number): LabelPoint[] {
    const labels: LabelPoint[] = [];

    for (const island of this.islands) {
      const { radius, contentHeight } = island.definition;
      const cameraDistance = this.camera.position.distanceTo(island.wrapper.position);

      // The title floats clear of the island's tallest building, and drops away once the camera is
      // close enough that the building chips carry the labelling.
      const titleWouldRepeatChip = island.detailVisible && island.titleDuplicatesBuilding;
      if (
        !titleWouldRepeatChip &&
        cameraDistance > framingRadius(island.definition) * TITLE_VISIBLE_FACTOR
      ) {
        worldPositionScratch
          .copy(island.wrapper.position)
          .setY(island.wrapper.position.y + contentHeight + radius * TITLE_CLEARANCE_FACTOR);
        const titleScreen = projectToScreen(worldPositionScratch, this.camera, width, height);
        if (titleScreen.visible) {
          labels.push({
            id: `title-${island.definition.id}`,
            x: titleScreen.x,
            y: titleScreen.y,
            text: island.definition.title,
            kind: null,
            // Carries the island id so clicking the title flies there, the same as clicking the
            // island itself — it sits right above it and is the obvious thing to aim at.
            payload: island.detailVisible ? null : island.definition.id,
          });
        }
      }

      if (!island.detailVisible) {
        continue;
      }

      island.interactiveObjects.forEach((entry, index) => {
        entry.labelAnchor.getWorldPosition(worldPositionScratch);
        const screen = projectToScreen(worldPositionScratch, this.camera, width, height);
        if (!screen.visible) {
          return;
        }
        labels.push({
          id: `${island.definition.id}-${index}`,
          x: screen.x,
          y: screen.y,
          text: entry.label,
          kind: entry.kind,
          payload: entry.payload,
        });
      });
    }

    return labels;
  }

  /**
   * Smoothly flies the camera to frame one island, preserving the current viewing angle (only
   * distance and target change). Because the orbit target lands on the island, orbiting after the
   * flight turns that island on its own axis. Free mouse control resumes when the flight ends.
   */
  flyToIsland(id: IslandId): void {
    const definition = findIsland(id);
    const runtime = this.islands.find((island) => island.definition.id === id);
    const endTarget = (runtime?.wrapper.position ?? definition.position).clone();

    const desiredDistance = MathUtils.clamp(
      framingRadius(definition) * responsiveFramingFactor(FRAMING_FACTOR),
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();

    this.flight = {
      startTime: performance.now(),
      duration: 900,
      startPosition: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endPosition: endTarget.clone().addScaledVector(direction, desiredDistance),
      endTarget,
    };
    this.controls.enabled = false;
  }

  /**
   * Flies back to the opening viewpoint — the same framing the world loads with, so it undoes any
   * amount of orbiting, panning and zooming in one step.
   *
   * Unlike `flyToIsland` this restores the viewing *angle* too, not just the distance and target:
   * the point is to land exactly where a page reload would.
   */
  resetView(): void {
    const opening = openingView();
    this.flight = {
      startTime: performance.now(),
      duration: 1000,
      startPosition: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endPosition: opening.position,
      endTarget: opening.target,
    };
    this.controls.enabled = false;
  }

  private advanceFlight(): void {
    const flight = this.flight;
    if (!flight) {
      return;
    }

    const t = MathUtils.clamp((performance.now() - flight.startTime) / flight.duration, 0, 1);
    const eased = easeInOutCubic(t);
    this.camera.position.lerpVectors(flight.startPosition, flight.endPosition, eased);
    this.controls.target.lerpVectors(flight.startTarget, flight.endTarget, eased);

    if (t >= 1) {
      this.flight = null;
      // Not unconditionally true: a panel opened mid-flight must keep the controls suspended.
      this.controls.enabled = !this.panelOpen;
    }
  }

  dispose(): void {
    this.controls.dispose();
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
