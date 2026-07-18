import type { EventDetail, EventListItem } from "./types.js";
/** Convert a German dd.mm.yyyy date to an ISO YYYY-MM-DD string. */
export declare function germanToIso(dmy: string): string;
/**
 * Parse a Breitensportkalender result-list page.
 * Returns the total hit count reported by the portal and the rows on this page.
 */
export declare function parseList(html: string): {
    total: number;
    events: EventListItem[];
};
/**
 * Parse an event detail page into a full {@link EventDetail}.
 * `id` and `detailUrl` are supplied by the caller (from the source URL).
 */
export declare function parseDetail(html: string, id: string, detailUrl: string): EventDetail;
//# sourceMappingURL=parse.d.ts.map