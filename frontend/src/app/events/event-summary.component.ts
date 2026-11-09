import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { EventRead } from './event.models';
import { EventLocationListComponent } from './event-location-list.component';
import { EventPublicationComponent } from './event-publication.component';
import { eventTimeSuffix } from './event-time';

@Component({
  selector: 'app-event-summary',
  standalone: true,
  imports: [DatePipe, EventLocationListComponent, EventPublicationComponent],
  template: `
    <section class="summary" aria-labelledby="event-title">
      <h2 id="event-title">{{ event().title }}</h2>
      <p>
        @if (event().event_date; as date) {
          {{ (date | date: 'longDate') + timeSuffix() }}
        } @else {
          <ng-container i18n="@@events.summary.dateTbd">Fecha por decidir</ng-container
          >{{ timeSuffix() }}
        }
      </p>
      @if (hasLocations()) {
        <app-event-location-list [locations]="event().locations" />
      } @else {
        <p i18n="@@events.locations.empty">Todavía no habéis añadido lugares</p>
      }
      <button type="button" (click)="editLocations.emit()">
        @if (hasLocations()) {
          <ng-container i18n="@@events.locations.edit">Editar lugares</ng-container>
        } @else {
          <ng-container i18n="@@events.locations.addPlaces">Añadir lugares</ng-container>
        }
      </button>
      <app-event-publication [event]="event()" (changed)="changed.emit($event)" />
      <button type="button" (click)="edit.emit()" i18n="@@events.summary.edit">Editar</button>
      <button type="button" (click)="remove.emit()" i18n="@@events.summary.delete">
        Eliminar boda
      </button>
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
  readonly changed = output<EventRead>();
  readonly edit = output<void>();
  readonly editLocations = output<void>();
  readonly remove = output<void>();
  readonly hasLocations = computed(() => this.event().locations.length > 0);
  readonly timeSuffix = computed(() => eventTimeSuffix(this.event().start_time));
}
