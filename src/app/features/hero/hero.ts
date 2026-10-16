import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  protected scrollPastHero(): void {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  }
}
