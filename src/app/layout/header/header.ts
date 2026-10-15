import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnchorScrollService } from '../../core/services/anchor-scroll.service';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { MobileNav, NavLink } from './mobile-nav/mobile-nav';

const NAV_LINKS: NavLink[] = [
  { id: 'projects', label: 'Projekte' },
  { id: 'about', label: 'Über mich' },
  { id: 'journey', label: 'Werdegang' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Kontakt' },
];

@Component({
  selector: 'app-header',
  imports: [RouterLink, ThemeToggle, MobileNav],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly navLinks = NAV_LINKS;
  protected readonly isMobileNavOpen = signal(false);

  private readonly anchorScroll = inject(AnchorScrollService);

  protected onNavClick(id: string): void {
    this.isMobileNavOpen.set(false);
    this.anchorScroll.scrollToSection(id);
  }

  protected openMobileNav(): void {
    this.isMobileNavOpen.set(true);
  }

  protected closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }
}
