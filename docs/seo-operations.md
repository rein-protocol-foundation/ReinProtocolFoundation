# Search visibility operations

Configured on 2026-11-16 (America/Los_Angeles).

- Canonical origin: `https://www.rein-protocol.org`. The apex redirects permanently (308).
- Google Search Console: domain property `rein-protocol.org`, verified using a Cloudflare DNS TXT record.
- Bing Webmaster Tools: `https://www.rein-protocol.org/`, verified using a Cloudflare DNS CNAME record.
- Both services use the existing administrator's Google login. No organization Google account was created.
- Submitted sitemap: `https://www.rein-protocol.org/sitemap.xml`.

Keep the Google verification TXT and Bing verification CNAME records in Cloudflare. Removing them can invalidate ownership. The admin email alias is not a Google account and was not added as an owner.

## IndexNow

`scripts/indexnow-config.json` holds the public host and public verification key. The matching key file is intentionally served from `public/`; it is not an account credential. No Cloudflare, Vercel, or Google token is needed by the notification workflow.

The GitHub Actions workflow runs after a successful Vercel **Production** deployment, daily at 09:23 UTC (to detect changes to public database-backed content), and manually with `workflow_dispatch`. It fetches only the canonical public sitemap and public pages, compares searchable content, links, images, and metadata with the previous successful state, and sends changed URLs to IndexNow. Confirmed removals and redirects from a previously tracked URL are also notified. Preview deployments are excluded.

The state is stored in the GitHub Actions cache. Cache eviction causes a fresh submission of current sitemap URLs. HTTP 200 means received; HTTP 202 means received with key validation pending. Neither response guarantees crawling, indexing, ranking, or a deadline.

Local checks after the key file is deployed:

```sh
node --test scripts/submit-indexnow.test.mjs
node scripts/submit-indexnow.mjs --dry-run
node scripts/submit-indexnow.mjs
```

The local comparison state is `.cache/indexnow.json` (ignored by Git). The script checks the deployed key first and fails on off-origin URLs, unexpected redirects, inaccessible pages, and noindex pages in the sitemap. A failed submission does not advance state.

## Reading results

Use Search Console Performance and Pages for Google search queries, clicks, impressions, indexing, and canonical selection. Use Bing Search Performance and AI Performance for Bing search and supported AI citations. Newly verified properties need time to process data; zero data immediately after setup is not proof of zero traffic.

The initial Google inspection showed that the www homepage was treated as a duplicate of the apex in an older crawl. The live apex-to-www redirect is already permanent. Keep canonical URLs and sitemap entries consistent and monitor Google's selected canonical after recrawling.
