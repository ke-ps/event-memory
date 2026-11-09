export interface WeddingDetails {
  partner_one_name: string;
  partner_two_name: string;
  welcome_text?: string | null;
  story?: string | null;
}

export interface EventLocation {
  id: string;
  label: string;
  venue_name: string;
  address: string;
  position: number;
  start_time: string | null;
}

/** A place as guests see it: the owner's `id` is not exposed. */
export type PublicEventLocation = Omit<EventLocation, 'id'>;

export type EventLocationWrite = Pick<
  EventLocation,
  'label' | 'venue_name' | 'address' | 'start_time'
>;

export interface EventLocationsUpdateRequest {
  locations: EventLocationWrite[];
}

export interface EventRead {
  id: string;
  event_type: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  event_date: string | null;
  start_time: string | null;
  timezone: string;
  details: WeddingDetails;
  locations: EventLocation[];
  created_at: string;
  updated_at: string;
}

export interface EventCreateRequest {
  event_type: 'wedding';
  details: WeddingDetails;
  event_date: string | null;
}

export interface EventUpdateRequest {
  title: string | null;
  slug: string;
  details: WeddingDetails;
  event_date: string | null;
  start_time: string | null;
}

export interface PublicEvent {
  event_type: string;
  title: string;
  slug: string;
  event_date: string | null;
  start_time: string | null;
  timezone: string;
  details: WeddingDetails;
  locations: PublicEventLocation[];
}
