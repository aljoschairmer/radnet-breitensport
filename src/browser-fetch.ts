/**
 * Optional browser-backed transport for the WAF-protected rad-net.de portal.
 *
 * The new `www.rad-net.de/rad-net-portal/` portal fronts requests with a WAF
 * that rejects plain Node `fetch` (HTTP 403) because its TLS fingerprint isn't
 * a real browser. This renders each page with a real Chromium via Playwright
 * and returns the HTML as a `fetch`-compatible `Response`, so the parser and
 * the signed-link pagination keep working unchanged — you never sign a URL.
 *
 * Playwright is an OPTIONAL peer dependency; it is only loaded when you call
 * this function. Install it once:
 *
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * @example
 * import { RadNet, createBrowserFetch } from "radnet-breitensport";
 * const { fetch, close } = await createBrowserFetch();
 * try {
 *   const client = new RadNet({ fetch });
 *   const events = await client.search({ category: "RTF", landesverband: "Bayern" });
 * } finally {
 *   await close();
 * }
 */

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface BrowserFetchOptions {
  /** Run Chromium headless. Default `true`. Set `false` if the WAF blocks headless. */
  headless?: boolean;
  /** Browser locale. Default `"de-DE"`. */
  locale?: string;
  /** User-Agent string. Defaults to a current desktop Chrome UA. */
  userAgent?: string;
  /** Per-navigation timeout in ms. Default `45000`. */
  timeoutMs?: number;
}

export interface BrowserFetch {
  /** A `fetch`-compatible function to pass as `new RadNet({ fetch })`. */
  fetch: typeof fetch;
  /** Close the underlying browser. Always call this when you're done. */
  close: () => Promise<void>;
}

/**
 * Launch a headless Chromium and return a `fetch`-compatible function that
 * renders pages through it (defeating the portal WAF). Remember to `close()`.
 */
export async function createBrowserFetch(opts: BrowserFetchOptions = {}): Promise<BrowserFetch> {
  // Non-literal specifier keeps `playwright` an optional dependency at build time.
  const spec: string = "playwright";
  let chromium: { launch: (o?: unknown) => Promise<PWBrowser> };
  try {
    ({ chromium } = (await import(spec)) as { chromium: typeof chromium });
  } catch {
    throw new Error(
      "createBrowserFetch requires the optional 'playwright' package. Install it with:\n" +
        "  npm install --save-dev playwright && npx playwright install chromium"
    );
  }

  const browser = await chromium.launch({ headless: opts.headless ?? true });
  const ctx = await browser.newContext({
    locale: opts.locale ?? "de-DE",
    userAgent: opts.userAgent ?? DEFAULT_UA,
  });
  const timeout = opts.timeoutMs ?? 45000;

  const fetchImpl = (async (input: string | URL | { url: string }): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout });
      const body = await page.content();
      return new Response(body, {
        status: resp?.status() ?? 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } finally {
      await page.close();
    }
  }) as unknown as typeof fetch;

  return { fetch: fetchImpl, close: () => browser.close() };
}

// Minimal structural types for the bits of Playwright we touch (avoids a hard
// type dependency on the optional package).
interface PWResponse {
  status(): number;
}
interface PWPage {
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<PWResponse | null>;
  content(): Promise<string>;
  close(): Promise<void>;
}
interface PWContext {
  newPage(): Promise<PWPage>;
}
interface PWBrowser {
  newContext(opts?: { locale?: string; userAgent?: string }): Promise<PWContext>;
  close(): Promise<void>;
}
