import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeading } from '../../shared/components/section-heading/section-heading';
import { ScrollRevealDirective } from '../../core/directives/scroll-reveal.directive';

interface InfoField {
  label: string;
  value: string;
}

@Component({
  selector: 'app-about',
  imports: [SectionHeading, ScrollRevealDirective],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly infoFields: InfoField[] = [
    { label: 'Standort', value: 'Wien, Österreich' },
    { label: 'Studium', value: 'Bachelor Informatik' },
    { label: 'Sprachen', value: 'Deutsch, Türkisch, Englisch' },
    { label: 'Schwerpunkt', value: 'Full-Stack Development' },
  ];
}
