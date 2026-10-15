import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeading } from '../../shared/components/section-heading/section-heading';
import { ScrollRevealDirective } from '../../core/directives/scroll-reveal.directive';
import { WORK_EXPERIENCE } from '../../data/work-experience.data';
import { EDUCATION } from '../../data/education.data';
import { TimelineEntry } from './timeline-entry/timeline-entry';

@Component({
  selector: 'app-journey',
  imports: [SectionHeading, ScrollRevealDirective, TimelineEntry],
  templateUrl: './journey.html',
  styleUrl: './journey.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Journey {
  protected readonly workExperience = WORK_EXPERIENCE;
  protected readonly education = EDUCATION;
}
