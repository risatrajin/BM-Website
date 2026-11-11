# Moving bluemind.app off HubSpot

Goal: nothing on bluemind.app is served by HubSpot after the move. Every URL from the live
sitemap keeps working, either at the same path on the new site or through a 301.

- `url-map.csv` — every live URL (92 in the sitemap + 3 linked from the live nav), its new home and status.
- `../firebase.json` — Firebase Hosting config: clean URLs (`/advisor`, not `/advisor.html`) and the 301s.
  Deploy with `firebase deploy --only hosting`.

## Status

| Status | Count | What |
|---|---|---|
| same | 70 | Home, Advisor, Enterprise, Resources, the 57 blog posts + `/blog`, 7 resource pages, 4 legal pages |
| 301 | 21 | about-us → about, contact-us → contact, pricing → advisor#pricing, harmony → enterprise, … |
| needs file | 4 | Gated downloads (see below) |

## What was imported from HubSpot

`tools/import_hubspot.py` pulled the public pages into `content/` (JSON) and downloaded every image
into `assets/`. `tools/blog.py` renders them in the site's design:

| Old URL | New file |
|---|---|
| `/blog`, `/blog/<slug>` (57 posts) | `blog.html`, `blog/<slug>.html` |
| `/resources/<video or reading list>` (7) | `resources/<slug>.html` (YouTube / Podbean players kept) |
| `/terms-conditions`, `/privacy-policy`, `/cookies-policy`, `/acceptable-usage-policy` | same names at the root |

Old internal links inside posts were pointed at the new pages, and HubSpot CTA buttons were removed.
The importer is a one-off; from now on edit `content/*.json` and run `python3 tools/blog.py`.

Also moved off bluemind.app/HubSpot pages:
- Enterprise calendar: `bluemind.app/meetings/akil-balachandran` → `meetings.hubspot.com/akil-balachandran`
- Advisor "Watch demo": `bluemind.app/advisor-demo` → the Supademo link it embedded

## Still needed before launch

1. **Six PDF downloads.** These HubSpot pages only email the file after a form, so the files
   aren't public: From Trust to Evidence, Staying Ahead of Compliance, 5 Easy Ways to Increase
   Revenue, Client Onboarding Checklist 101, The Compliance Checklist, Insurance Business Canada
   magazine. Export them from HubSpot (Marketing → Files) and they can be hosted on the site.
2. **HubSpot tools the site still calls** (not pages, but HubSpot services):
   - Contact and carrier forms post to the HubSpot Forms API (`api.hsforms.com`).
   - Book a demo calendars use HubSpot Meetings (maneli, akil-balachandran).
   If HubSpot is being dropped entirely, these need replacements before the account closes.

## Launch day

1. Point bluemind.app at Firebase; keep `www` redirecting to the apex.
2. Check every old URL returns 200 or one 301 to a 200:
   ```bash
   tail -n +2 migration/url-map.csv | cut -d, -f1 | while read p; do printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://bluemind.app$p"; done
   ```
3. Search Console: submit `https://bluemind.app/sitemap.xml` and watch Pages → "Not found (404)"
   for two to six weeks. Some ranking movement is normal in that time.

## If the site is rebuilt in Next.js

Use the same redirects in `next.config.js`, render pages statically (SSG) or on the server (SSR),
and carry over the head tags from `tools/seo.py` through the `metadata` API:

```js
const redirects = require('./firebase.json').hosting.redirects;
module.exports = {
  trailingSlash: false,
  async redirects() {
    return redirects.map(({ source, destination }) => ({
      source: source.replace('/**', '/:path*'), destination, permanent: true,
    }));
  },
};
```
