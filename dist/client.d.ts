import { type BrowserFetchOptions } from "./browser-fetch.js";
import type { DateInput, EventDetail, EventListItem, SearchOptions } from "./types.js";
/** Format any accepted date input as the German dd.mm.yyyy the portal expects. */
export declare function toGermanDate(input: DateInput): string;
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
export declare class RadNet {
    private baseUrl;
    private origin;
    private fetchImpl;
    private delayMs;
    private cookie;
    constructor(opts?: RadNetOptions);
    /**
     * Create a client backed by a real Chromium (via the optional `playwright`
     * peer dependency), to get past the portal WAF that blocks plain `fetch`
     * (HTTP 403). Returns the client plus a `close()` you must call when done.
     *
     * @example
     * const { client, close } = await RadNet.withBrowser();
     * try {
     *   const events = await client.search({ category: "RTF", landesverband: "Bayern" });
     * } finally {
     *   await close();
     * }
     */
    static withBrowser(opts?: BrowserFetchOptions & {
        baseUrl?: string;
        delayMs?: number;
    }): Promise<{
        client: RadNet;
        close: () => Promise<void>;
    }>;
    private buildUrl;
    private getHtml;
    /**
     * Search the calendar and return every matching event across all result pages.
     * Use `maxPages` to cap the number of 30-event pages fetched.
     */
    search(opts?: SearchOptions): Promise<EventListItem[]>;
    /**
     * Async generator variant of {@link search} — yields events page by page,
     * so you can stream/process without buffering everything in memory.
     */
    searchStream(opts?: SearchOptions): AsyncGenerator<EventListItem>;
    /** Convenience: only Radtourenfahrten (RTF). */
    searchRTF(opts?: Omit<SearchOptions, "category">): Promise<EventListItem[]>;
    /** Convenience: only Country-Tourenfahrten (CTF). */
    searchCTF(opts?: Omit<SearchOptions, "category">): Promise<EventListItem[]>;
    /**
     * Fetch the full detail record for one event.
     * Accepts an {@link EventListItem}, a detail URL, or a bare numeric id.
     */
    getEvent(ref: EventListItem | string, signal?: AbortSignal): Promise<EventDetail>;
}
//# sourceMappingURL=client.d.ts.map