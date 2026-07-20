import type { EventDetail, EventListItem } from "./types.js";
/**
 * The new portal wraps every internal link as
 * `…/breitensportkalender.htm?url=<url-encoded path>&url_hash=<hmac>`.
 * Return the decoded inner path (e.g. `/breitensportkalender/termine/2026/foo;123.html`),
 * or `null` for the legacy direct-link format (which has no `url=` param).
 */
export declare function unwrapUrl(href: string): string | null;
/** A signed pagination link harvested from a result page. */
export interface PageLink {
    /** The `lstart` offset this page represents (0, 30, 60, …). */
    lstart: number;
    /** Absolute, pre-signed URL to fetch this page. */
    url: string;
}
/**
 * Harvest the pre-signed pagination links from a result page.
 *
 * On the new portal every page link carries its own `url_hash`, so we cannot
 * build them ourselves — we follow the ones the server rendered. Sort-toggle
 * links (which also carry `lstart` but add a `sortbyn=` override) are skipped.
 */
export declare function parsePageLinks(html: string, origin?: string): PageLink[];
/** Convert a German dd.mm.yyyy date to an ISO YYYY-MM-DD string. */
export declare function germanToIso(dmy: string): string;
/**
 * Parse a Breitensportkalender result-list page.
 * Returns the total hit count reported by the portal and the rows on this page.
 */
export declare function parseList(html: string, opts?: {
    origin?: string;
}): {
    total: number;
    events: EventListItem[];
};
/**
 * Parse an event detail page into a full {@link EventDetail}.
 * `id` and `detailUrl` are supplied by the caller (from the source URL).
 */
export declare function parseDetail(html: string, id: string, detailUrl: string): EventDetail;
//# sourceMappingURL=parse.d.ts.map