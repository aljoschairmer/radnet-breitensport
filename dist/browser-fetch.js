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
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
/**
 * Launch a headless Chromium and return a `fetch`-compatible function that
 * renders pages through it (defeating the portal WAF). Remember to `close()`.
 */
export async function createBrowserFetch(opts = {}) {
    // Non-literal specifier keeps `playwright` an optional dependency at build time.
    const spec = "playwright";
    let chromium;
    try {
        ({ chromium } = (await import(spec)));
    }
    catch {
        throw new Error("createBrowserFetch requires the optional 'playwright' package. Install it with:\n" +
            "  npm install --save-dev playwright && npx playwright install chromium");
    }
    const browser = await chromium.launch({ headless: opts.headless ?? true });
    const ctx = await browser.newContext({
        locale: opts.locale ?? "de-DE",
        userAgent: opts.userAgent ?? DEFAULT_UA,
    });
    const timeout = opts.timeoutMs ?? 45000;
    const fetchImpl = (async (input) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const page = await ctx.newPage();
        try {
            const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout });
            const body = await page.content();
            return new Response(body, {
                status: resp?.status() ?? 200,
                headers: { "content-type": "text/html; charset=utf-8" },
            });
        }
        finally {
            await page.close();
        }
    });
    return { fetch: fetchImpl, close: () => browser.close() };
}
//# sourceMappingURL=browser-fetch.js.map