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

The initial Google inspection showed the www homepage as a duplicate of the apex. A read-only URL Inspection check on 2026-11-17 confirmed the homepage is now indexed with Google's selected canonical matching `https://www.rein-protocol.org/`. Keep the permanent apex-to-www redirect, canonical URLs, and sitemap entries consistent. This is a dated observation, not a guarantee of future indexing.

## Core-page content and discovery

The homepage identifies the AI agent safety focus in its title and publishes Organization JSON-LD using the shared legal name, public contact email, approved logo, and official GitHub organization. Keep these facts aligned with visible public information; do not add unverified accreditation, tax status, or organization profiles.

The homepage links within its main content to the mission, programs, learning catalog, and community. The mission and programs pages also link to learning resources. Community links to the learning catalog independently of whether resource data is available, and to the dedicated contribution page. These links supplement the global navigation and sitemap.

The learning catalog retains self-referencing pagination canonicals and distinguishes later pages in its title. Preserve those URLs when editing metadata.

After publishing, check the rendered titles, canonical links, Organization JSON-LD, and the existing IndexNow workflow. In Search Console, monitor indexing of `/mission`, `/programs`, `/community`, `/community/learn`, and `/community/contribute`. Compare final performance data over meaningful periods; initial impressions and incomplete recent data are not enough to establish a ranking or click-through-rate improvement.

Implementation references: [Google title links](https://developers.google.com/search/docs/appearance/title-link), [crawlable internal links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), and [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization).
