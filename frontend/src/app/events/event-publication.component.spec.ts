import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { EventApiService } from './event-api.service';
import { EventPublicationComponent } from './event-publication.component';
import { EventRead } from './event.models';

const draft: EventRead = {
  id: 'event-1',
  event_type: 'wedding',
  title: 'Ana y Luis',
  slug: 'ana-y-luis',
  status: 'draft',
  event_date: '2027-06-12',
  start_time: null,
  timezone: 'Europe/Madrid',
  details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
  locations: [],
  created_at: '2026-11-05T10:00:00Z',
  updated_at: '2026-11-05T10:00:00Z',
};
const published: EventRead = { ...draft, status: 'published' };
const link = window.location.origin + '/e/ana-y-luis';

function setup(
  event: EventRead,
  api: { publish?: () => Promise<EventRead>; unpublish?: () => Promise<EventRead> } = {},
) {
  const publish = vi.fn(api.publish ?? (() => Promise.resolve(published)));
  const unpublish = vi.fn(api.unpublish ?? (() => Promise.resolve(draft)));
  TestBed.configureTestingModule({
    providers: [{ provide: EventApiService, useValue: { publish, unpublish } }],
  });
  const fixture = TestBed.createComponent(EventPublicationComponent);
  fixture.componentRef.setInput('event', event);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const changed = vi.fn();
  fixture.componentInstance.changed.subscribe(changed);
  return { fixture, element, publish, unpublish, changed };
}

function button(element: HTMLElement, label: string) {
  return Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === label,
  )!;
}

describe('EventPublicationComponent', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else delete (navigator as unknown as Record<string, unknown>)['clipboard'];
  });

  it('shows Borrador and publishes', async () => {
    const { fixture, element, publish, changed } = setup(draft);

    expect(element.textContent).toContain('Borrador');
    button(element, 'Publicar').click();
    await fixture.whenStable();

    expect(publish).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(published);
  });

  it('disables Publicar without a date', () => {
    const { element, publish } = setup({ ...draft, event_date: null });

    const publishButton = button(element, 'Publicar');
    publishButton.click();

    expect(publishButton.disabled).toBe(true);
    expect(element.textContent).toContain('Añade la fecha para poder publicar');
    expect(publish).not.toHaveBeenCalled();
  });

  it('shows the link and unpublishes', async () => {
    const { fixture, element, unpublish, changed } = setup(published);

    expect(element.textContent).toContain('Publicada');
    expect(element.textContent).toContain(link);
    const anchor = Array.from(element.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Ver página pública',
    )!;
    expect(anchor.getAttribute('href')).toBe(link);
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener');

    button(element, 'Despublicar').click();
    await fixture.whenStable();

    expect(unpublish).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(draft);
  });

  it('copies the link', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture, element } = setup(published);

    button(element, 'Copiar enlace').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(link);
    expect(element.textContent).toContain('Enlace copiado');
  });

  it('falls back when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const { fixture, element } = setup(published);

    button(element, 'Copiar enlace').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('No se pudo copiar. Copia el enlace a mano.');
  });

  it('falls back when the clipboard rejects', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('denied')));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture, element } = setup(published);

    button(element, 'Copiar enlace').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('No se pudo copiar. Copia el enlace a mano.');
  });

  it('shows the API error', async () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: { code: 'event_date_required', message: 'x' },
    });
    const { fixture, element, changed } = setup(draft, { publish: () => Promise.reject(error) });

    button(element, 'Publicar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Añade la fecha para poder publicar.',
    );
    expect(changed).not.toHaveBeenCalled();
  });
});
