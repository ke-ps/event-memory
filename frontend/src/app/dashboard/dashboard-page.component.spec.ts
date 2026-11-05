import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { EventApiService } from '../events/event-api.service';
import { EventCreateFormComponent } from '../events/event-create-form.component';
import { EventRead } from '../events/event.models';
import { AuthService } from '../services/auth.service';
import { DashboardPageComponent } from './dashboard-page.component';

const event: EventRead = {
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

async function setup(getMine: () => Promise<EventRead | null>) {
  const getMineMock = vi.fn(getMine);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { currentUser: signal({ email: 'a@b.c' }) } },
      { provide: EventApiService, useValue: { getMine: getMineMock, create: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(DashboardPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, getMine: getMineMock };
}

function text(fixture: ComponentFixture<DashboardPageComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('DashboardPageComponent', () => {
  it('shows the create form when the user has no event', async () => {
    const { fixture } = await setup(() => Promise.resolve(null));

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-event-create-form'),
    ).not.toBeNull();
  });

  it('shows the summary when the user has an event', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));

    expect(text(fixture)).toContain('Ana y Luis');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-event-create-form'),
    ).toBeNull();
  });

  it('shows the error and retries loading the event', async () => {
    const { fixture, getMine } = await setup(() =>
      Promise.reject(new HttpErrorResponse({ status: 0 })),
    );

    expect(text(fixture)).toContain('No se pudo conectar con el servidor');
    const retry = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button.retry',
    )!;
    retry.click();
    await fixture.whenStable();

    expect(getMine).toHaveBeenCalledTimes(2);
  });

  it('shows the summary after the form emits created', async () => {
    const { fixture } = await setup(() => Promise.resolve(null));

    fixture.debugElement
      .query((node) => node.componentInstance instanceof EventCreateFormComponent)
      .componentInstance.created.emit(event);
    fixture.detectChanges();

    expect(text(fixture)).toContain('Ana y Luis');
  });
});
