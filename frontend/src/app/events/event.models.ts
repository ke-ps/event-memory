export interface WeddingDetails {
  partner_one_name: string;
  partner_two_name: string;
}

export interface EventLocation {
  id: string;
  label: string;
  venue_name: string;
  address: string;
  position: number;
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
