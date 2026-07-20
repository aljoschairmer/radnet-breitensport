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
export declare function createBrowserFetch(opts?: BrowserFetchOptions): Promise<BrowserFetch>;
//# sourceMappingURL=browser-fetch.d.ts.map