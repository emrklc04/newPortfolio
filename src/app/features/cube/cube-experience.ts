import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
import { CubeFaceId, CubeFaceRegistryService } from '../../core/services/cube-face-registry.service';
import { CONTACT_LINKS } from '../../data/contact-links.data';
import { EDUCATION } from '../../data/education.data';
import { PROJECTS } from '../../data/projects.data';
import { SKILLS } from '../../data/skills.data';
import { WORK_EXPERIENCE } from '../../data/work-experience.data';
import { ModalShell } from '../../shared/components/modal-shell/modal-shell';
import { ProjectModal } from '../projects/project-modal/project-modal';
import { SkillModal } from '../skills/skill-modal/skill-modal';
import { CubeScene, LabelPoint } from './engine/cube-scene';
import { progressForTheme } from './engine/cube-rotation';
import { loadModels } from './engine/model-loader';
import { MODEL_URLS } from './engine/model-urls';
import { InteractiveObject } from './engine/types';

// Theme order is [suburb, city, ice, pyramids, forest, empty] — see engine/cube-rotation.ts.
const NAV_FACE_IDS: Record<number, CubeFaceId> = {
  0: 'projects',
  1: 'journey',
  2: 'about',
  3: 'skills',
  4: 'contact',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

@Component({
  selector: 'app-cube-experience',
  imports: [ModalShell, ProjectModal, SkillModal],
  templateUrl: './cube-experience.html',
  styleUrl: './cube-experience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CubeExperience implements OnDestroy {
  @ViewChild('canvasRef', { static: true }) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('labelLayerRef', { static: true }) private readonly labelLayerRef!: ElementRef<HTMLDivElement>;

  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly faceRegistry = inject(CubeFaceRegistryService);

  protected readonly selectedProject = signal<Project | null>(null);
  protected readonly selectedExperience = signal<TimelineEntry | null>(null);
  protected readonly selectedSkill = signal<Skill | null>(null);
  protected readonly aboutOpen = signal(false);
  protected readonly contactOpen = signal(false);

  protected readonly education = EDUCATION;
  protected readonly contactLinks = CONTACT_LINKS;
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

  constructor() {
    afterNextRender(() => void this.initScene());

    effect(() => {
      const anyPanelOpen =
        !!this.selectedProject() ||
        !!this.selectedExperience() ||
        !!this.selectedSkill() ||
        this.aboutOpen() ||
        this.contactOpen();
      document.body.style.overflow = anyPanelOpen ? 'hidden' : '';
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafHandle);
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.cubeScene?.dispose();
    this.faceRegistry.clear();
    document.body.style.overflow = '';
  }

  private async initScene(): Promise<void> {
    const templates = await loadModels(MODEL_URLS);
    if (this.destroyed) {
      return;
    }

    this.cubeScene = new CubeScene(this.canvasRef.nativeElement, {
      projects: PROJECTS,
      workExperience: WORK_EXPERIENCE,
      skills: SKILLS,
      templates,
    });

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
    this.registerFaceOffsets();
  };

  private readonly tick = (): void => {
    const { rotationProgress, opacity } = this.computeScrollMetrics();
    const elapsed = (performance.now() - this.startTime) / 1000;

    this.cubeScene?.update(rotationProgress, elapsed);
    this.cubeScene?.render();
    this.canvasRef.nativeElement.style.opacity = String(opacity);

    const labels = this.cubeScene?.getLabels(window.innerWidth, window.innerHeight, rotationProgress) ?? [];
    this.renderLabels(labels, opacity);

    this.rafHandle = requestAnimationFrame(this.tick);
  };

  private computeScrollMetrics(): { rotationProgress: number; opacity: number } {
    const host = this.hostElement.nativeElement;
    const rect = host.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const rotationHeight = Math.max(host.offsetHeight - viewportHeight, 1);
    const scrolledIntoHost = Math.max(-rect.top, 0);

    const rotationProgress = clamp(scrolledIntoHost / rotationHeight, 0, 1);

    // Hidden for the entire hero (scrolledIntoHost === 0 there), then fades in quickly over a
    // short distance once the user actually scrolls into the cube section — not a full extra
    // viewport of scroll, so it doesn't open a "dead" gap before anything appears.
    const fadeInDistance = viewportHeight * 0.25;
    const introFade = clamp(scrolledIntoHost / fadeInDistance, 0, 1);

    const pastRotation = Math.max(scrolledIntoHost - rotationHeight, 0);
    const outroFade = 1 - clamp(pastRotation / viewportHeight, 0, 1);

    return { rotationProgress, opacity: introFade * outroFade };
  }

  private registerFaceOffsets(): void {
    const host = this.hostElement.nativeElement;
    const rect = host.getBoundingClientRect();
    const hostTopAbsolute = window.scrollY + rect.top;
    const rotationHeight = Math.max(host.offsetHeight - window.innerHeight, 1);

    const offsets: Partial<Record<CubeFaceId, number>> = {};
    for (const [indexKey, id] of Object.entries(NAV_FACE_IDS)) {
      const target = progressForTheme(Number(indexKey));
      offsets[id] = hostTopAbsolute + target * rotationHeight;
    }

    this.faceRegistry.register(offsets);
  }

  private renderLabels(points: LabelPoint[], globalOpacity: number): void {
    const container = this.labelLayerRef.nativeElement;
    const seen = new Set<string>();

    for (const point of points) {
      seen.add(point.id);
      let el = this.labelElements.get(point.id);
      if (!el) {
        el = document.createElement('span');
        el.className = 'label-chip glass-surface';
        el.addEventListener('click', () => this.onLabelClick(el!));
        container.appendChild(el);
        this.labelElements.set(point.id, el);
      }
      el.textContent = point.text;
      el.style.transform = `translate(${point.x}px, ${point.y}px)`;
      el.style.opacity = String(point.opacity * globalOpacity);
      el.dataset['kind'] = point.kind;
      (el as HTMLSpanElement & { __payload?: unknown }).__payload = point.payload;
    }

    for (const [id, el] of this.labelElements) {
      if (!seen.has(id)) {
        el.remove();
        this.labelElements.delete(id);
      }
    }
  }

  private onLabelClick(el: HTMLSpanElement): void {
    const kind = el.dataset['kind'] as InteractiveObject['kind'] | undefined;
    const payload = (el as HTMLSpanElement & { __payload?: unknown }).__payload;
    if (kind) {
      this.openInteractive({ kind, payload });
    }
  }

  protected onCanvasClick(event: MouseEvent): void {
    if (!this.cubeScene) {
      return;
    }
    const ndcX = (event.clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(event.clientY / window.innerHeight) * 2 + 1;
    const { rotationProgress } = this.computeScrollMetrics();

    const hit = this.cubeScene.pickAtNdc(ndcX, ndcY, rotationProgress);
    if (hit) {
      this.openInteractive(hit);
    }
  }

  private openInteractive(hit: Pick<InteractiveObject, 'kind' | 'payload'>): void {
    switch (hit.kind) {
      case 'project':
        this.selectedProject.set(hit.payload as Project);
        break;
      case 'experience':
        this.selectedExperience.set(hit.payload as TimelineEntry);
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
}
