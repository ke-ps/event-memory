import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { EventApiService } from './event-api.service';
import { EventEditFormComponent } from './event-edit-form.component';
import { EventRead } from './event.models';

const currentEvent: EventRead = {
  id: 'event-1',
  event_type: 'wedding',
  title: 'Ana y Luis',
  slug: 'ana-y-luis',
  status: 'draft',
  event_date: '2027-06-12',
  start_time: '18:30:00',
  timezone: 'Europe/Madrid',
  details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
  locations: [],
  created_at: '2026-11-05T10:00:00Z',
  updated_at: '2026-11-05T10:00:00Z',
};

function setup(update = vi.fn((): Promise<EventRead> => Promise.resolve(currentEvent))) {
  TestBed.configureTestingModule({
    providers: [{ provide: EventApiService, useValue: { update } }],
  });
  const fixture = TestBed.createComponent(EventEditFormComponent);
  fixture.componentRef.setInput('event', currentEvent);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, update, component: fixture.componentInstance };
}

function fill(element: HTMLElement, id: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function value(element: HTMLElement, id: string) {
  return element.querySelector<HTMLInputElement>(`#${id}`)!.value;
}

function submitButton(element: HTMLElement) {
  return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
}

describe('EventEditFormComponent', () => {
  it('prefills the form from the event', () => {
    const { element } = setup();

    expect(value(element, 'edit-title')).toBe('Ana y Luis');
    expect(value(element, 'edit-partner-one')).toBe('Ana');
    expect(value(element, 'edit-partner-two')).toBe('Luis');
    expect(value(element, 'edit-event-date')).toBe('2027-06-12');
    expect(value(element, 'edit-start-time')).toBe('18:30');
  });

  it('sends the edited values and emits saved', async () => {
    const saved = { ...currentEvent, title: 'Nuestra boda' };
    const { fixture, element, update, component } = setup(vi.fn(() => Promise.resolve(saved)));
    const emitted: EventRead[] = [];
    component.saved.subscribe((event) => emitted.push(event));

    fill(element, 'edit-title', '  Nuestra boda  ');
    fill(element, 'edit-partner-one', ' Ana María ');
    fill(element, 'edit-partner-two', ' Luis ');
    fixture.detectChanges();
    await component.submit();

    expect(update).toHaveBeenCalledWith({
      title: 'Nuestra boda',
      slug: 'ana-y-luis',
      details: { partner_one_name: 'Ana María', partner_two_name: 'Luis' },
      event_date: '2027-06-12',
      start_time: '18:30',
    });
    expect(emitted).toEqual([saved]);
  });

  it('sends null for an empty title, date and time', async () => {
    const { fixture, element, update, component } = setup();

    fill(element, 'edit-title', '   ');
    fill(element, 'edit-event-date', '');
    fill(element, 'edit-start-time', '');
    fixture.detectChanges();
    await component.submit();

    expect(update).toHaveBeenCalledWith({
      title: null,
      slug: 'ana-y-luis',
      details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
      event_date: null,
      start_time: null,
    });
  });

  it('does not submit with a blank name', async () => {
    const { fixture, element, update, component } = setup();

    fill(element, 'edit-partner-one', '   ');
    fixture.detectChanges();
    await component.submit();
    fixture.detectChanges();

    expect(update).not.toHaveBeenCalled();
    expect(element.querySelector('#edit-partner-one-error')?.textContent).toContain(
      'Escribe un nombre.',
    );
  });

  it('shows an API field error under its field', async () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        code: 'validation_error',
        errors: [{ field: 'title', code: 'string_too_long' }],
      },
    });
    const { fixture, element, component } = setup(vi.fn(() => Promise.reject(error)));

    await component.submit();
    fixture.detectChanges();

    expect(element.querySelector('#edit-title-error')?.textContent?.trim()).not.toBe('');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the general message for a non-field error', async () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: { code: 'event_not_found' },
    });
    const { fixture, element, component } = setup(vi.fn(() => Promise.reject(error)));

    await component.submit();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Todavía no has creado tu boda.',
    );
  });

  it('disables Guardar while saving and sends only once', async () => {
    let resolve!: (event: EventRead) => void;
    const update = vi.fn(() => new Promise<EventRead>((r) => (resolve = r)));
    const { fixture, element } = setup(update);

    submitButton(element).click();
    fixture.detectChanges();
    submitButton(element).click();
    fixture.detectChanges();

    expect(submitButton(element).disabled).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    resolve(currentEvent);
    await fixture.whenStable();
  });

  it('cancel emits cancelled without calling the API', () => {
    const { element, update, component } = setup();
    let cancelled = 0;
    component.cancelled.subscribe(() => cancelled++);

    element.querySelector<HTMLButtonElement>('button[type="button"]')!.click();

    expect(cancelled).toBe(1);
    expect(update).not.toHaveBeenCalled();
  });
});
