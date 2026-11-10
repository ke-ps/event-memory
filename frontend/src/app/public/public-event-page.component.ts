import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { apiErrorMessage } from '../core/api-error-messages';
import { EventLocationListComponent } from '../events/event-location-list.component';
import { eventTimeSuffix } from '../events/event-time';
import { PublicEvent } from '../events/event.models';
import { PublicEventApiService } from './public-event-api.service';

@Component({
  selector: 'app-public-event-page',
  standalone: true,
  imports: [DatePipe, EventLocationListComponent],
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
            @if (current.details.welcome_text; as welcome) {
              <p class="free-text">{{ welcome }}</p>
            }
            @if (current.locations.length > 0) {
              <app-event-location-list [locations]="current.locations" />
            }
            @if (current.details.story; as story) {
              <p class="free-text">{{ story }}</p>
            }
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
    .free-text {
      white-space: pre-line;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicEventPageComponent {
  private readonly api = inject(PublicEventApiService);
  private readonly route = inject(ActivatedRoute);
  private slug = '';
  readonly state = signal<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  readonly event = signal<PublicEvent | null>(null);
  readonly errorMessage = signal('');

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.slug = params.get('slug') ?? '';
      void this.load();
    });
  }

  async load(): Promise<void> {
    const slug = this.slug;
    this.state.set('loading');
    try {
      const event = await this.api.get(slug);
      if (slug !== this.slug) return;
      this.event.set(event);
      this.state.set(event ? 'ready' : 'unavailable');
    } catch (error) {
      if (slug !== this.slug) return;
      this.errorMessage.set(apiErrorMessage(error));
      this.state.set('error');
    }
  }

  suffix(event: PublicEvent): string {
    return eventTimeSuffix(event.start_time);
  }
}
