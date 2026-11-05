import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EventRead } from './event.models';

@Component({
  selector: 'app-event-summary',
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="summary" aria-labelledby="event-title">
      <h2 id="event-title">{{ event().title }}</h2>
      <p>
        @if (event().event_date; as date) {
          {{ date | date: 'longDate' }}
        } @else {
          <ng-container i18n="@@events.summary.dateTbd">Fecha por decidir</ng-container>
        }
      </p>
      <p>
        @if (event().status === 'published') {
          <ng-container i18n="@@events.summary.status.published">Publicado</ng-container>
        } @else {
          <ng-container i18n="@@events.summary.status.draft">Borrador</ng-container>
        }
      </p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      font-family: Georgia, serif;
      font-size: 1.5rem;
      font-weight: 400;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventSummaryComponent {
  readonly event = input.required<EventRead>();
}
