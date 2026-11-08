import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import type { User } from 'firebase/auth';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

function setup(user: User | null) {
  const fakeAuthService = {
    currentUser: signal<User | null>(user),
    waitForInitialAuthState: vi.fn(() => Promise.resolve(user)),
  };

  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: fakeAuthService }],
  });

  return fakeAuthService;
}

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('authGuard', () => {
  it('allows access when the user is authenticated', async () => {
    const authService = setup({ uid: 'user-123' } as User);

    await expect(runGuard()).resolves.toBe(true);
    expect(authService.waitForInitialAuthState).toHaveBeenCalled();
  });

  it('redirects to the home page when the user is not authenticated', async () => {
    setup(null);

    const result = await runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });
});
