/**
 * Static lookup tables extracted from the rad-net.de Breitensportkalender
 * search form (https://breitensport.rad-net.de/breitensportkalender/).
 *
 * These are the exact `value` codes the portal expects for its `art` (category)
 * and `lv` (Landesverband / regional association) query parameters.
 */
export const BASE_URL = "https://breitensport.rad-net.de/breitensportkalender/termine/";
/** Number of result rows the portal returns per page. */
export const PAGE_SIZE = 30;
/**
 * Event category codes (`art` query parameter).
 * `-1` means "all except permanent events".
 */
export const CATEGORIES = {
    all: -1, // Alle (außer Permanente)
    RTF: 2, // Radtourenfahrten
    Radmarathon: 4,
    "Radmarathon-Cup": 5, // Radmarathon-Cup Deutschland (RMCD)
    CTF: 6, // Country-Tourenfahrten
    "CTF-Permanente": 10,
    "RTF-Permanente": 1,
    Etappenfahrten: 3,
    Volksradfahren: 7,
    Radwandern: 8,
    Radsportabzeichen: 9, // Deutsches Radsportabzeichen
    "Richtig-fit-Tag": 12,
    Brevet: 17,
    Gravelride: 20,
    "Permanent-Gravelride": 21,
    vRTF: 22,
};
/**
 * Landesverband codes (`lv` query parameter). `-1` means all associations.
 */
export const LANDESVERBAENDE = {
    all: -1,
    Baden: 1,
    Bayern: 2,
    Berlin: 14,
    Brandenburg: 3,
    Bremen: 16,
    Hamburg: 4,
    Hessen: 5,
    "Mecklenburg-Vorpommern": 17,
    Niedersachsen: 6,
    "Nordrhein-Westfalen": 7,
    "Rheinland-Pfalz": 8,
    Sachsen: 9,
    "Sachsen-Anhalt": 18,
    Saarland: 10,
    "Schleswig-Holstein": 11,
    Thueringen: 19,
    Wuerttemberg: 12,
};
/** Radius options (km) accepted by the `umkreis` query parameter. */
export const RADIUS_OPTIONS = [20, 50, 100, 200, 400];
/**
 * Maps the CSS icon class used in the result list to a normalized type label.
 * The list page renders `<div class="ICON"></div><div class="tooltip">LABEL</div>`.
 */
export const ICON_TO_TYPE = {
    "a-wertung": "RTF",
    marathon: "Marathon",
    ctf: "CTF",
    supercup: "Radmarathon-Cup",
    sonstige: "Sonstige",
};
//# sourceMappingURL=constants.js.map