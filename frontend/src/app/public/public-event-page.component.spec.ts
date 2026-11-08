import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'ana-y-luis' }) } },
      },
      { provide: PublicEventApiService, useValue: { get: getMock } },
    ],
  });
  const fixture = TestBed.createComponent(PublicEventPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, get: getMock };
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
});
