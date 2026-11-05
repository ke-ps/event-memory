import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { EventCreateFormComponent } from './event-create-form.component';
import { EventApiService } from './event-api.service';
import { EventRead } from './event.models';

const createdEvent: EventRead = {
  id: 'event-1',
  event_type: 'wedding',
  title: 'Ana y Luis',
  slug: 'ana-y-luis',
  status: 'draft',
  event_date: null,
  start_time: null,
  timezone: 'Europe/Madrid',
  details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
  locations: [],
  created_at: '2026-11-05T10:00:00Z',
  updated_at: '2026-11-05T10:00:00Z',
};

function setup(create = vi.fn(() => Promise.resolve(createdEvent))) {
  TestBed.configureTestingModule({
    providers: [{ provide: EventApiService, useValue: { create } }],
  });
  const fixture = TestBed.createComponent(EventCreateFormComponent);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, create, component: fixture.componentInstance };
}

function fill(element: HTMLElement, id: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submitButton(element: HTMLElement) {
  return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
}

describe('EventCreateFormComponent', () => {
  it('disables submit when the form is empty', () => {
    const { element } = setup();

    expect(submitButton(element).disabled).toBe(true);
  });

  it('treats whitespace-only names as invalid', () => {
    const { fixture, element } = setup();

    fill(element, 'partner-one', '   ');
    fill(element, 'partner-two', 'Luis');
    fixture.detectChanges();

    expect(submitButton(element).disabled).toBe(true);
  });

  it('creates the wedding without a date and emits created', async () => {
    const { fixture, element, create, component } = setup();
    const emitted: EventRead[] = [];
    component.created.subscribe((event) => emitted.push(event));

    fill(element, 'partner-one', 'Ana');
    fill(element, 'partner-two', 'Luis');
    fixture.detectChanges();
    await component.submit();

    expect(create).toHaveBeenCalledWith({
      event_type: 'wedding',
      details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
      event_date: null,
    });
    expect(emitted).toEqual([createdEvent]);
  });

  it('shows the API field error under the first name input', async () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        code: 'validation_error',
        errors: [{ field: 'details.partner_one_name', code: 'string_too_short' }],
      },
    });
    const { fixture, element, component } = setup(vi.fn(() => Promise.reject(error)));

    fill(element, 'partner-one', 'Ana');
    fill(element, 'partner-two', 'Luis');
    fixture.detectChanges();
    await component.submit();
    fixture.detectChanges();

    const message = element.querySelector('#partner-one-error');
    expect(message?.textContent).toContain('Este campo es obligatorio.');
    expect(element.querySelector('#partner-two-error')).toBeNull();
  });
});
