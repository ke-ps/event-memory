import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { HealthService } from './services/health.service';

type BackendStatus = 'checking' | 'connected' | 'unavailable';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main>
      <router-outlet />
      @if (showConnection()) {
        <section class="connection" aria-labelledby="connection-title">
          <h2 id="connection-title" i18n="@@connection.title">Conexión con el backend</h2>
          <p class="status" role="status" aria-live="polite">
            @if (backendStatus() === 'checking') {
              <ng-container i18n="@@connection.checking">Comprobando la conexión…</ng-container>
            } @else if (backendStatus() === 'connected') {
              <ng-container i18n="@@connection.connected"
                >Backend conectado correctamente.</ng-container
              >
            } @else {
              <ng-container i18n="@@connection.unavailable">
                No se pudo conectar con el backend. Comprueba que esté en marcha y vuelve a
                intentarlo.
              </ng-container>
            }
          </p>
          <button
            type="button"
            (click)="checkBackend()"
            [disabled]="backendStatus() === 'checking'"
          >
            @if (backendStatus() === 'checking') {
              <ng-container i18n="@@connection.checkingShort">Comprobando…</ng-container>
            } @else {
              <ng-container i18n="@@connection.retry">Comprobar de nuevo</ng-container>
            }
          </button>
        </section>
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
    }
    main {
      box-sizing: border-box;
      display: grid;
      align-content: center;
      min-height: 100vh;
      max-width: 760px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }
    .connection {
      max-width: 540px;
      margin-top: 2rem;
      padding: 1.25rem;
      border: 1px solid #ded5cb;
      border-radius: 12px;
      background: #fffdf9;
    }
    h2 {
      margin: 0;
      color: #332a28;
      font-size: 1rem;
    }
    .status {
      min-height: 1.5em;
      color: #665c58;
      line-height: 1.5;
    }
    button {
      padding: 0.65rem 0.9rem;
      border: 0;
      border-radius: 6px;
      background: #8b5e52;
      color: white;
      cursor: pointer;
      font: inherit;
    }
    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly healthService = inject(HealthService);
  private readonly router = inject(Router);
  private readonly currentUrl = signal<string | null>(null);
  readonly backendStatus = signal<BackendStatus>('checking');
  readonly showConnection = () => {
    const url = this.currentUrl();
    return url !== null && !url.startsWith('/e/');
  };

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
    effect(() => {
      if (this.showConnection()) {
        untracked(() => this.checkBackend());
      }
    });
  }

  checkBackend(): void {
    this.backendStatus.set('checking');
    this.healthService.check().subscribe({
      next: (response) => {
        this.backendStatus.set(response.status === 'ok' ? 'connected' : 'unavailable');
      },
      error: () => this.backendStatus.set('unavailable'),
    });
  }
}
