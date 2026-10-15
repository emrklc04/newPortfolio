import { ChangeDetectionStrategy, Component, ViewChild, input, output, signal } from '@angular/core';
import { Skill } from '../../../core/models/skill.model';
import { Project } from '../../../core/models/project.model';
import { ModalShell } from '../../../shared/components/modal-shell/modal-shell';
import { ProjectCard } from '../../projects/project-card/project-card';
import { ProjectModal } from '../../projects/project-modal/project-modal';

@Component({
  selector: 'app-skill-modal',
  imports: [ModalShell, ProjectCard, ProjectModal],
  templateUrl: './skill-modal.html',
  styleUrl: './skill-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillModal {
  skill = input.required<Skill>();
  relatedProjects = input.required<Project[]>();
  closeRequested = output<void>();

  protected readonly selectedProject = signal<Project | null>(null);

  @ViewChild(ModalShell) private modalShell?: ModalShell;

  focusFirstElement(): void {
    this.modalShell?.focusFirstElement();
  }

  protected openProject(project: Project): void {
    this.selectedProject.set(project);
  }

  protected closeProject(): void {
    this.selectedProject.set(null);
  }
}
