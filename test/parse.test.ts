import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseList, parseDetail, germanToIso } from "../dist/parse.js";
import { toGermanDate } from "../dist/client.js";

const here = dirname(fileURLToPath(import.meta.url));
const listHtml = readFileSync(join(here, "fixtures/list.html"), "utf8");
const detailHtml = readFileSync(join(here, "fixtures/detail.html"), "utf8");

test("germanToIso / toGermanDate roundtrip", () => {
  assert.equal(germanToIso("18.07.2026"), "2026-07-18");
  assert.equal(toGermanDate("2026-07-18"), "18.07.2026");
  assert.equal(toGermanDate("18.07.2026"), "18.07.2026");
  assert.equal(toGermanDate(new Date("2026-07-18T00:00:00Z")), "18.07.2026");
});

test("parseList extracts total and rows", () => {
  const { total, events } = parseList(listHtml);
  assert.equal(total, 15);
  assert.ok(events.length > 0, "should find event rows");

  const warburg = events.find((e) => e.id === "9976275");
  assert.ok(warburg, "Warburg RTF should be present");
  assert.equal(warburg.type, "RTF");
  assert.equal(warburg.date, "2026-07-18");
  assert.equal(warburg.weekday, "Sa");
  assert.equal(warburg.title, "Warburger Diemel-Sauerland-RTF");
  assert.deepEqual(warburg.distances, [40, 73, 103, 150]);
  assert.match(warburg.club, /RSV .*Warburg/);
  assert.equal(warburg.lvAbbr, "NRW");
  assert.equal(warburg.slug, "warburger-diemel-sauerland-rtf");
  assert.ok(warburg.detailUrl.startsWith("https://breitensport.rad-net.de/"));
  assert.equal(warburg.struckThrough, true);
});

test("every list row has an id and iso date; most have a type", () => {
  const { events } = parseList(listHtml);
  for (const e of events) {
    assert.match(e.id, /^\d+$/, `id for ${e.title}`);
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `date for ${e.title}`);
    assert.equal(typeof e.type, "string");
  }
  // rad-net omits the type label for a few categories (e.g. Gravelride) in the
  // list; the client backfills those when a specific category was searched.
  const typed = events.filter((e) => e.type.length > 0);
  assert.ok(typed.length >= events.length - 3, "most rows should carry a type label");
});

test("parseDetail extracts the full record", () => {
  const d = parseDetail(detailHtml, "9976275", "https://example/detail.html");
  assert.equal(d.type, "RTF");
  assert.equal(d.date, "2026-07-18");
  assert.equal(d.organizer, "RSV '98 Warburg e.V.");
  assert.equal(d.landesverband, "Nordrhein-Westfalen");
  assert.deepEqual(d.distances, [40, 73, 103, 150]);
  assert.equal(d.routeMarking, "teilweise ausgeschildert");
  assert.equal(d.startTime, "09:00 bis 10:00");
  assert.equal(d.addendum, "M/S");
  assert.equal(d.eventNumber, "2199");

  // start location
  assert.ok(d.startLocation);
  assert.equal(d.startLocation.zip, "34414");
  assert.equal(d.startLocation.city, "Warburg-Scherfede");
  assert.match(d.startLocation.street ?? "", /Wilhelm-L.dige-Str/);
  assert.equal(d.startLocation.venue, "Sportplatz-Sportheim");

  // contact
  assert.equal(d.contact.name, "Holger Block");
  assert.ok(d.contact.phone && d.contact.phone.length > 0);
  assert.equal(d.contact.email, "rtf@rsv-98-warburg.de");

  // website
  assert.match(d.website ?? "", /rsv-98-warburg\.de/);

  // routes
  assert.equal(d.routes.length, 3);
  assert.deepEqual(d.routes[0], { km: 40, profile: null, elevation: 280 });
  assert.deepEqual(d.routes[2], { km: 103, profile: null, elevation: 990 });

  // notes
  assert.match(d.notes ?? "", /komplett ausgeschildert/);

  // coordinates
  assert.ok(d.coordinates);
  assert.ok(Math.abs(d.coordinates.lat - 51.524) < 0.01);
  assert.ok(Math.abs(d.coordinates.lng - 9.028) < 0.01);

  // cancellation
  assert.equal(d.cancelled, true);
  assert.match(d.cancelReason ?? "", /organisatorischen Gr/);
});
