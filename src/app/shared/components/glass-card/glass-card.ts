import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-glass-card',
  templateUrl: './glass-card.html',
  styleUrl: './glass-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlassCard {}
