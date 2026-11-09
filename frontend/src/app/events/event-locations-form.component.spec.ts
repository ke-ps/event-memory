import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { EventApiService } from './event-api.service';
import { EventLocationsFormComponent } from './event-locations-form.component';
import { EventLocation, EventRead } from './event.models';

function location(label: string, startTime: string | null = null): EventLocation {
  return {
    id: `id-${label}`,
    label,
    venue_name: `Sitio ${label}`,
    address: `Calle ${label}, 1`,
    position: 0,
    start_time: startTime,
  };
}

function eventWith(locations: EventLocation[]): EventRead {
  return {
    id: 'event-1',
    event_type: 'wedding',
    title: 'Ana y Luis',
    slug: 'ana-y-luis',
    status: 'draft',
    event_date: null,
    start_time: null,
    timezone: 'Europe/Madrid',
    details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
    locations,
    created_at: '2026-11-05T10:00:00Z',
    updated_at: '2026-11-05T10:00:00Z',
  };
}

const twoLocations = [location('Ceremonia', '17:00:00'), location('Banquete')];

function setup(
  locations = twoLocations,
  updateLocations = vi.fn((): Promise<EventRead> => Promise.resolve(eventWith(locations))),
) {
  TestBed.configureTestingModule({
    providers: [{ provide: EventApiService, useValue: { updateLocations } }],
  });
  const fixture = TestBed.createComponent(EventLocationsFormComponent);
  fixture.componentRef.setInput('event', eventWith(locations));
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, updateLocations, component: fixture.componentInstance };
}

function fill(element: HTMLElement, id: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function value(element: HTMLElement, id: string) {
  return element.querySelector<HTMLInputElement>(`#${id}`)!.value;
}

function button(scope: ParentNode, text: string) {
  return Array.from(scope.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text),
  ) as HTMLButtonElement;
}

function row(element: HTMLElement, index: number) {
  return element.querySelectorAll('.location-row')[index];
}

function rejectWith(errors: { field: string; code: string }[]) {
  return vi.fn(() =>
    Promise.reject(new HttpErrorResponse({ status: 422, error: { code: 'invalid', errors } })),
  );
}

