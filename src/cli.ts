#!/usr/bin/env node
import { RadNet } from "./client.js";
import { CATEGORIES, LANDESVERBAENDE } from "./constants.js";
import type { SearchOptions } from "./types.js";

const HELP = `radnet — query the rad-net.de Breitensportkalender (RTF / CTF / Radmarathon / Gravel ...)

Usage:
  radnet search [options]        List events (default command)
  radnet show <detailUrl>        Print full details for one event
  radnet categories              List category names/codes
  radnet regions                 List Landesverband names/codes

Search options:
  --from <date>        Start date (YYYY-MM-DD or dd.mm.yyyy). Default: today
  --to <date>          End date. Default: 3 months after --from
  --type <name>        Category, e.g. RTF, CTF, Radmarathon, Gravelride, all
  --lv <name>          Landesverband, e.g. Bayern, Nordrhein-Westfalen
  --plz <code>         Postal code (with --radius)
  --radius <km>        20 | 50 | 100 | 200 | 400
  --title <text>       Title filter
  --max-pages <n>      Cap result pages (30 events each)
  --json               Output JSON instead of a table
  --details            (search) also fetch full detail for each event — slow

Examples:
  radnet search --type RTF --lv Bayern --from 2026-07-17 --to 2026-10-17
  radnet search --type CTF --plz 34414 --radius 50 --json
  radnet show "https://breitensport.rad-net.de/breitensportkalender/termine/2026/foo;9976275.html"
`;

function parseArgs(argv: string[]): { cmd: string; positional: string[]; flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  const cmd = positional.shift() ?? "search";
  return { cmd, positional, flags };
}

function fmtTable(rows: string[][]): string {
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => (r[c] ?? "").length)));
  return rows
    .map((r) => r.map((cell, c) => (cell ?? "").padEnd(widths[c])).join("  "))
    .join("\n");
}

async function main() {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2));

  if (flags.help || cmd === "help") {
    console.log(HELP);
    return;
  }

  if (cmd === "categories") {
    console.log(Object.entries(CATEGORIES).map(([k, v]) => `${String(v).padStart(3)}  ${k}`).join("\n"));
    return;
  }
  if (cmd === "regions") {
    console.log(Object.entries(LANDESVERBAENDE).map(([k, v]) => `${String(v).padStart(3)}  ${k}`).join("\n"));
    return;
  }

  const client = new RadNet();

  if (cmd === "show") {
    const url = positional[0];
    if (!url) {
      console.error("show requires a detail URL. See `radnet --help`.");
      process.exit(1);
    }
    const detail = await client.getEvent(url);
    console.log(JSON.stringify(detail, null, 2));
    return;
  }

  // search
  const opts: SearchOptions = {
    startDate: flags.from as string | undefined,
    endDate: flags.to as string | undefined,
    category: flags.type as string as SearchOptions["category"],
    landesverband: flags.lv as string as SearchOptions["landesverband"],
    title: flags.title as string | undefined,
    plz: flags.plz as string | undefined,
    radius: flags.radius ? (Number(flags.radius) as SearchOptions["radius"]) : undefined,
    maxPages: flags["max-pages"] ? Number(flags["max-pages"]) : undefined,
  };

  const events = await client.search(opts);

  if (flags.details) {
    const detailed = [];
    for (const e of events) {
      detailed.push(await client.getEvent(e));
    }
    console.log(JSON.stringify(detailed, null, 2));
    return;
  }

  if (flags.json) {
    console.log(JSON.stringify(events, null, 2));
    return;
  }

  if (events.length === 0) {
    console.log("No events found.");
    return;
  }

  const header = ["Date", "Type", "Title", "Distances", "Club", "LV"];
  const rows = [header, ...events.map((e) => [
    e.date,
    e.type + (e.struckThrough ? " (×)" : ""),
    e.title.length > 45 ? e.title.slice(0, 44) + "…" : e.title,
    e.distances.join("/"),
    e.club.length > 30 ? e.club.slice(0, 29) + "…" : e.club,
    e.lvAbbr ?? "",
  ])];
  console.log(fmtTable(rows));
  console.log(`\n${events.length} event(s). (× = cancelled/past)`);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
