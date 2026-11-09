import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventLocationListComponent } from './event-location-list.component';
import { eventMapUrl } from './event-map';
import { PublicEventLocation } from './event.models';

const ceremony: PublicEventLocation = {
  label: 'Ceremonia',
  venue_name: 'Iglesia',
  address: 'Calle Mayor 1',
  position: 0,
  start_time: '17:00:00',
};
const party: PublicEventLocation = {
  label: 'Celebración',
  venue_name: 'Finca',
  address: 'Camino 2',
  position: 1,
  start_time: null,
};

function render(locations: PublicEventLocation[]): HTMLElement {
  const fixture: ComponentFixture<EventLocationListComponent> = TestBed.createComponent(
    EventLocationListComponent,
  );
  fixture.componentRef.setInput('locations', locations);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('EventLocationListComponent', () => {
  it('shows label with time, venue and address', () => {
    const text = render([ceremony]).textContent;
    expect(text).toContain('Ceremonia, 17:00');
    expect(text).toContain('Iglesia');
    expect(text).toContain('Calle Mayor 1');
  });

  it('shows the label alone without a time', () => {
    const text = render([party]).textContent;
    expect(text).toContain('Celebración');
    expect(text).not.toContain('Celebración,');
  });

  it('links each place to the map', () => {
    const anchor = render([ceremony]).querySelector('a')!;
    expect(anchor.getAttribute('href')).toBe(eventMapUrl('Iglesia', 'Calle Mayor 1'));
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toBe('noopener');
  });

  it('keeps the given order', () => {
    const items = render([party, ceremony]).querySelectorAll('li');
    expect(items[0].textContent).toContain('Celebración');
    expect(items[1].textContent).toContain('Ceremonia');
  });
});
