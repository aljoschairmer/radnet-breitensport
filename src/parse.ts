import { parse, type HTMLElement } from "node-html-parser";
import { ICON_TO_TYPE } from "./constants.js";
import type {
  Contact,
  EventDetail,
  EventListItem,
  RouteInfo,
  StartLocation,
} from "./types.js";

const PORTAL_ORIGIN = "https://www.rad-net.de";

/**
 * The new portal wraps every internal link as
 * `…/breitensportkalender.htm?url=<url-encoded path>&url_hash=<hmac>`.
 * Return the decoded inner path (e.g. `/breitensportkalender/termine/2026/foo;123.html`),
 * or `null` for the legacy direct-link format (which has no `url=` param).
 */
export function unwrapUrl(href: string): string | null {
  const m = href.replace(/&amp;/g, "&").match(/[?&]url=([^&]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Resolve a possibly-relative href against an origin. */
function absoluteUrl(href: string, origin: string): string {
  const h = href.replace(/&amp;/g, "&");
  return /^https?:\/\//.test(h) ? h : origin + h;
}

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
export function parsePageLinks(html: string, origin: string = PORTAL_ORIGIN): PageLink[] {
  const root = parse(html);
  const byStart = new Map<number, string>();
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href") ?? "";
    const inner = unwrapUrl(href) ?? href;
    const lm = inner.match(/[?&]lstart=(\d+)/);
    if (!lm) continue;
    if (/[?&]sortbyn=/.test(inner)) continue; // skip sort-order toggles
    const lstart = parseInt(lm[1], 10);
    if (!byStart.has(lstart)) byStart.set(lstart, absoluteUrl(href, origin));
  }
  return [...byStart.entries()]
    .map(([lstart, url]) => ({ lstart, url }))
    .sort((a, b) => a.lstart - b.lstart);
}

/** Collapse whitespace and decode a couple of common entities. */
function clean(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert a German dd.mm.yyyy date to an ISO YYYY-MM-DD string. */
export function germanToIso(dmy: string): string {
  const m = dmy.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return dmy;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Pull all integer distances out of a string like "40/73/103/150" or "40 / 73 km". */
function parseDistances(text: string): number[] {
  const nums = clean(text.replace(/<wbr\s*\/?>/g, "")).match(/\d+/g);
  return nums ? nums.map((n) => parseInt(n, 10)) : [];
}

/** Decode obfuscated emails: "name [at] host [dot] de" -> "name@host.de". */
function deobfuscateEmail(text: string): string {
  return clean(text)
    .replace(/\s*\[\s*at\s*\]\s*/gi, "@")
    .replace(/\s*\[\s*dot\s*\]\s*/gi, ".");
}

/**
 * Parse a Breitensportkalender result-list page.
 * Returns the total hit count reported by the portal and the rows on this page.
 */
export function parseList(
  html: string,
  opts: { origin?: string } = {}
): { total: number; events: EventListItem[] } {
  const origin = opts.origin ?? PORTAL_ORIGIN;
  const root = parse(html);

  const totalMatch = html.match(/Es wurden\s*<strong>\s*(\d+)\s*<\/strong>/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const events: EventListItem[] = [];
  for (const row of root.querySelectorAll("ul#tabellen_ul li.tabzeile")) {
    const anchor = row.querySelector("a.terminlink");
    if (!anchor) continue;

    const href = anchor.getAttribute("href") ?? "";
    // New portal: href is the signed wrapper `…?url=<encoded path>&url_hash=…`.
    // Decode the inner path to recover slug/id; legacy direct hrefs pass through.
    const innerPath = unwrapUrl(href) ?? href;
    const idMatch = innerPath.match(/\/?([^/;]+);(\d+)\.html/);
    const slug = idMatch ? idMatch[1] : "";
    const id = idMatch ? idMatch[2] : "";

    const cells = anchor.querySelectorAll("div.zelle");
    if (cells.length < 5) continue;

    // Cell 0: type — icon div + tooltip div
    const tooltip = cells[0].querySelector(".tooltip");
    const iconDiv = cells[0].querySelector("div:not(.tooltip)");
    const iconClass = iconDiv ? (iconDiv.getAttribute("class") ?? "").trim() : "";
    const type = tooltip
      ? clean(tooltip.text)
      : ICON_TO_TYPE[iconClass] ?? iconClass ?? "";

    // Cell 1: "Sa, 18.07.2026"
    const dateText = clean(cells[1].text);
    const weekday = (dateText.split(",")[0] ?? "").trim();
    const date = germanToIso(dateText);

    // Cell 2: title
    const title = clean(cells[2].text);

    // Cell 3: distances
    const distances = parseDistances(cells[3].innerHTML);

    // Cell 4: "Club e.V. (NRW)"
    const clubRaw = clean(cells[4].text);
    const lvMatch = clubRaw.match(/\(([^)]+)\)\s*$/);
    const lvAbbr = lvMatch ? lvMatch[1] : null;
    const club = lvMatch ? clubRaw.slice(0, lvMatch.index).trim() : clubRaw;

    // Struck-through rows are cancelled or already past.
    const struckThrough = /line-through/.test(
      (cells[1].getAttribute("style") ?? "") + (anchor.getAttribute("style") ?? "")
    );

    events.push({
      id,
      slug,
      type,
      iconClass,
      date,
      weekday,
      title,
      distances,
      club,
      lvAbbr,
      detailUrl: absoluteUrl(href, origin),
      struckThrough,
    });
  }

  return { total, events };
}

/** Split the multi-line "Startort" cell into structured parts. */
function parseStartLocation(td: HTMLElement): StartLocation {
  // The <td> uses <br> between street, "zip city", venue, and a maps link.
  const html = td.innerHTML.replace(/<a[\s\S]*$/i, ""); // drop the "Route erstellen" link
  const lines = html
    .split(/<br\s*\/?>/i)
    .map((l) => clean(parse(l).text))
    .filter(Boolean);

  let street: string | null = null;
  let zip: string | null = null;
  let city: string | null = null;
  let venue: string | null = null;

  for (const line of lines) {
    const zc = line.match(/^(\d{5})\s+(.+)$/);
    if (zc && !zip) {
      zip = zc[1];
      city = zc[2];
    } else if (!street) {
      street = line;
    } else if (!venue) {
      venue = line;
    }
  }

  return { street, zip, city, venue, raw: lines.join("\n") };
}

/**
 * Parse an event detail page into a full {@link EventDetail}.
 * `id` and `detailUrl` are supplied by the caller (from the source URL).
 */
export function parseDetail(html: string, id: string, detailUrl: string): EventDetail {
  const root = parse(html);
  const details = root.querySelector("#termindetails");

  // Flatten every <tr> with a single <th> label + <td> value into a map.
  const fields = new Map<string, HTMLElement>();
  if (details) {
    for (const tr of details.querySelectorAll("tr")) {
      const th = tr.querySelector("th");
      const td = tr.querySelector("td");
      if (th && td) fields.set(clean(th.text), td);
    }
  }
  const val = (label: string): string | null => {
    const td = fields.get(label);
    return td ? clean(td.text) || null : null;
  };

  // Website: prefer the anchor href over the display text.
  let website: string | null = null;
  const internetTd = fields.get("Internet");
  if (internetTd) {
    const a = internetTd.querySelector("a");
    website = a ? a.getAttribute("href") ?? clean(a.text) : clean(internetTd.text) || null;
  }

  // Start location.
  const startTd = fields.get("Startort");
  const startLocation = startTd ? parseStartLocation(startTd) : null;

  // Contact.
  const contact: Contact = {
    name: val("Name"),
    phone: val("Telefon"),
    email: fields.get("E-Mail") ? deobfuscateEmail(fields.get("E-Mail")!.text) : null,
  };

  // Routes + general notes from the ".rnbsk-erw-infos" table.
  const routes: RouteInfo[] = [];
  let notes: string | null = null;
  const infoTable = root.querySelector(".rnbsk-erw-infos");
  if (infoTable) {
    const trs = infoTable.querySelectorAll("tr");
    for (const tr of trs) {
      const th = tr.querySelector("th");
      const tds = tr.querySelectorAll("td");
      const label = th ? clean(th.text) : "";
      const kmMatch = label.match(/^(\d+)\s*km/i);
      if (kmMatch && tds.length >= 2) {
        const profile = clean(tds[0].text) || null;
        // HM may use a German thousands separator, e.g. "~1.400 HM".
        const hm = clean(tds[1].text).match(/([\d.]+)/);
        const elevation = hm ? parseInt(hm[1].replace(/\./g, ""), 10) : null;
        routes.push({
          km: parseInt(kmMatch[1], 10),
          profile: profile && profile.toLowerCase() !== "unbekannt" ? profile : null,
          elevation: Number.isFinite(elevation) ? elevation : null,
        });
      } else if (/^Allgemein/i.test(label) === false && tds.length === 1) {
        const t = clean(tds[0].text);
        if (t) notes = notes ? `${notes}\n${t}` : t;
      }
    }
  }

  // Cancellation.
  let cancelled = false;
  let cancelReason: string | null = null;
  const cancelMatch = html.match(
    /Die Veranstaltung wurde abgesagt<\/strong>(?:<br\s*\/?>)?([^<]*)/i
  );
  if (cancelMatch || /wurde abgesagt/i.test(html)) {
    cancelled = true;
    cancelReason = cancelMatch ? clean(cancelMatch[1]) || null : null;
  }

  // Coordinates from the embedded Leaflet map.
  let coordinates: { lat: number; lng: number } | null = null;
  const coordMatch = html.match(/setView\(\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
  if (coordMatch) {
    coordinates = { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
  }

  const dateText = val("Datum") ?? "";

  return {
    id,
    detailUrl,
    type: val("Art") ?? "",
    date: germanToIso(dateText),
    weekday: (dateText.split(",")[0] ?? "").trim() || undefined,
    title: clean(root.querySelector("h1")?.text ?? "") || val("Veranstalter") || "",
    organizer: val("Veranstalter"),
    landesverband: val("Landesverband"),
    distances: parseDistances(val("Strecken") ?? ""),
    routeMarking: val("Streckenführung"),
    startLocation,
    startTime: val("Startzeit"),
    addendum: val("Zusatz"),
    eventNumber: val("Veranst.-Nr."),
    website,
    contact,
    routes,
    notes,
    coordinates,
    cancelled,
    cancelReason,
  };
}
