import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { HealthService } from './services/health.service';

type BackendStatus = 'checking' | 'connected' | 'unavailable';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main>
      <p class="eyebrow">Event Memory</p>
      <h1>Los recuerdos de vuestro día, en un solo lugar.</h1>
      <p class="intro">
        Estamos preparando un espacio para compartir la información y las fotos
        de cada celebración.
      </p>
      <section class="connection" aria-labelledby="connection-title">
        <h2 id="connection-title">Conexión con el backend</h2>
        <p class="status" role="status" aria-live="polite">
          @if (backendStatus() === 'checking') {
            Comprobando la conexión…
          } @else if (backendStatus() === 'connected') {
            Backend conectado correctamente.
          } @else {
            No se pudo conectar con el backend. Comprueba que esté en marcha y vuelve a intentarlo.
          }
        </p>
        <button
          type="button"
          (click)="checkBackend()"
          [disabled]="backendStatus() === 'checking'"
        >
          {{ backendStatus() === 'checking' ? 'Comprobando…' : 'Comprobar de nuevo' }}
        </button>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; }
    main {
      box-sizing: border-box;
      display: grid;
      align-content: center;
      min-height: 100vh;
      max-width: 760px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }
    .eyebrow {
      color: #8b5e52;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 680px;
      margin: 0.5rem 0 1rem;
      color: #332a28;
      font-family: Georgia, serif;
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 400;
      line-height: 1.05;
    }
    .intro { max-width: 540px; color: #665c58; font-size: 1.125rem; line-height: 1.7; }
    .connection {
      max-width: 540px;
      margin-top: 2rem;
      padding: 1.25rem;
      border: 1px solid #ded5cb;
      border-radius: 12px;
      background: #fffdf9;
    }
    h2 { margin: 0; color: #332a28; font-size: 1rem; }
    .status { min-height: 1.5em; color: #665c58; line-height: 1.5; }
    button {
      padding: 0.65rem 0.9rem;
      border: 0;
      border-radius: 6px;
      background: #8b5e52;
      color: white;
      cursor: pointer;
      font: inherit;
    }
    button:disabled { cursor: wait; opacity: 0.65; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  readonly backendStatus = signal<BackendStatus>('checking');

  ngOnInit(): void {
    this.checkBackend();
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
