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

function setup(
  update = vi.fn((): Promise<EventRead> => Promise.resolve(currentEvent)),
  event: EventRead = currentEvent,
) {
  TestBed.configureTestingModule({
    providers: [{ provide: EventApiService, useValue: { update } }],
  });
  const fixture = TestBed.createComponent(EventEditFormComponent);
  fixture.componentRef.setInput('event', event);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, update, component: fixture.componentInstance };
}

function setupWithDetails(texts: Partial<EventRead['details']>) {
  return setup(undefined, { ...currentEvent, details: { ...currentEvent.details, ...texts } });
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

  it('prefills the URL field', () => {
    const { element } = setup();

    expect(value(element, 'edit-slug')).toBe('ana-y-luis');
  });

  it('sends the edited slug trimmed and lowercased', async () => {
    const { fixture, element, update, component } = setup();

    fill(element, 'edit-slug', 'Boda-Ana ');
    fixture.detectChanges();
    await component.submit();

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ slug: 'boda-ana' }));
  });

  it('shows a format error for an invalid slug', async () => {
    const { fixture, element, update, component } = setup();

    for (const invalid of ['ana y luis', 'ab', 'x'.repeat(81)]) {
      fill(element, 'edit-slug', invalid);
      fixture.detectChanges();
      await component.submit();
      fixture.detectChanges();

      expect(update).not.toHaveBeenCalled();
      expect(element.querySelector('#edit-slug-error')?.textContent).toContain(
        'Usa solo minúsculas, números y guiones',
      );
    }
  });

  it('disables the URL field when published and still sends the slug', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EventApiService,
          useValue: { update: vi.fn((): Promise<EventRead> => Promise.resolve(currentEvent)) },
        },
      ],
    });
    const fixture = TestBed.createComponent(EventEditFormComponent);
    fixture.componentRef.setInput('event', { ...currentEvent, status: 'published' });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const update = TestBed.inject(EventApiService).update as ReturnType<typeof vi.fn>;

    expect(element.querySelector<HTMLInputElement>('#edit-slug')!.disabled).toBe(true);
    expect(element.textContent).toContain('Para cambiarla, despublica la boda');
    await fixture.componentInstance.submit();

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ slug: 'ana-y-luis' }));
  });

  it('shows slug_taken under the URL field', async () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'slug_taken', errors: [{ field: 'slug', code: 'slug_taken' }] },
    });
    const { fixture, element, component } = setup(vi.fn(() => Promise.reject(error)));

    await component.submit();
    fixture.detectChanges();

    expect(element.querySelector('#edit-slug-error')?.textContent).toContain(
      'Esa dirección ya está en uso.',
    );
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows slug_locked under the disabled URL field', async () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'slug_locked', errors: [{ field: 'slug', code: 'slug_locked' }] },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: EventApiService, useValue: { update: vi.fn(() => Promise.reject(error)) } },
      ],
    });
    const fixture = TestBed.createComponent(EventEditFormComponent);
    fixture.componentRef.setInput('event', { ...currentEvent, status: 'published' });
    fixture.detectChanges();

    await fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#edit-slug-error')?.textContent,
    ).toContain('Para cambiar la dirección, despublica la boda.');
  });

  it('shows event_date_required under the date', async () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        code: 'event_date_required',
        errors: [{ field: 'event_date', code: 'event_date_required' }],
      },
    });
    const { fixture, element, component } = setup(vi.fn(() => Promise.reject(error)));

    await component.submit();
    fixture.detectChanges();

    expect(element.querySelector('#edit-event-date-error')?.textContent).toContain(
      'Una boda publicada necesita fecha.',
    );
    expect(element.querySelector('[role="alert"]')).toBeNull();
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
      details: {
        partner_one_name: 'Ana María',
        partner_two_name: 'Luis',
        welcome_text: null,
        story: null,
      },
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
      details: {
        partner_one_name: 'Ana',
        partner_two_name: 'Luis',
        welcome_text: null,
        story: null,
      },
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

  it('prefills the texts', () => {
    const { element } = setupWithDetails({ welcome_text: 'Hola', story: 'Nuestra historia' });

    expect(value(element, 'edit-welcome-text')).toBe('Hola');
    expect(value(element, 'edit-story')).toBe('Nuestra historia');
  });

  it('sends the texts trimmed', async () => {
    const { fixture, element, update, component } = setup();

    fill(element, 'edit-welcome-text', '  Hola  ');
    fill(element, 'edit-story', 'Línea 1\nLínea 2 ');
    fixture.detectChanges();
    await component.submit();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          welcome_text: 'Hola',
          story: 'Línea 1\nLínea 2',
        }) as unknown,
      }),
    );
  });

  it('sends null for empty texts', async () => {
    const { fixture, element, update, component } = setupWithDetails({ welcome_text: 'Hola' });

    fill(element, 'edit-welcome-text', '   ');
    fixture.detectChanges();
    await component.submit();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ welcome_text: null, story: null }) as unknown,
      }),
    );
  });

  it.each([
    ['edit-welcome-text', 501],
    ['edit-story', 2001],
  ])('does not submit a %s over its limit', async (id, length) => {
    const { fixture, element, update, component } = setup();
    const textarea = element.querySelector<HTMLTextAreaElement>('#' + id)!;

    fill(element, id, 'x'.repeat(length));
    textarea.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await component.submit();
    fixture.detectChanges();

    expect(update).not.toHaveBeenCalled();
    expect(element.querySelector('#' + id + '-error')?.textContent).toContain(
      'El texto es demasiado largo.',
    );
  });

  it('shows a server error under its text field', async () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        code: 'validation_error',
        errors: [{ field: 'details.story', code: 'string_too_long' }],
      },
    });
    const { fixture, element, component } = setup(vi.fn(() => Promise.reject(error)));

    await component.submit();
    fixture.detectChanges();

    expect(element.querySelector('#edit-story-error')?.textContent).toContain(
      'El texto es demasiado largo.',
    );
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
