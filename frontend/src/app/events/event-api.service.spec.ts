import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { EventApiService } from './event-api.service';
import {
  EventCreateRequest,
  EventLocationsUpdateRequest,
  EventRead,
  EventUpdateRequest,
} from './event.models';

const eventRead: EventRead = {
  id: 'id-1',
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

describe('EventApiService', () => {
  const currentUser = signal<unknown>({ getIdToken: () => Promise.resolve('tok') });
  let service: EventApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    currentUser.set({ getIdToken: () => Promise.resolve('tok') });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    service = TestBed.inject(EventApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('posts the request body to /events with the Bearer token', async () => {
    const body: EventCreateRequest = {
      event_type: 'wedding',
      details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
      event_date: '2027-06-12',
    };

    const result = service.create(body);

    const request = await vi.waitFor(() =>
      httpTesting.expectOne(`${environment.apiBaseUrl}/events`),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Authorization')).toBe('Bearer tok');
    request.flush(eventRead);

    await expect(result).resolves.toEqual(eventRead);
  });

  it('puts the update body to /events/me with the Bearer token', async () => {
    const body: EventUpdateRequest = {
      title: 'Nuestra boda',
      slug: 'ana-y-luis',
      details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
      event_date: '2027-06-12',
      start_time: '18:30:00',
    };

    const result = service.update(body);

    const request = await vi.waitFor(() =>
      httpTesting.expectOne(`${environment.apiBaseUrl}/events/me`),
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Authorization')).toBe('Bearer tok');
    request.flush(eventRead);

    await expect(result).resolves.toEqual(eventRead);
  });

  it('puts the locations to /events/me/locations with the Bearer token', async () => {
    const body: EventLocationsUpdateRequest = {
      locations: [
        {
          label: 'Ceremonia',
          venue_name: 'Iglesia',
          address: 'Calle Mayor 1',
          start_time: '17:00',
        },
      ],
    };

    const result = service.updateLocations(body);

    const request = await vi.waitFor(() =>
      httpTesting.expectOne(`${environment.apiBaseUrl}/events/me/locations`),
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Authorization')).toBe('Bearer tok');
    request.flush(eventRead);

    await expect(result).resolves.toEqual(eventRead);
  });

  it('gets the own event from /events/me', async () => {
    const result = service.getMine();

    const request = await vi.waitFor(() =>
      httpTesting.expectOne(`${environment.apiBaseUrl}/events/me`),
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer tok');
    request.flush(eventRead);

    await expect(result).resolves.toEqual(eventRead);
  });

  it('returns null when the user has no event (404)', async () => {
    const result = service.getMine();

    const request = await vi.waitFor(() =>
      httpTesting.expectOne(`${environment.apiBaseUrl}/events/me`),
    );
    request.flush(
      { code: 'event_not_found', message: 'x' },
      { status: 404, statusText: 'Not Found' },
    );

    await expect(result).resolves.toBeNull();
  });

  it('rethrows other errors', async () => {
    const result = service.getMine();

    const request = await vi.waitFor(() =>
      httpTesting.expectOne(`${environment.apiBaseUrl}/events/me`),
    );
    request.flush({ code: 'x', message: 'x' }, { status: 500, statusText: 'Server Error' });

    await expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('rejects with not_authenticated when there is no user', async () => {
    currentUser.set(null);

    await expect(service.getMine()).rejects.toThrow('not_authenticated');
    await expect(
      service.create({
        event_type: 'wedding',
        details: { partner_one_name: 'A', partner_two_name: 'B' },
        event_date: null,
      }),
    ).rejects.toThrow('not_authenticated');
  });

  it('deletes /events/me with the Bearer token', async () => {
    const result = service.deleteMine();

    const request = await vi.waitFor(() =>
      httpTesting.expectOne(`${environment.apiBaseUrl}/events/me`),
    );
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('Authorization')).toBe('Bearer tok');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(result).resolves.toBeUndefined();
  });

  it.each([['publish'], ['unpublish']] as const)(
    '%s posts an empty body with the Bearer token',
    async (action) => {
      const result = service[action]();

      const request = await vi.waitFor(() =>
        httpTesting.expectOne(`${environment.apiBaseUrl}/events/me/${action}`),
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.headers.get('Authorization')).toBe('Bearer tok');
      request.flush(eventRead);

      await expect(result).resolves.toEqual(eventRead);
    },
  );
});
