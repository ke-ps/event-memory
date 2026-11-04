import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends the identity token as a Bearer header and returns the identity', async () => {
    const identity = { uid: 'user-123', email: 'pareja@example.com' };

    const result = service.verifyIdentity('id-token');

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/auth/me`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer id-token');
    request.flush(identity);

    await expect(result).resolves.toEqual(identity);
  });
});
