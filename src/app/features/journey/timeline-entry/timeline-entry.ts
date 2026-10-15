import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TimelineEntry as TimelineEntryModel } from '../../../core/models/timeline-entry.model';

@Component({
  selector: 'app-timeline-entry',
  templateUrl: './timeline-entry.html',
  styleUrl: './timeline-entry.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineEntry {
  entry = input.required<TimelineEntryModel>();

  protected readonly expanded = signal(false);

  protected toggle(): void {
    this.expanded.set(!this.expanded());
  }
}
