import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AnchorScrollService } from '../../core/services/anchor-scroll.service';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly anchorScroll = inject(AnchorScrollService);

  protected scrollTo(id: string): void {
    this.anchorScroll.scrollToSection(id);
  }
}
