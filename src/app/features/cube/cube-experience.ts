import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Project } from '../../core/models/project.model';
import { Skill } from '../../core/models/skill.model';
import { TimelineEntry } from '../../core/models/timeline-entry.model';
import { matchSkillProjects } from '../../core/utils/match-skill-projects';
import {
  SectionId,
  SectionNavigationService,
} from '../../core/services/section-navigation.service';
import { CONTACT_LINKS } from '../../data/contact-links.data';
import { EDUCATION } from '../../data/education.data';
import { PROJECTS } from '../../data/projects.data';
import { SKILLS } from '../../data/skills.data';
import { WORK_EXPERIENCE } from '../../data/work-experience.data';
import { ModalShell } from '../../shared/components/modal-shell/modal-shell';
import { ProjectModal } from '../projects/project-modal/project-modal';
import { SkillModal } from '../skills/skill-modal/skill-modal';
import { CubeScene, LabelPoint } from './engine/cube-scene';
import { IslandId } from './engine/islands';
import { loadKits } from './engine/kit-loader';
import { InteractiveObject } from './engine/types';

@Component({
  selector: 'app-cube-experience',
  imports: [ModalShell, ProjectModal, SkillModal],
  templateUrl: './cube-experience.html',
  styleUrl: './cube-experience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.panel-open]': 'panelOpen()' },
})
export class CubeExperience implements OnDestroy {
  @ViewChild('canvasRef', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('labelLayerRef', { static: true })
  private readonly labelLayerRef!: ElementRef<HTMLDivElement>;

  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly sectionNavigation = inject(SectionNavigationService);

  protected readonly selectedProject = signal<Project | null>(null);
  protected readonly selectedExperience = signal<TimelineEntry | null>(null);
  protected readonly selectedSkill = signal<Skill | null>(null);
  protected readonly aboutOpen = signal(false);
  protected readonly contactOpen = signal(false);
  // Werdegang has no island of its own, so the header nav opens it as an overview panel.
  protected readonly journeyOpen = signal(false);

  /** True while any panel is open. Bound to a host class that lifts the world's `touch-action`
   * lock, so a panel can be scrolled by touch as well as by wheel. */
  protected readonly panelOpen = signal(false);

  protected readonly education = EDUCATION;
  protected readonly contactLinks = CONTACT_LINKS;
  protected readonly workExperience = WORK_EXPERIENCE;
  protected readonly infoFields = [
    { label: 'Standort', value: 'Wien, Österreich' },
    { label: 'Studium', value: 'Bachelor Informatik' },
    { label: 'Sprachen', value: 'Deutsch, Türkisch, Englisch' },
    { label: 'Schwerpunkt', value: 'Full-Stack Development' },
  ];
  protected readonly relatedProjects = computed(() => {
    const skill = this.selectedSkill();
    return skill ? matchSkillProjects(skill, PROJECTS) : [];
  });

  private cubeScene: CubeScene | null = null;
  private rafHandle = 0;
  private readonly startTime = performance.now();
  private resizeObserver?: ResizeObserver;
  private readonly labelElements = new Map<string, HTMLSpanElement>();
  private destroyed = false;

  // Click-vs-drag disambiguation: OrbitControls drags happen on the same canvas that raycast-picks
  // objects, so a pointerdown/pointerup that moved more than a few pixels (or took too long) is
  // treated as the end of a camera drag, not a click on whatever's underneath.
  private static readonly CLICK_MOVE_THRESHOLD_PX = 6;
  private static readonly CLICK_MAX_DURATION_MS = 500;
  private pointerDownInfo: { x: number; y: number; time: number } | null = null;

  constructor() {
    afterNextRender(() => void this.initScene());

    effect(() => {
      const open =
        !!this.selectedProject() ||
        !!this.selectedExperience() ||
        !!this.selectedSkill() ||
        this.aboutOpen() ||
        this.contactOpen() ||
        this.journeyOpen();

      this.panelOpen.set(open);
      document.body.style.overflow = open ? 'hidden' : '';
      // Hands pointer and wheel events back to the panel — see CubeScene.setPanelOpen.
      this.cubeScene?.setPanelOpen(open);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafHandle);
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.cubeScene?.dispose();
    this.sectionNavigation.clear();
    document.body.style.overflow = '';
  }

  private async initScene(): Promise<void> {
    const kits = await loadKits();
    if (this.destroyed) {
      return;
    }

    this.cubeScene = new CubeScene(this.canvasRef.nativeElement, this.hostElement.nativeElement, {
      projects: PROJECTS,
      skills: SKILLS,
      kits,
    });

    this.sectionNavigation.register((id) => this.openSection(id));

    this.zone.runOutsideAngular(() => {
      this.handleResize();
      window.addEventListener('resize', this.handleResize);
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.hostElement.nativeElement);

      this.rafHandle = requestAnimationFrame(this.tick);
    });
  }

  private readonly handleResize = (): void => {
    this.cubeScene?.resize(window.innerWidth, window.innerHeight);
  };

  // Scroll no longer drives anything — the free OrbitControls camera explores the world.
  private readonly tick = (): void => {
    const elapsed = (performance.now() - this.startTime) / 1000;

    this.cubeScene?.update(elapsed);
    this.cubeScene?.render();

    const labels = this.cubeScene?.getLabels(window.innerWidth, window.innerHeight) ?? [];
    this.renderLabels(labels);

    this.rafHandle = requestAnimationFrame(this.tick);
  };

  private renderLabels(points: LabelPoint[]): void {
    const container = this.labelLayerRef.nativeElement;
    const seen = new Set<string>();

    for (const point of points) {
      seen.add(point.id);
      let el = this.labelElements.get(point.id);
      if (!el) {
        el = document.createElement('span');
        el.className = 'label-chip glass-surface';
        // No click listener here on purpose — see onCanvasPointerUp, which hit-tests the chips
        // itself because pointer capture would stop a per-chip listener from ever firing.
        container.appendChild(el);
        this.labelElements.set(point.id, el);
      }
      el.textContent = point.text;
      el.style.transform = `translate(${point.x}px, ${point.y}px)`;
      el.classList.toggle('label-chip--title', point.kind === null);
      if (point.kind) {
        el.dataset['kind'] = point.kind;
      } else {
        delete el.dataset['kind'];
      }

      // A title chip only carries an island id while that island is too far to interact with;
      // close up it is just a caption, and the class keeps it from looking clickable.
      const islandId =
        point.kind === null && typeof point.payload === 'string' ? point.payload : '';
      if (islandId) {
        el.dataset['island'] = islandId;
      } else {
        delete el.dataset['island'];
      }
      el.classList.toggle('label-chip--actionable', !!point.kind || !!islandId);
      (el as HTMLSpanElement & { __payload?: unknown }).__payload = point.payload;
    }

    for (const [id, el] of this.labelElements) {
      if (!seen.has(id)) {
        el.remove();
        this.labelElements.delete(id);
      }
    }
  }

  /**
   * Finds the label chip visually under the pointer, if any.
   *
   * This has to hit-test rather than read `event.target`: OrbitControls captures the pointer on
   * the host element, and a captured pointer retargets both `pointerup` and the generated `click`
   * to the capture element — so a listener on the chip itself would never fire, and the event's
   * own target is always the host. `elementFromPoint` is unaffected by capture.
   */
  private chipAtPoint(clientX: number, clientY: number): HTMLSpanElement | null {
    const element = document.elementFromPoint(clientX, clientY);
    return (
      element?.closest<HTMLSpanElement>('.label-chip[data-kind], .label-chip[data-island]') ?? null
    );
  }

  // Bound to the component's host element (not the canvas) via @HostListener: OrbitControls now
  // listens on this same host element and calls `domElement.setPointerCapture()` on pointerdown,
  // which retargets the subsequent pointerup event to fire on the host rather than wherever the
  // cursor physically is — a canvas-only listener would never see that retargeted pointerup.
  @HostListener('pointerdown', ['$event'])
  protected onCanvasPointerDown(event: PointerEvent): void {
    this.pointerDownInfo = { x: event.clientX, y: event.clientY, time: performance.now() };
  }

  @HostListener('pointerup', ['$event'])
  protected onCanvasPointerUp(event: PointerEvent): void {
    const start = this.pointerDownInfo;
    this.pointerDownInfo = null;
    if (!start || !this.cubeScene) {
      return;
    }

    // An open panel covers the world: a click inside it must not also raycast the scene behind,
    // which would otherwise swap one panel for another when closing or scrolling it.
    if (this.panelOpen()) {
      return;
    }

    const movedPx = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    const elapsedMs = performance.now() - start.time;
    if (
      movedPx > CubeExperience.CLICK_MOVE_THRESHOLD_PX ||
      elapsedMs > CubeExperience.CLICK_MAX_DURATION_MS
    ) {
      return; // This was a camera drag, not a click on whatever's underneath.
    }

    // A chip takes precedence over whatever is behind it: it floats above its building, so
    // raycasting through it would hit empty sky and the click would do nothing.
    const chip = this.chipAtPoint(event.clientX, event.clientY);
    if (chip) {
      const island = chip.dataset['island'];
      if (island) {
        this.cubeScene.flyToIsland(island as IslandId);
      } else {
        this.openInteractive({
          kind: chip.dataset['kind'] as InteractiveObject['kind'],
          payload: (chip as HTMLSpanElement & { __payload?: unknown }).__payload,
        });
      }
      return;
    }

    const ndcX = (event.clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(event.clientY / window.innerHeight) * 2 + 1;

    // From far enough out that an island shows nothing but its title, clicking it flies there
    // rather than trying to select a building too small to aim at.
    const distantIsland = this.cubeScene.pickDistantIslandAtNdc(ndcX, ndcY);
    if (distantIsland) {
      this.cubeScene.flyToIsland(distantIsland);
      return;
    }

    const hit = this.cubeScene.pickAtNdc(ndcX, ndcY);
    if (hit) {
      this.openInteractive(hit);
    }
  }

  private openInteractive(hit: Pick<InteractiveObject, 'kind' | 'payload'>): void {
    switch (hit.kind) {
      case 'project':
        this.selectedProject.set(hit.payload as Project);
        break;
      case 'skill':
        this.selectedSkill.set(hit.payload as Skill);
        break;
      case 'about':
        this.aboutOpen.set(true);
        break;
      case 'contact':
        this.contactOpen.set(true);
        break;
    }
  }

  /**
   * Routes a header-nav click. Projects, Skills and About each have an island, so the nav flies
   * there rather than opening their panel directly — the panel is what the island's buildings
   * open. Only Werdegang and Kontakt, which have no island yet, open straight away.
   */
  private openSection(id: SectionId): void {
    switch (id) {
      case 'projects':
        this.cubeScene?.flyToIsland('projects');
        break;
      case 'skills':
        this.cubeScene?.flyToIsland('skills');
        break;
      case 'about':
        this.cubeScene?.flyToIsland('about');
        break;
      case 'contact':
        this.cubeScene?.flyToIsland('contact');
        break;
      case 'journey':
        this.journeyOpen.set(true);
        break;
    }
  }

  protected closeProject(): void {
    this.selectedProject.set(null);
  }

  protected closeExperience(): void {
    this.selectedExperience.set(null);
  }

  protected closeSkill(): void {
    this.selectedSkill.set(null);
  }

  protected closeAbout(): void {
    this.aboutOpen.set(false);
  }

  protected closeContact(): void {
    this.contactOpen.set(false);
  }

  protected closeJourney(): void {
    this.journeyOpen.set(false);
  }

  /** Flies back to the viewpoint the world opens with. */
  protected resetView(): void {
    this.cubeScene?.resetView();
  }
}
