import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { EventApiService } from './event-api.service';
import { EventDeleteConfirmComponent } from './event-delete-confirm.component';

function setup(deleteMine = vi.fn((): Promise<void> => Promise.resolve())) {
  TestBed.configureTestingModule({
    providers: [{ provide: EventApiService, useValue: { deleteMine } }],
  });
  const fixture = TestBed.createComponent(EventDeleteConfirmComponent);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const deleted = vi.fn();
  const cancelled = vi.fn();
  fixture.componentInstance.deleted.subscribe(deleted);
  fixture.componentInstance.cancelled.subscribe(cancelled);
  return { fixture, element, deleteMine, deleted, cancelled };
}

function confirmButton(element: HTMLElement) {
  return element.querySelector<HTMLButtonElement>('.confirm-delete')!;
}

function cancelButton(element: HTMLElement) {
  return element.querySelector<HTMLButtonElement>('.cancel-delete')!;
}

function apiError(status: number, code: string) {
  return new HttpErrorResponse({ status, error: { code, message: code } });
}

describe('EventDeleteConfirmComponent', () => {
  it('warns that the deletion cannot be undone', () => {
    const { element } = setup();

    expect(element.textContent).toContain('No se puede deshacer.');
  });

  it('deletes the event and emits deleted', async () => {
    const { fixture, element, deleteMine, deleted } = setup();

    confirmButton(element).click();
    await fixture.whenStable();

    expect(deleteMine).toHaveBeenCalledTimes(1);
    expect(deleted).toHaveBeenCalledTimes(1);
  });

  it('cancel emits cancelled without calling the API', () => {
    const { element, deleteMine, cancelled } = setup();

    cancelButton(element).click();

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(deleteMine).not.toHaveBeenCalled();
  });

  it('disables both buttons while deleting and deletes only once', async () => {
    let resolve!: () => void;
    const deleteMine = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    const { fixture, element } = setup(deleteMine);

    confirmButton(element).click();
    fixture.detectChanges();
    confirmButton(element).click();

    expect(confirmButton(element).disabled).toBe(true);
    expect(cancelButton(element).disabled).toBe(true);
    expect(confirmButton(element).textContent).toContain('Eliminando…');
    expect(deleteMine).toHaveBeenCalledTimes(1);
    resolve();
    await fixture.whenStable();
  });

  it('shows the error message when the deletion fails', async () => {
    const deleteMine = vi.fn(() => Promise.reject(apiError(503, 'auth_unavailable')));
    const { fixture, element, deleted } = setup(deleteMine);

    confirmButton(element).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();
    expect(deleted).not.toHaveBeenCalled();
    expect(confirmButton(element).disabled).toBe(false);
  });

  it('treats an already deleted event as deleted', async () => {
    const deleteMine = vi.fn(() => Promise.reject(apiError(404, 'event_not_found')));
    const { fixture, element, deleted } = setup(deleteMine);

    confirmButton(element).click();
    await fixture.whenStable();

    expect(deleted).toHaveBeenCalledTimes(1);
  });
});
