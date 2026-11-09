import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { eventMapUrl } from './event-map';
import { eventTimeSuffix } from './event-time';
import { PublicEventLocation } from './event.models';

@Component({
  selector: 'app-event-location-list',
  standalone: true,
  template: `
    <ul>
      @for (location of locations(); track $index) {
        <li>
          <strong>{{ location.label + timeSuffix(location.start_time) }}</strong>
          <span>{{ location.venue_name }}</span>
          <span>{{ location.address }}</span>
          <a
            [href]="mapUrl(location.venue_name, location.address)"
            target="_blank"
            rel="noopener"
            i18n="@@events.locations.map"
            >Ver en el mapa</a
          >
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      display: flex;
      flex-direction: column;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventLocationListComponent {
  readonly locations = input.required<PublicEventLocation[]>();
  readonly timeSuffix = eventTimeSuffix;
  readonly mapUrl = eventMapUrl;
}
