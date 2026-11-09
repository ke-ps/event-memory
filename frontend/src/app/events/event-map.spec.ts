import { eventMapUrl } from './event-map';

describe('eventMapUrl', () => {
  it('encodes the venue and the address', () => {
    expect(eventMapUrl('Finca Ñandú', 'Calle Álamo 1 & 2, #3/B')).toBe(
      'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('Finca Ñandú, Calle Álamo 1 & 2, #3/B'),
    );
  });
});
