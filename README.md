# radnet-breitensport

Fetch and parse recreational cycling events — **RTF** (Radtourenfahrten), **CTF** (Country-Tourenfahrten), Radmarathon, Gravel, Brevets and more — from the [rad-net.de Breitensportkalender](https://breitensport.rad-net.de/breitensportkalender/), the official calendar of the Bund Deutscher Radfahrer (BDR).

```ts
import { RadNet } from "radnet-breitensport";

const client = new RadNet();

const rtf = await client.search({
  category: "RTF",
  landesverband: "Bayern",
  startDate: "2026-07-17",
  endDate: "2026-10-17",
});

console.log(rtf[0]);
// {
//   id: '9976280', type: 'RTF', date: '2026-07-19',
//   title: '41. Pfaffenwinkelradrundfahrt',
//   distances: [55, 80, 125, 160], club: 'RC 1977 Altenstadt e.V.',
//   lvAbbr: 'BAY', detailUrl: 'https://breitensport.rad-net.de/...', ...
// }
```

## Install

```bash
npm install radnet-breitensport
```

Requires **Node 18+** (uses the built-in global `fetch`). Ships as ESM with TypeScript types. One runtime dependency: [`node-html-parser`](https://www.npmjs.com/package/node-html-parser).

## Library API

### `new RadNet(options?)`

| option    | default                    | description                                   |
| --------- | -------------------------- | --------------------------------------------- |
| `baseUrl` | the portal's `termine/` URL | override the endpoint (e.g. for tests)        |
| `fetch`   | global `fetch`             | inject a custom fetch implementation          |
| `delayMs` | `300`                      | polite delay between paginated page requests  |

### `client.search(options): Promise<EventListItem[]>`

Fetches **all** matching pages (30 events each) and returns the combined list.

```ts
interface SearchOptions {
  startDate?: string | Date;   // "YYYY-MM-DD", "dd.mm.yyyy", or Date. Default: today
  endDate?: string | Date;     // default: start + 3 months
  category?: CategoryName | number;      // "RTF" | "CTF" | "Radmarathon" | ... | code
  landesverband?: LandesverbandName | number; // "Bayern" | "Nordrhein-Westfalen" | ...
  title?: string;              // free-text title filter
  plz?: string;                // postal code (with radius)
  radius?: 20 | 50 | 100 | 200 | 400; // km around plz
  maxPages?: number;           // cap pages fetched (default: all)
  signal?: AbortSignal;
}
```

Handy shortcuts: `client.searchRTF(opts)` and `client.searchCTF(opts)`.

### `client.searchStream(options): AsyncGenerator<EventListItem>`

Same query, but yields events page-by-page so you can start processing before every page is fetched:

```ts
for await (const ev of client.searchStream({ category: "CTF" })) {
  console.log(ev.date, ev.title);
}
```

### `client.getEvent(listItemOrUrl): Promise<EventDetail>`

Fetches and parses one detail page. Pass an `EventListItem` from a search, or a full detail URL.

```ts
const detail = await client.getEvent(rtf[0]);
// organizer, landesverband, startLocation {street, zip, city, venue},
// startTime, addendum, eventNumber, website,
// contact {name, phone, email}, routes [{km, profile, elevation}],
// notes, coordinates {lat, lng}, cancelled, cancelReason
```

Emails on the portal are lightly obfuscated (`name [at] host`) — they are decoded back to `name@host` for you.

## CLI

```bash
npx radnet search --type RTF --lv Bayern --from 2026-07-17 --to 2026-10-17
npx radnet search --type CTF --plz 34414 --radius 50 --json
npx radnet show "https://breitensport.rad-net.de/breitensportkalender/termine/2026/foo;9976275.html"
npx radnet categories     # list category names + codes
npx radnet regions        # list Landesverband names + codes
```

`search` prints a table by default; add `--json` for machine-readable output, or `--details` to also fetch the full detail record for every result (slower).

## Categories (`--type` / `category`)

`all` (default, excludes permanents), `RTF`, `CTF`, `Radmarathon`, `Radmarathon-Cup`, `Etappenfahrten`, `Volksradfahren`, `Radwandern`, `Radsportabzeichen`, `Richtig-fit-Tag`, `Brevet`, `Gravelride`, `Permanent-Gravelride`, `vRTF`, `RTF-Permanente`, `CTF-Permanente`. You may also pass the raw numeric `art` code.

## Landesverbände (`--lv` / `landesverband`)

`Baden`, `Bayern`, `Berlin`, `Brandenburg`, `Bremen`, `Hamburg`, `Hessen`, `Mecklenburg-Vorpommern`, `Niedersachsen`, `Nordrhein-Westfalen`, `Rheinland-Pfalz`, `Sachsen`, `Sachsen-Anhalt`, `Saarland`, `Schleswig-Holstein`, `Thueringen`, `Wuerttemberg`.

## Data model

`EventListItem` (from `search`): `id`, `slug`, `type`, `iconClass`, `date` (ISO), `weekday`, `title`, `distances` (number[]), `club`, `lvAbbr`, `detailUrl`, `struckThrough`.

`EventDetail` (from `getEvent`) adds: `organizer`, `landesverband`, `routeMarking`, `startLocation`, `startTime`, `addendum`, `eventNumber`, `website`, `contact`, `routes`, `notes`, `coordinates`, `cancelled`, `cancelReason`.

## Notes & caveats

- **Unofficial.** This scrapes public HTML; rad-net can change its markup at any time and the parser may then need an update. It has no affiliation with the BDR or rad-net GmbH.
- **`struckThrough`** in the list marks events that are cancelled *or* already past — fetch the detail page for the authoritative `cancelled` flag and reason.
- A few categories (e.g. Gravelride) don't render a type label in the list. When you search a specific category the client backfills it; a mixed `all` search may leave those rows' `type` empty (the detail page still has the correct `Art`).
- Be polite: keep the default inter-page delay and cache results rather than hammering the portal.

## Development

```bash
npm install
npm run build      # tsc -> dist/
npm test           # node:test against saved HTML fixtures
```

Tests run against fixtures in `test/fixtures/` so they're deterministic and offline.

## License

MIT
