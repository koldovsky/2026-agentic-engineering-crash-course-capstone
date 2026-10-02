import { ComponentFixture } from '@angular/core/testing';

/** Test helpers that query the whole document, because Material dialogs and menus render in an overlay. */
export function buttonByText(text: string, root: ParentNode = document): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button, a[mat-button]')).find(
    (b) => b.textContent?.trim() === text,
  );
  if (!button) throw new Error(`expected a button "${text}" to exist`);
  return button;
}

export function dialogElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>('mat-dialog-container');
}

export function setInput(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Opens a mat-select and picks the option with this text. */
export async function pickOption(
  fixture: ComponentFixture<unknown>,
  select: HTMLElement,
  text: string,
): Promise<void> {
  select.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
  await settle(fixture);
  const option = Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find(
    (o) => o.textContent?.trim() === text,
  );
  if (!option) throw new Error(`expected an option "${text}" to exist`);
  option.click();
  await settle(fixture);
}

/** The text shown by a mat-select. */
export function selectedText(select: HTMLElement): string {
  return select.querySelector('.mat-mdc-select-value')?.textContent?.trim() ?? '';
}
