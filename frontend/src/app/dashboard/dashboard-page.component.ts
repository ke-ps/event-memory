import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../core/api-error-messages';
import { EventApiService } from '../events/event-api.service';
import { EventCreateFormComponent } from '../events/event-create-form.component';
import { EventDeleteConfirmComponent } from '../events/event-delete-confirm.component';
import { EventEditFormComponent } from '../events/event-edit-form.component';
import { EventSummaryComponent } from '../events/event-summary.component';
import { EventRead } from '../events/event.models';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    EventCreateFormComponent,
    EventDeleteConfirmComponent,
    EventEditFormComponent,
    EventSummaryComponent,
  ],
  template: `
    <main class="dashboard" aria-labelledby="dashboard-title">
      <p class="eyebrow">Event Memory</p>
      <h1 id="dashboard-title" i18n="@@dashboard.title">Tu espacio</h1>
      <p i18n="@@dashboard.signedInAs">
        Has iniciado sesión como {{ authService.currentUser()?.email }}.
      </p>
      <p i18n="@@dashboard.intro">
        Desde aquí podrás gestionar tu evento. Esta sección se irá construyendo en los siguientes
        pasos.
      </p>
      @switch (state()) {
        @case ('loading') {
          <p role="status" i18n="@@events.dashboard.loading">Cargando tu boda…</p>
        }
        @case ('empty') {
          <app-event-create-form (created)="onCreated($event)" />
        }
        @case ('ready') {
          @if (event(); as currentEvent) {
            <app-event-summary
              [event]="currentEvent"
              (edit)="state.set('editing')"
              (remove)="state.set('confirmingDelete')"
            />
          }
        }
        @case ('confirmingDelete') {
          <app-event-delete-confirm (deleted)="onDeleted()" (cancelled)="state.set('ready')" />
        }
        @case ('editing') {
          @if (event(); as currentEvent) {
            <app-event-edit-form
              [event]="currentEvent"
              (saved)="onSaved($event)"
              (cancelled)="state.set('ready')"
            />
          }
        }
        @case ('error') {
          <p class="error" role="alert">{{ errorMessage() }}</p>
          <button class="retry" type="button" (click)="loadEvent()" i18n="@@events.dashboard.retry">
            Reintentar
          </button>
        }
      }
      <a routerLink="/" i18n="@@dashboard.backToAccount">Volver a mi cuenta</a>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }
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
    .eyebrow {
      color: #8b5e52;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 2.25rem;
      font-weight: 400;
    }
    a {
      color: #70473d;
    }
    .error {
      color: #a12d2d;
    }
    .retry {
      padding: 0.75rem 1rem;
      border: 0;
      border-radius: 6px;
      background: #8b5e52;
      color: white;
      cursor: pointer;
      font: inherit;
    }
    @media (max-width: 520px) {
      .dashboard {
        margin: 1rem 0;
        padding: 1.25rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private readonly eventApi = inject(EventApiService);
  readonly authService = inject(AuthService);
  readonly state = signal<'loading' | 'empty' | 'ready' | 'editing' | 'confirmingDelete' | 'error'>(
    'loading',
  );
  readonly event = signal<EventRead | null>(null);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    void this.loadEvent();
  }

  async loadEvent(): Promise<void> {
    this.state.set('loading');
    try {
      const event = await this.eventApi.getMine();
      this.event.set(event);
      this.state.set(event ? 'ready' : 'empty');
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error));
      this.state.set('error');
    }
  }

  onCreated(event: EventRead): void {
    this.event.set(event);
    this.state.set('ready');
  }

  onSaved(event: EventRead): void {
    this.event.set(event);
    this.state.set('ready');
  }

  onDeleted(): void {
    this.event.set(null);
    this.state.set('empty');
  }
}
