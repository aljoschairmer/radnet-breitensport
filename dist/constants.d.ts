/**
 * Static lookup tables extracted from the rad-net.de Breitensportkalender
 * search form (https://breitensport.rad-net.de/breitensportkalender/).
 *
 * These are the exact `value` codes the portal expects for its `art` (category)
 * and `lv` (Landesverband / regional association) query parameters.
 */
/**
 * Search endpoint of the current rad-net.de portal.
 *
 * The legacy host `breitensport.rad-net.de` is being retired. The new portal at
 * `www.rad-net.de/rad-net-portal/` proxies the same TYPO3 calendar, but wraps
 * every navigation/detail link as `?url=<path>&url_hash=<hmac>` where the hash
 * is signed with a server-side secret we cannot reproduce. We therefore never
 * build signed URLs ourselves: page 1 is fetched via a plain (unsigned) form-
 * style GET — exactly what the search form submits — and every following page
 * is fetched by following the pre-signed pagination links found in the markup.
 */
export declare const BASE_URL = "https://www.rad-net.de/rad-net-portal/breitensportkalender.htm";
/** Legacy host, kept for reference / backward compatibility. */
export declare const LEGACY_BASE_URL = "https://breitensport.rad-net.de/breitensportkalender/termine/";
/** Number of result rows the portal returns per page. */
export declare const PAGE_SIZE = 30;
/**
 * Event category codes (`art` query parameter).
 * `-1` means "all except permanent events".
 */
export declare const CATEGORIES: {
    readonly all: -1;
    readonly RTF: 2;
    readonly Radmarathon: 4;
    readonly "Radmarathon-Cup": 5;
    readonly CTF: 6;
    readonly "CTF-Permanente": 10;
    readonly "RTF-Permanente": 1;
    readonly Etappenfahrten: 3;
    readonly Volksradfahren: 7;
    readonly Radwandern: 8;
    readonly Radsportabzeichen: 9;
    readonly "Richtig-fit-Tag": 12;
    readonly Brevet: 17;
    readonly Gravelride: 20;
    readonly "Permanent-Gravelride": 21;
    readonly vRTF: 22;
};
export type CategoryName = keyof typeof CATEGORIES;
/**
 * Landesverband codes (`lv` query parameter). `-1` means all associations.
 */
export declare const LANDESVERBAENDE: {
    readonly all: -1;
    readonly Baden: 1;
    readonly Bayern: 2;
    readonly Berlin: 14;
    readonly Brandenburg: 3;
    readonly Bremen: 16;
    readonly Hamburg: 4;
    readonly Hessen: 5;
    readonly "Mecklenburg-Vorpommern": 17;
    readonly Niedersachsen: 6;
    readonly "Nordrhein-Westfalen": 7;
    readonly "Rheinland-Pfalz": 8;
    readonly Sachsen: 9;
    readonly "Sachsen-Anhalt": 18;
    readonly Saarland: 10;
    readonly "Schleswig-Holstein": 11;
    readonly Thueringen: 19;
    readonly Wuerttemberg: 12;
};
export type LandesverbandName = keyof typeof LANDESVERBAENDE;
/** Radius options (km) accepted by the `umkreis` query parameter. */
export declare const RADIUS_OPTIONS: readonly [20, 50, 100, 200, 400];
export type RadiusKm = (typeof RADIUS_OPTIONS)[number];
/**
 * Maps the CSS icon class used in the result list to a normalized type label.
 * The list page renders `<div class="ICON"></div><div class="tooltip">LABEL</div>`.
 */
export declare const ICON_TO_TYPE: Record<string, string>;
//# sourceMappingURL=constants.d.ts.map