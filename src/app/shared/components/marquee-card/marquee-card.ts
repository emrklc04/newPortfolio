import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-marquee-card',
  templateUrl: './marquee-card.html',
  styleUrl: './marquee-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarqueeCard {
  iconUrl = input.required<string>();
  label = input.required<string>();
  widthPx = input<number>();
  aspectRatio = input('3 / 4');
  decorative = input(false);

  activated = output<void>();

  protected onClick(): void {
    this.activated.emit();
  }
}
