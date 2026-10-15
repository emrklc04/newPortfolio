import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Skill } from '../../../core/models/skill.model';
import { MarqueeCard } from '../../../shared/components/marquee-card/marquee-card';

const FIXED_WIDTH = 340;

@Component({
  selector: 'app-skill-circle',
  imports: [MarqueeCard],
  templateUrl: './skill-circle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCircle {
  skill = input.required<Skill>();
  decorative = input(false);
  selected = output<Skill>();

  protected readonly width = FIXED_WIDTH;

  protected onActivated(): void {
    this.selected.emit(this.skill());
  }
}
