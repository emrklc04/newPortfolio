import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'impressum',
    loadComponent: () =>
      import('./pages/legal/impressum/impressum').then((m) => m.Impressum),
  },
  {
    path: 'datenschutz',
    loadComponent: () =>
      import('./pages/legal/datenschutz/datenschutz').then((m) => m.Datenschutz),
  },
  { path: '**', redirectTo: '' },
];
