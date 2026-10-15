import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { SectionHeading } from '../../shared/components/section-heading/section-heading';
import { ScrollRevealDirective } from '../../core/directives/scroll-reveal.directive';
import { ReducedMotionService } from '../../core/services/reduced-motion.service';
import { matchSkillProjects } from '../../core/utils/match-skill-projects';
import { SKILLS } from '../../data/skills.data';
import { PROJECTS } from '../../data/projects.data';
import { Skill } from '../../core/models/skill.model';
import { SkillCircle } from './skill-circle/skill-circle';
import { SkillModal } from './skill-modal/skill-modal';

// Repeated enough times that the track stays wider than any realistic viewport at every point
// of the loop — otherwise the row runs out of content and shows a gap before it wraps around.
const REPEAT_COUNT = 6;

@Component({
  selector: 'app-skills',
  imports: [SectionHeading, ScrollRevealDirective, SkillCircle, SkillModal],
  templateUrl: './skills.html',
  styleUrl: './skills.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skills {
  private readonly reducedMotion = inject(ReducedMotionService);

  protected readonly isLooping = computed(() => !this.reducedMotion.prefersReduced());
  protected readonly copies = computed(() => (this.isLooping() ? REPEAT_COUNT : 1));
  protected readonly loopedSkills = computed(() =>
    this.isLooping() ? Array.from({ length: this.copies() }, () => SKILLS).flat() : SKILLS,
  );
  protected readonly realCount = SKILLS.length;

  protected readonly selectedSkill = signal<Skill | null>(null);
  protected readonly relatedProjects = computed(() => {
    const skill = this.selectedSkill();
    return skill ? matchSkillProjects(skill, PROJECTS) : [];
  });

  @ViewChild(SkillModal) private skillModal?: SkillModal;
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.selectedSkill()) {
        this.previouslyFocused = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';
        queueMicrotask(() => this.skillModal?.focusFirstElement());
      } else {
        document.body.style.overflow = '';
        this.previouslyFocused?.focus();
      }
    });
  }

  protected openSkill(skill: Skill): void {
    this.selectedSkill.set(skill);
  }

  protected closeSkill(): void {
    this.selectedSkill.set(null);
  }
}
