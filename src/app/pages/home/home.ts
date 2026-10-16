import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SceneModeService } from '../../core/services/scene-mode.service';
import { Hero } from '../../features/hero/hero';
import { CubeExperience } from '../../features/cube/cube-experience';
import { CubeFallback } from '../../features/cube-fallback/cube-fallback';

@Component({
  selector: 'app-home',
  imports: [Hero, CubeExperience, CubeFallback],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly sceneMode = inject(SceneModeService);
}
