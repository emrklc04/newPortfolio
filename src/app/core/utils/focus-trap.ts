export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])'),
  );
}

export function cycleFocus(root: HTMLElement, event: Event): void {
  const focusable = getFocusableElements(root);
  if (focusable.length === 0) {
    return;
  }

  const keyboardEvent = event as KeyboardEvent;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (keyboardEvent.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!keyboardEvent.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
