import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { apiErrorMessage } from '../core/api-error-messages';
import { eventTimeSuffix } from '../events/event-time';
import { PublicEvent } from '../events/event.models';
import { PublicEventApiService } from './public-event-api.service';

@Component({
  selector: 'app-public-event-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <main class="public">
      @switch (state()) {
        @case ('loading') {
          <p role="status" i18n="@@public.loading">Cargando…</p>
        }
        @case ('ready') {
          @if (event(); as current) {
            <h1>{{ current.title }}</h1>
            <p>
              @if (current.event_date; as date) {
                {{ (date | date: 'longDate') + suffix(current) }}
              } @else {
                <ng-container i18n="@@public.dateTbd">Fecha por decidir</ng-container
                >{{ suffix(current) }}
              }
            </p>
          }
        }
        @case ('unavailable') {
          <p i18n="@@public.unavailable">Esta página no está disponible.</p>
        }
        @case ('error') {
          <p class="error" role="alert">{{ errorMessage() }}</p>
          <button class="retry" type="button" (click)="load()" i18n="@@public.retry">
            Reintentar
          </button>
        }
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
    }
    .public {
      box-sizing: border-box;
      max-width: 720px;
      margin: 2rem auto;
      padding: 2rem;
      color: #332a28;
      line-height: 1.6;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 2.25rem;
      font-weight: 400;
    }
    .error {
      color: #a12d2d;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicEventPageComponent implements OnInit {
  private readonly api = inject(PublicEventApiService);
  private readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
  readonly state = signal<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  readonly event = signal<PublicEvent | null>(null);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const event = await this.api.get(this.slug);
      this.event.set(event);
      this.state.set(event ? 'ready' : 'unavailable');
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error));
      this.state.set('error');
    }
  }

  suffix(event: PublicEvent): string {
    return eventTimeSuffix(event.start_time);
  }
}
