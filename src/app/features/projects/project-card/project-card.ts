import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Project } from '../../../core/models/project.model';
import { MarqueeCard } from '../../../shared/components/marquee-card/marquee-card';

@Component({
  selector: 'app-project-card',
  imports: [MarqueeCard],
  templateUrl: './project-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCard {
  project = input.required<Project>();
  widthPx = input<number>();
  decorative = input(false);

  selected = output<Project>();

  protected onActivated(): void {
    this.selected.emit(this.project());
  }
}
