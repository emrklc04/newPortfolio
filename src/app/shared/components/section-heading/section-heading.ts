import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  templateUrl: './section-heading.html',
  styleUrl: './section-heading.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeading {
  eyebrow = input.required<string>();
  heading = input.required<string>();
  description = input<string>();
}
