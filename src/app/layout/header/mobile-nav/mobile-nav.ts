import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { cycleFocus, getFocusableElements } from '../../../core/utils/focus-trap';

export interface NavLink {
  id: string;
  label: string;
}

@Component({
  selector: 'app-mobile-nav',
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNav {
  open = input.required<boolean>();
  navLinks = input.required<NavLink[]>();

  linkClick = output<string>();
  closeRequested = output<void>();

  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.previouslyFocused = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';
        queueMicrotask(() => this.focusFirstElement());
      } else {
        document.body.style.overflow = '';
        this.previouslyFocused?.focus();
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.closeRequested.emit();
    }
  }

  @HostListener('keydown.tab', ['$event'])
  @HostListener('keydown.shift.tab', ['$event'])
  protected onTab(event: Event): void {
    if (this.open()) {
      cycleFocus(this.element.nativeElement, event);
    }
  }

  protected onLinkClick(id: string): void {
    this.linkClick.emit(id);
  }

  protected onBackdropClick(): void {
    this.closeRequested.emit();
  }

  private focusFirstElement(): void {
    getFocusableElements(this.element.nativeElement)[0]?.focus();
  }
}
