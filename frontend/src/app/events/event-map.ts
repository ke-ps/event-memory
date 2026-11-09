const MAP_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

export function eventMapUrl(venueName: string, address: string): string {
  return MAP_SEARCH_URL + encodeURIComponent(`${venueName}, ${address}`);
}
