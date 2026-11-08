import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { PublicEvent } from '../events/event.models';
import { PublicEventApiService } from './public-event-api.service';

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

describe('PublicEventApiService', () => {
  let service: PublicEventApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicEventApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('requests the public URL without Authorization', async () => {
    const promise = service.get('ana-y-luis');
    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/public/events/ana-y-luis`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(publicEvent);
    expect(await promise).toEqual(publicEvent);
  });

  it('returns null on 404', async () => {
    const promise = service.get('nope');
    httpTesting
      .expectOne(`${environment.apiBaseUrl}/public/events/nope`)
      .flush({ detail: 'event_not_found' }, { status: 404, statusText: 'Not Found' });
    expect(await promise).toBeNull();
  });

  it('rethrows other errors', async () => {
    const promise = service.get('x');
    httpTesting
      .expectOne(`${environment.apiBaseUrl}/public/events/x`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await expect(promise).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});
