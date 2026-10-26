import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="dashboard" aria-labelledby="dashboard-title">
      <p class="eyebrow">Event Memory</p>
      <h1 id="dashboard-title">Tu espacio</h1>
      <p>Has iniciado sesión como {{ authService.currentUser()?.email }}.</p>
      <p>Desde aquí podrás gestionar tu evento. Esta sección se irá construyendo en los siguientes pasos.</p>
      <a routerLink="/">Volver a mi cuenta</a>
    </main>
  `,
  styles: `
    :host { display: block; }
    .dashboard {
      box-sizing: border-box;
      max-width: 720px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #ded5cb;
      border-radius: 14px;
      background: #fffdf9;
      color: #332a28;
      line-height: 1.6;
    }
    .eyebrow { color: #8b5e52; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { font-family: Georgia, serif; font-size: 2.25rem; font-weight: 400; }
    a { color: #70473d; }
    @media (max-width: 520px) { .dashboard { margin: 1rem 0; padding: 1.25rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly authService = inject(AuthService);
}
