import { ChangeDetectionStrategy, Component, ViewChild, computed, effect, signal } from '@angular/core';
import { Project } from '../../core/models/project.model';
import { Skill } from '../../core/models/skill.model';
import { ScrollRevealDirective } from '../../core/directives/scroll-reveal.directive';
import { matchSkillProjects } from '../../core/utils/match-skill-projects';
import { EDUCATION } from '../../data/education.data';
import { PROJECTS } from '../../data/projects.data';
import { SKILLS } from '../../data/skills.data';
import { WORK_EXPERIENCE } from '../../data/work-experience.data';
import { SectionHeading } from '../../shared/components/section-heading/section-heading';
import { ProjectCard } from '../projects/project-card/project-card';
import { ProjectModal } from '../projects/project-modal/project-modal';
import { SkillCircle } from '../skills/skill-circle/skill-circle';
import { SkillModal } from '../skills/skill-modal/skill-modal';
import { TimelineEntry } from '../journey/timeline-entry/timeline-entry';

/**
 * Accessible, non-animated equivalent of the 3D island experience: shown when the user prefers
 * reduced motion or their browser has no WebGL. Renders every section as a real DOM element whose
 * id matches the header nav (projects/journey/about/skills/contact), so AnchorScrollService finds
 * and scrolls to it directly instead of handing off to SectionNavigationService.
 */
@Component({
  selector: 'app-cube-fallback',
  imports: [
    SectionHeading,
    ScrollRevealDirective,
    ProjectCard,
    ProjectModal,
    SkillCircle,
    SkillModal,
    TimelineEntry,
  ],
  templateUrl: './cube-fallback.html',
  styleUrl: './cube-fallback.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CubeFallback {
  protected readonly projects = PROJECTS;
  protected readonly workExperience = WORK_EXPERIENCE;
  protected readonly education = EDUCATION;
  protected readonly skills = SKILLS;

  protected readonly infoFields = [
    { label: 'Standort', value: 'Wien, Österreich' },
    { label: 'Studium', value: 'Bachelor Informatik' },
    { label: 'Sprachen', value: 'Deutsch, Türkisch, Englisch' },
    { label: 'Schwerpunkt', value: 'Full-Stack Development' },
  ];

  protected readonly selectedProject = signal<Project | null>(null);
  protected readonly selectedSkill = signal<Skill | null>(null);
  protected readonly relatedProjects = computed(() => {
    const skill = this.selectedSkill();
    return skill ? matchSkillProjects(skill, PROJECTS) : [];
  });

  @ViewChild(ProjectModal) private projectModal?: ProjectModal;
  @ViewChild(SkillModal) private skillModal?: SkillModal;
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const open = this.selectedProject() ?? this.selectedSkill();
      if (open) {
        this.previouslyFocused = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';
        queueMicrotask(() => (this.projectModal ?? this.skillModal)?.focusFirstElement());
      } else {
        document.body.style.overflow = '';
        this.previouslyFocused?.focus();
      }
    });
  }

  protected openProject(project: Project): void {
    this.selectedProject.set(project);
  }

  protected closeProject(): void {
    this.selectedProject.set(null);
  }

  protected openSkill(skill: Skill): void {
    this.selectedSkill.set(skill);
  }

  protected closeSkill(): void {
    this.selectedSkill.set(null);
  }
}
