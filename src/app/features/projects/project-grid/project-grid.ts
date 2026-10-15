import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { SectionHeading } from '../../../shared/components/section-heading/section-heading';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { ReducedMotionService } from '../../../core/services/reduced-motion.service';
import { PROJECTS } from '../../../data/projects.data';
import { Project } from '../../../core/models/project.model';
import { ProjectCard } from '../project-card/project-card';
import { ProjectModal } from '../project-modal/project-modal';

const CARD_WIDTHS = [280, 360, 320];

// Repeated enough times that the track stays wider than any realistic viewport at every point
// of the loop — otherwise the row runs out of content and shows a gap before it wraps around.
const REPEAT_COUNT = 6;

interface MarqueeRow {
  items: Project[];
  looped: Project[];
  copies: number;
  durationSeconds: number;
}

@Component({
  selector: 'app-project-grid',
  imports: [SectionHeading, ScrollRevealDirective, ProjectCard, ProjectModal],
  templateUrl: './project-grid.html',
  styleUrl: './project-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectGrid {
  private readonly reducedMotion = inject(ReducedMotionService);

  private readonly rowA = PROJECTS.slice(0, 3);
  private readonly rowB = PROJECTS.slice(3, 6);

  protected readonly rows = computed<MarqueeRow[]>(() => {
    const loop = !this.reducedMotion.prefersReduced();
    const copies = loop ? REPEAT_COUNT : 1;
    const buildRow = (items: Project[], durationSeconds: number): MarqueeRow => ({
      items,
      looped: loop ? Array.from({ length: copies }, () => items).flat() : items,
      copies,
      durationSeconds,
    });

    return [buildRow(this.rowA, 42), buildRow(this.rowB, 52)];
  });

  protected readonly isLooping = computed(() => !this.reducedMotion.prefersReduced());

  protected readonly selectedProject = signal<Project | null>(null);

  @ViewChild(ProjectModal) private projectModal?: ProjectModal;
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.selectedProject()) {
        this.previouslyFocused = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';
        queueMicrotask(() => this.projectModal?.focusFirstElement());
      } else {
        document.body.style.overflow = '';
        this.previouslyFocused?.focus();
      }
    });
  }

  protected widthFor(index: number): number {
    return CARD_WIDTHS[index % CARD_WIDTHS.length];
  }

  protected openProject(project: Project): void {
    this.selectedProject.set(project);
  }

  protected closeProject(): void {
    this.selectedProject.set(null);
  }
}
