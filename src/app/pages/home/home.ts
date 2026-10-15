import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Hero } from '../../features/hero/hero';
import { ProjectGrid } from '../../features/projects/project-grid/project-grid';
import { About } from '../../features/about/about';
import { Journey } from '../../features/journey/journey';
import { Skills } from '../../features/skills/skills';
import { Contact } from '../../features/contact/contact';

@Component({
  selector: 'app-home',
  imports: [Hero, ProjectGrid, About, Journey, Skills, Contact],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