describe('EventLocationsFormComponent', () => {
  it('prefills the rows from the event', () => {
    const { element } = setup();

    expect(value(element, 'location-label-0')).toBe('Ceremonia');
    expect(value(element, 'location-venue-0')).toBe('Sitio Ceremonia');
    expect(value(element, 'location-address-0')).toBe('Calle Ceremonia, 1');
    expect(value(element, 'location-time-0')).toBe('17:00');
    expect(value(element, 'location-time-1')).toBe('');
  });

  it('starts with one empty row without locations', () => {
    const { element } = setup([]);

    expect(element.querySelectorAll('.location-row').length).toBe(1);
    expect(value(element, 'location-label-0')).toBe('');
  });

  it('adds rows up to 10', () => {
    const { fixture, element } = setup([]);

    for (let i = 0; i < 9; i++) {
      button(element, 'Añadir lugar').click();
      fixture.detectChanges();
    }

    expect(element.querySelectorAll('.location-row').length).toBe(10);
    expect(button(element, 'Añadir lugar').disabled).toBe(true);
  });

  it('removes a row', () => {
    const { fixture, element } = setup();

    button(row(element, 0), 'Quitar').click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.location-row').length).toBe(1);
    expect(value(element, 'location-label-0')).toBe('Banquete');
  });

  it('moves a row up and down', () => {
    const { fixture, element } = setup();

    expect(button(row(element, 0), 'Subir').disabled).toBe(true);
    expect(button(row(element, 1), 'Bajar').disabled).toBe(true);

    button(row(element, 0), 'Bajar').click();
    fixture.detectChanges();
    expect(value(element, 'location-label-0')).toBe('Banquete');
    expect(value(element, 'location-label-1')).toBe('Ceremonia');
    expect(value(element, 'location-time-1')).toBe('17:00');

    button(row(element, 1), 'Subir').click();
    fixture.detectChanges();
    expect(value(element, 'location-label-0')).toBe('Ceremonia');
  });

  it('requires the text fields', async () => {
    const { fixture, element, updateLocations, component } = setup();

    fill(element, 'location-label-0', '   ');
    fixture.detectChanges();
    await component.submit();
    fixture.detectChanges();

    expect(updateLocations).not.toHaveBeenCalled();
    expect(element.querySelector('#location-label-0-error')?.textContent).toBeTruthy();
  });

  it('sends the rows in the visible order', async () => {
    const { fixture, element, updateLocations, component } = setup();
    let saved: EventRead | undefined;
    component.saved.subscribe((event) => (saved = event));

    button(row(element, 0), 'Bajar').click();
    fixture.detectChanges();
    fill(element, 'location-label-0', '  Banquete  ');
    await component.submit();

    expect(updateLocations).toHaveBeenCalledWith({
      locations: [
        {
          label: 'Banquete',
          venue_name: 'Sitio Banquete',
          address: 'Calle Banquete, 1',
          start_time: null,
        },
        {
          label: 'Ceremonia',
          venue_name: 'Sitio Ceremonia',
          address: 'Calle Ceremonia, 1',
          start_time: '17:00',
        },
      ],
    });
    expect(saved).toBeDefined();
  });

  it('allows saving an empty list', async () => {
    const { fixture, element, updateLocations, component } = setup([location('Ceremonia')]);

    button(row(element, 0), 'Quitar').click();
    fixture.detectChanges();
    await component.submit();

    expect(updateLocations).toHaveBeenCalledWith({ locations: [] });
  });

  it('shows a server error under its row and field', async () => {
    const { fixture, element, component } = setup(
      twoLocations,
      rejectWith([{ field: 'locations.1.address', code: 'string_too_long' }]),
    );

    await component.submit();
    fixture.detectChanges();

    expect(element.querySelector('#location-address-1-error')?.textContent).toBeTruthy();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('clears server errors when the list changes', async () => {
    const { fixture, element, component } = setup(
      twoLocations,
      rejectWith([{ field: 'locations.1.address', code: 'string_too_long' }]),
    );
    await component.submit();
    fixture.detectChanges();

    button(row(element, 0), 'Bajar').click();
    fixture.detectChanges();

    expect(element.querySelector('#location-address-1-error')).toBeNull();
  });

  it('shows the general message for a non-field error', async () => {
    const { fixture, element, component } = setup(
      twoLocations,
      rejectWith([{ field: 'locations', code: 'too_long' }]),
    );

    await component.submit();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('sends only once while saving', async () => {
    let resolve!: (event: EventRead) => void;
    const updateLocations = vi.fn(() => new Promise<EventRead>((r) => (resolve = r)));
    const { fixture, element, component } = setup(twoLocations, updateLocations);

    button(element, 'Guardar').click();
    fixture.detectChanges();
    button(element, 'Guardando').click();
    void component.submit();
    fixture.detectChanges();

    expect(button(element, 'Guardando').disabled).toBe(true);
    expect(updateLocations).toHaveBeenCalledTimes(1);
    resolve(eventWith(twoLocations));
    await fixture.whenStable();
  });

  it('disables cancel and the row buttons while saving', async () => {
    let resolve!: (event: EventRead) => void;
    const updateLocations = vi.fn(() => new Promise<EventRead>((r) => (resolve = r)));
    const { fixture, element } = setup(twoLocations, updateLocations);

    button(element, 'Guardar').click();
    fixture.detectChanges();

    expect(button(element, 'Cancelar').disabled).toBe(true);
    expect(button(element, 'Añadir lugar').disabled).toBe(true);
    expect(button(row(element, 0), 'Bajar').disabled).toBe(true);
    expect(button(row(element, 1), 'Subir').disabled).toBe(true);
    expect(button(row(element, 0), 'Quitar').disabled).toBe(true);
    resolve(eventWith(twoLocations));
    await fixture.whenStable();
  });

  it('clears the general error when the list changes', async () => {
    const { fixture, element, component } = setup(
      twoLocations,
      rejectWith([{ field: 'locations', code: 'too_long' }]),
    );
    await component.submit();
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')).not.toBeNull();

    button(row(element, 0), 'Bajar').click();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('cancel emits cancelled without calling the API', () => {
    const { element, updateLocations, component } = setup();
    let cancelled = 0;
    component.cancelled.subscribe(() => cancelled++);

    button(element, 'Cancelar').click();

    expect(cancelled).toBe(1);
    expect(updateLocations).not.toHaveBeenCalled();
  });
});
