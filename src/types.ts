import type { CategoryName, LandesverbandName, RadiusKm } from "./constants.js";

/** A date accepted as input: an ISO string (YYYY-MM-DD), a German dd.mm.yyyy string, or a Date. */
export type DateInput = string | Date;

/** Options for {@link RadNet.search}. */
export interface SearchOptions {
  /** Start of the date range (inclusive). Defaults to today. */
  startDate?: DateInput;
  /** End of the date range (inclusive). Defaults to 3 months after the start. */
  endDate?: DateInput;
  /**
   * Event category. Accepts a friendly name ("RTF", "CTF", "Radmarathon", ...),
   * a raw numeric `art` code, or omit / "all" for everything (except permanents).
   */
  category?: CategoryName | number;
  /** Restrict to a single Landesverband, by friendly name or raw numeric code. */
  landesverband?: LandesverbandName | number;
  /** Free-text title filter (matches the portal's `titel` field). */
  title?: string;
  /** Postal code to center a radius search on. Requires {@link radius}. */
  plz?: string;
  /** Radius in km around {@link plz}. One of 20 | 50 | 100 | 200 | 400. */
  radius?: RadiusKm;
  /**
   * Maximum number of result pages to fetch (30 events per page).
   * Defaults to fetching all pages.
   */
  maxPages?: number;
  /** Abort signal forwarded to the underlying fetch calls. */
  signal?: AbortSignal;
}

/** One row from the search-result list (lightweight; no address/contact). */
export interface EventListItem {
  /** Internal rad-net detail id (the digits after `;` in the detail URL). */
  id: string;
  /** URL slug of the event. */
  slug: string;
  /** Normalized type label, e.g. "RTF", "CTF", "Marathon", "Radmarathon-Cup". */
  type: string;
  /** CSS icon class the portal used for this row (raw). */
  iconClass: string;
  /** Event date as ISO string (YYYY-MM-DD). */
  date: string;
  /** German weekday abbreviation shown in the list (Mo, Di, ...). */
  weekday: string;
  /** Event title. */
  title: string;
  /** Offered route distances in km. */
  distances: number[];
  /** Organizing club, as printed (without the trailing LV abbreviation). */
  club: string;
  /** Landesverband abbreviation shown in parentheses after the club (e.g. "NRW"). */
  lvAbbr: string | null;
  /** Absolute URL of the event detail page. */
  detailUrl: string;
  /**
   * True when the row is rendered struck-through. On rad-net this marks events
   * that are cancelled or already past. Fetch the detail page for the reason.
   */
  struckThrough: boolean;
}

/** A single route/distance option with optional profile info from the detail page. */
export interface RouteInfo {
  /** Distance in km. */
  km: number;
  /** Profile description if given (often "unbekannt"). */
  profile: string | null;
  /** Approximate climbing in metres (Höhenmeter), if given. */
  elevation: number | null;
}

/** Parsed start location from the detail page. */
export interface StartLocation {
  street: string | null;
  zip: string | null;
  city: string | null;
  /** Venue / meeting-point name (e.g. "Sportplatz-Sportheim"). */
  venue: string | null;
  /** The raw multi-line address as printed. */
  raw: string;
}

/** Contact person for the event. */
export interface Contact {
  name: string | null;
  phone: string | null;
  email: string | null;
}

/** Full event details from a detail page, extending the list item. */
export interface EventDetail extends Partial<EventListItem> {
  id: string;
  detailUrl: string;
  type: string;
  date: string;
  title: string;
  /** Full organizer name ("Veranstalter"). */
  organizer: string | null;
  /** Full Landesverband name ("Landesverband"). */
  landesverband: string | null;
  distances: number[];
  /** Route-marking description ("Streckenführung"), e.g. "teilweise ausgeschildert". */
  routeMarking: string | null;
  startLocation: StartLocation | null;
  /** Start time window as printed, e.g. "09:00 bis 10:00". */
  startTime: string | null;
  /** "Zusatz" flags, e.g. "M/S" (Marathon / Sternfahrt). */
  addendum: string | null;
  /** Human event number ("Veranst.-Nr."), distinct from {@link id}. */
  eventNumber: string | null;
  /** Organizer website, if given. */
  website: string | null;
  contact: Contact;
  /** Per-route elevation info from "Weitere Streckeninformationen". */
  routes: RouteInfo[];
  /** Free-text general notes ("Allgemein"). */
  notes: string | null;
  /** Map coordinates from the embedded Leaflet map. */
  coordinates: { lat: number; lng: number } | null;
  /** Whether the event is cancelled ("abgesagt"). */
  cancelled: boolean;
  /** Cancellation note, if present. */
  cancelReason: string | null;
}
