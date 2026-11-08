import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { HealthService } from './services/health.service';

@Component({ standalone: true, template: '' })
class DummyComponent {}

async function setup(url: string) {
  const check = vi.fn(() => of({ status: 'ok' }));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', component: DummyComponent },
        { path: 'e/:slug', component: DummyComponent },
      ]),
      { provide: HealthService, useValue: { check } },
    ],
  });
  const fixture = TestBed.createComponent(AppComponent);
  await TestBed.inject(Router).navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, check };
}

describe('AppComponent', () => {
  it('shows the backend connection section on the home route', async () => {
    const { fixture, check } = await setup('/');

    expect((fixture.nativeElement as HTMLElement).querySelector('.connection')).not.toBeNull();
    expect(check).toHaveBeenCalled();
  });

  it('hides the backend connection section on a public page', async () => {
    const { fixture, check } = await setup('/e/ana-y-luis');

    expect((fixture.nativeElement as HTMLElement).querySelector('.connection')).toBeNull();
    expect(check).not.toHaveBeenCalled();
  });
});
