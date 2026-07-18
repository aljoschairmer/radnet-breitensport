import {
  BASE_URL,
  CATEGORIES,
  LANDESVERBAENDE,
  PAGE_SIZE,
  type CategoryName,
  type LandesverbandName,
} from "./constants.js";

/**
 * When the caller searched a specific category, the label is known from the
 * query — so we can backfill rows whose list markup omits the type (rad-net
 * leaves the tooltip empty for some categories such as Gravelride).
 */
function requestedTypeLabel(cat: SearchOptions["category"]): string | null {
  if (cat == null || cat === "all") return null;
  const code = typeof cat === "number" ? cat : CATEGORIES[cat as CategoryName];
  if (code == null || code === CATEGORIES.all) return null;
  const entry = Object.entries(CATEGORIES).find(([, v]) => v === code);
  return entry ? entry[0] : null;
}
import { parseDetail, parseList } from "./parse.js";
import type { DateInput, EventDetail, EventListItem, SearchOptions } from "./types.js";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; radnet-breitensport npm package; +https://www.npmjs.com/package/radnet-breitensport)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "de-DE,de;q=0.9",
};

/** Format any accepted date input as the German dd.mm.yyyy the portal expects. */
export function toGermanDate(input: DateInput): string {
  if (typeof input === "string") {
    // already dd.mm.yyyy
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(input)) return input;
    // ISO YYYY-MM-DD
    const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
    input = new Date(input);
  }
  const d = input;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function resolveCategory(cat: SearchOptions["category"]): number {
  if (cat == null || cat === "all") return CATEGORIES.all;
  if (typeof cat === "number") return cat;
  const code = CATEGORIES[cat as CategoryName];
  if (code == null) throw new Error(`Unknown category "${cat}". Known: ${Object.keys(CATEGORIES).join(", ")}`);
  return code;
}

function resolveLv(lv: SearchOptions["landesverband"]): number {
  if (lv == null || lv === "all") return LANDESVERBAENDE.all;
  if (typeof lv === "number") return lv;
  const code = LANDESVERBAENDE[lv as LandesverbandName];
  if (code == null)
    throw new Error(`Unknown Landesverband "${lv}". Known: ${Object.keys(LANDESVERBAENDE).join(", ")}`);
  return code;
}

export interface RadNetOptions {
  /** Override the base URL (e.g. for testing). */
  baseUrl?: string;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
  /** Milliseconds to wait between paginated requests (politeness). Default 300. */
  delayMs?: number;
}

/**
 * Client for the rad-net.de Breitensportkalender.
 *
 * @example
 * const client = new RadNet();
 * const rtf = await client.search({ category: "RTF", startDate: "2026-07-17", endDate: "2026-10-17" });
 */
export class RadNet {
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private delayMs: number;

  constructor(opts: RadNetOptions = {}) {
    this.baseUrl = opts.baseUrl ?? BASE_URL;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    this.delayMs = opts.delayMs ?? 300;
    if (!this.fetchImpl) {
      throw new Error("No fetch implementation available. Use Node >=18 or pass opts.fetch.");
    }
  }

  private buildUrl(opts: SearchOptions, lstart: number): string {
    const start = toGermanDate(opts.startDate ?? new Date());
    const end = toGermanDate(
      opts.endDate ??
        (() => {
          const d = opts.startDate ? new Date(toIso(opts.startDate)) : new Date();
          d.setMonth(d.getMonth() + 3);
          return d;
        })()
    );
    const params = new URLSearchParams({
      startdate: start,
      enddate: end,
      art: String(resolveCategory(opts.category)),
      titel: opts.title ?? "",
      lv: String(resolveLv(opts.landesverband)),
      umkreis: opts.radius ? String(opts.radius) : "-1",
      plz: opts.plz ?? "",
      tid: "",
      formproof: "",
      go: "Termine suchen",
      lstart: String(lstart),
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  private async getHtml(url: string, signal?: AbortSignal): Promise<string> {
    const res = await this.fetchImpl(url, { headers: DEFAULT_HEADERS, signal });
    if (!res.ok) {
      throw new Error(`rad-net request failed: HTTP ${res.status} for ${url}`);
    }
    return res.text();
  }

  /**
   * Search the calendar and return every matching event across all result pages.
   * Use `maxPages` to cap the number of 30-event pages fetched.
   */
  async search(opts: SearchOptions = {}): Promise<EventListItem[]> {
    const fallback = requestedTypeLabel(opts.category);
    const first = await this.getHtml(this.buildUrl(opts, 0), opts.signal);
    const { total, events } = parseList(first);

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const maxPages = Math.min(opts.maxPages ?? totalPages, totalPages);

    const all = [...events];
    for (let page = 1; page < maxPages; page++) {
      if (this.delayMs) await sleep(this.delayMs);
      const html = await this.getHtml(this.buildUrl(opts, page * PAGE_SIZE), opts.signal);
      all.push(...parseList(html).events);
    }
    if (fallback) for (const e of all) if (!e.type) e.type = fallback;
    return all;
  }

  /**
   * Async generator variant of {@link search} — yields events page by page,
   * so you can stream/process without buffering everything in memory.
   */
  async *searchStream(opts: SearchOptions = {}): AsyncGenerator<EventListItem> {
    const fallback = requestedTypeLabel(opts.category);
    const fill = (e: EventListItem): EventListItem => {
      if (fallback && !e.type) e.type = fallback;
      return e;
    };
    const first = await this.getHtml(this.buildUrl(opts, 0), opts.signal);
    const { total, events } = parseList(first);
    for (const e of events) yield fill(e);

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const maxPages = Math.min(opts.maxPages ?? totalPages, totalPages);
    for (let page = 1; page < maxPages; page++) {
      if (this.delayMs) await sleep(this.delayMs);
      const html = await this.getHtml(this.buildUrl(opts, page * PAGE_SIZE), opts.signal);
      for (const e of parseList(html).events) yield fill(e);
    }
  }

  /** Convenience: only Radtourenfahrten (RTF). */
  searchRTF(opts: Omit<SearchOptions, "category"> = {}): Promise<EventListItem[]> {
    return this.search({ ...opts, category: "RTF" });
  }

  /** Convenience: only Country-Tourenfahrten (CTF). */
  searchCTF(opts: Omit<SearchOptions, "category"> = {}): Promise<EventListItem[]> {
    return this.search({ ...opts, category: "CTF" });
  }

  /**
   * Fetch the full detail record for one event.
   * Accepts an {@link EventListItem}, a detail URL, or a bare numeric id.
   */
  async getEvent(ref: EventListItem | string, signal?: AbortSignal): Promise<EventDetail> {
    let url: string;
    let id: string;
    if (typeof ref === "object") {
      url = ref.detailUrl;
      id = ref.id;
    } else if (/^https?:\/\//.test(ref)) {
      url = ref;
      id = ref.match(/;(\d+)\.html/)?.[1] ?? "";
    } else {
      throw new Error(
        "getEvent needs an EventListItem or a full detail URL. A bare id can't be resolved to a URL (the slug is required by rad-net)."
      );
    }
    const html = await this.getHtml(url, signal);
    return parseDetail(html, id, url);
  }
}

function toIso(input: DateInput): string {
  if (input instanceof Date) return input.toISOString();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(input)) {
    const [d, m, y] = input.split(".");
    return `${y}-${m}-${d}`;
  }
  return input;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
