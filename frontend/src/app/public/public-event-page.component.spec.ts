import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { PublicEvent } from '../events/event.models';
import { PublicEventApiService } from './public-event-api.service';
import { PublicEventPageComponent } from './public-event-page.component';

const publicEvent: PublicEvent = {
  event_type: 'wedding',
  title: 'Ana y Luis',
  slug: 'ana-y-luis',
  event_date: '2027-06-12',
  start_time: '18:30:00',
  timezone: 'Europe/Madrid',
  details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
  locations: [],
};

async function setup(get: () => Promise<PublicEvent | null>) {
  const getMock = vi.fn(get);
  const params = new BehaviorSubject(convertToParamMap({ slug: 'ana-y-luis' }));
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { paramMap: params },
      },
      { provide: PublicEventApiService, useValue: { get: getMock } },
    ],
  });
  const fixture = TestBed.createComponent(PublicEventPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, get: getMock, params };
}

function text(fixture: ComponentFixture<PublicEventPageComponent>): string {
  return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('PublicEventPageComponent', () => {
  it('shows the title and date of a published wedding', async () => {
    const { fixture, get } = await setup(() => Promise.resolve(publicEvent));

    expect(get).toHaveBeenCalledWith('ana-y-luis');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Ana y Luis',
    );
    expect(text(fixture)).toContain('12 de junio de 2027, 18:30');
  });

  it('shows unavailable when the API returns null', async () => {
    const { fixture } = await setup(() => Promise.resolve(null));

    expect(text(fixture)).toContain('Esta página no está disponible.');
  });

  it('shows the error and retries', async () => {
    const { fixture, get } = await setup(() =>
      Promise.reject(new HttpErrorResponse({ status: 0 })),
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();

    get.mockResolvedValueOnce(publicEvent);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button.retry')!
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(get).toHaveBeenCalledTimes(2);
    expect(text(fixture)).toContain('Ana y Luis');
  });

  it('reloads when the slug param changes', async () => {
    const { fixture, get, params } = await setup(() => Promise.resolve(publicEvent));

    params.next(convertToParamMap({ slug: 'otra-boda' }));
    await fixture.whenStable();

    expect(get).toHaveBeenLastCalledWith('otra-boda');
  });

  it('ignores a stale response after the slug changes', async () => {
    let resolveA!: (event: PublicEvent) => void;
    const eventB = { ...publicEvent, title: 'Boda B', slug: 'b' };
    const { fixture, get, params } = await setup(
      () =>
        new Promise<PublicEvent>((resolve) => {
          resolveA = resolve;
        }),
    );

    get.mockResolvedValueOnce(eventB);
    params.next(convertToParamMap({ slug: 'b' }));
    await fixture.whenStable();
    fixture.detectChanges();
    resolveA({ ...publicEvent, title: 'Boda A', slug: 'a' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Boda B');
    expect(text(fixture)).not.toContain('Boda A');
  });
});
