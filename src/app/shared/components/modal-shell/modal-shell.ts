import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { cycleFocus, getFocusableElements } from '../../../core/utils/focus-trap';

@Component({
  selector: 'app-modal-shell',
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalShell {
  ariaLabel = input.required<string>();
  closeRequested = output<void>();

  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeRequested.emit();
  }

  @HostListener('keydown.tab', ['$event'])
  @HostListener('keydown.shift.tab', ['$event'])
  protected onTab(event: Event): void {
    cycleFocus(this.element.nativeElement, event);
  }

  protected onBackdropClick(): void {
    this.closeRequested.emit();
  }

  protected stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  focusFirstElement(): void {
    getFocusableElements(this.element.nativeElement)[0]?.focus();
  }
}
