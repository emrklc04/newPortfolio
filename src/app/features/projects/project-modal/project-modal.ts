import { ChangeDetectionStrategy, Component, ViewChild, input, output } from '@angular/core';
import { Project } from '../../../core/models/project.model';
import { ModalShell } from '../../../shared/components/modal-shell/modal-shell';
import { ProjectMedia } from '../project-media/project-media';

@Component({
  selector: 'app-project-modal',
  imports: [ModalShell, ProjectMedia],
  templateUrl: './project-modal.html',
  styleUrl: './project-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectModal {
  project = input.required<Project>();
  closeRequested = output<void>();

  @ViewChild(ModalShell) private modalShell?: ModalShell;

  focusFirstElement(): void {
    this.modalShell?.focusFirstElement();
  }
}
