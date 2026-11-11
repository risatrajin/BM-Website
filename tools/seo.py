#!/usr/bin/env python3
"""Write SEO / GEO metadata into every page, plus sitemap.xml, robots.txt and llms.txt.

Run from the repo root after changing page copy:  python3 tools/seo.py
Each page's <head> gets one block between <!-- seo:start --> and <!-- seo:end -->;
re-running replaces it, so edit PAGES below rather than the HTML.
"""
import datetime
import html
import json
import re
from pathlib import Path

SITE = "https://bluemind.app"  # production origin used for canonical, og:url and the sitemap
ROOT = Path(__file__).resolve().parent.parent
TODAY = datetime.date.today().isoformat()
OG_IMAGE = f"{SITE}/assets/og-image.jpg"

ORG = {
    "@type": "Organization",
    "@id": f"{SITE}/#org",
    "name": "BlueMind",
    "url": f"{SITE}/",
    "logo": {"@type": "ImageObject", "url": f"{SITE}/icon-512.png", "width": 512, "height": 512},
    "description": "BlueMind is AI-powered compliance and practice management software for financial advisors, agencies and insurance carriers in Canada and the US.",
    "email": "support@bluemind.app",
    "telephone": "+1-888-887-5707",
    "areaServed": ["CA", "US"],
    "address": [
        {"@type": "PostalAddress", "streetAddress": "3601 Hwy 7, Suite 610", "addressLocality": "Markham",
         "addressRegion": "ON", "postalCode": "L3R 0M3", "addressCountry": "CA"},
        {"@type": "PostalAddress", "streetAddress": "127 West 26th St., Suite 500", "addressLocality": "New York",
         "addressRegion": "NY", "postalCode": "10001", "addressCountry": "US"},
    ],
    "contactPoint": {"@type": "ContactPoint", "contactType": "customer support", "telephone": "+1-888-887-5707",
                     "email": "support@bluemind.app", "areaServed": ["CA", "US"]},
    "sameAs": [
        "https://www.linkedin.com/company/bluemindapp/",
        "https://twitter.com/BlueMind_app",
        "https://www.facebook.com/BlueMindApp/",
        "https://www.instagram.com/bluemind.app/",
    ],
}
WEBSITE = {"@type": "WebSite", "@id": f"{SITE}/#website", "name": "BlueMind", "url": f"{SITE}/",
           "publisher": {"@id": f"{SITE}/#org"}, "inLanguage": "en"}


def app(name, description, offers=None):
    a = {"@type": "SoftwareApplication", "name": name, "description": description,
         "applicationCategory": "BusinessApplication", "operatingSystem": "Web",
         "publisher": {"@id": f"{SITE}/#org"}, "areaServed": ["CA", "US"]}
    if offers:
        a["offers"] = offers
    return a


def offer(name, price, url):
    return {"@type": "Offer", "name": name, "price": price, "priceCurrency": "CAD", "url": url,
            "category": "subscription"}


# file → (title, description, page type, crumb label, priority, extra JSON-LD nodes)
PAGES = {
    "index.html": ("BlueMind — AI compliance software for insurance and financial advisors",
                   "BlueMind is AI-powered compliance and practice management software for advisors, agencies and carriers in the financial and insurance industry, in Canada and the US.",
                   "WebPage", None, "1.0", []),
    "advisor.html": ("BlueMind Advisor — AI compliance assistant for financial advisors",
                     "Invisible compliance for advisors: BlueMind takes notes, fills forms, checks KYC and suitability and keeps an audit-ready file, so you spend your time on clients instead of admin.",
                     "WebPage", "Advisor", "0.9",
                     [app("BlueMind Advisor",
                          "AI compliance and practice management assistant for independent financial and insurance advisors.",
                          [offer("Pro", "79", "https://bluemind.us/register?plan=pro-monthly"),
                           offer("Team", "169", "https://bluemind.us/register?plan=team-monthly")])]),
    "enterprise.html": ("BlueMind Enterprise — compliance oversight for insurance firms and agencies",
                        "Grow your distribution, not your risk. BlueMind Enterprise gives compliance teams a live view of every advisor, AI risk detection and audit-ready evidence on top of your back office.",
                        "WebPage", "Enterprise", "0.9",
                        [app("BlueMind Enterprise",
                             "Supervision and compliance oversight platform for firms and agencies that manage networks of advisors.")]),
    "mia.html": ("Mia — the AI assistant for advisor compliance work — BlueMind",
                 "Mia sits in on your client meetings, fills in the paperwork and comes back with a regulator-ready file. An AI assistant built for financial and insurance advisors.",
                 "WebPage", "Mia", "0.8",
                 [app("Mia by BlueMind",
                      "AI meeting assistant for financial advisors that drafts notes, forms, compliance checks and follow-ups for advisor sign-off.")]),
    "carriers.html": ("BlueMind for insurance carriers — reach advisors at the moment of advice",
                      "Partner with BlueMind to reach advisors where the advice happens, receive complete applications and see the suitability record behind every policy.",
                      "WebPage", "Carriers", "0.8", []),
    "partners.html": ("Partners — BlueMind",
                      "Technology, distribution, association and referral partnerships with BlueMind, the AI compliance platform for advisors and insurance firms.",
                      "WebPage", "Partners", "0.6", []),
    "about.html": ("About BlueMind — built by advisors, for advisors",
                   "BlueMind was founded by a CFP and built by advisors, for advisors. Our mission, story, values and journey so far.",
                   "AboutPage", "About", "0.6", []),
    "team.html": ("Team — BlueMind",
                  "Advisors, compliance experts and engineers with 50+ years of combined compliance experience behind BlueMind.",
                  "WebPage", "Team", "0.5", []),
    "brand.html": ("Brand and press kit — BlueMind",
                   "BlueMind logos, colours, type and usage guidelines for partners and press.",
                   "WebPage", "Brand", "0.4", []),
    "contact.html": ("Contact BlueMind — offices in Markham, ON and New York, NY",
                     "Get in touch with BlueMind: offices in Markham, Ontario and New York, phone +1 888 887 5707, support@bluemind.app and a contact form.",
                     "ContactPage", "Contact", "0.6", []),
}
NOINDEX = {"design-system.html": ("BlueMind design system", "Internal design system reference for the BlueMind website.")}


def url_for(f):
    return f"{SITE}/" if f == "index.html" else f"{SITE}/{f}"


def text(s):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", s)).split())


def faqs(src):
    """Question/answer pairs from the page's accordion. Answers still marked [to confirm] are left out."""
    qs = re.findall(r'<button class="acc__btn"[^>]*>(.*?)<i ', src, re.S)
    ans = re.findall(r'class="acc__panel"[^>]*><div>(.*?)</div></div>', src, re.S)
    out = []
    for q, a in zip(qs, ans):
        q, a = text(q), text(a)
        if q and a and "[" not in a:
            out.append({"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}})
    return out


def block(f, src):
    e = lambda s: html.escape(s, quote=True)
    if f in NOINDEX:
        title, desc = NOINDEX[f]
        return "\n".join([
            f"  <title>{e(title)}</title>",
            f'  <meta name="description" content="{e(desc)}" />',
            '  <meta name="robots" content="noindex, nofollow" />',
            *icons(),
        ])
    title, desc, ptype, crumb, _, extra = PAGES[f]
    url = url_for(f)
    page = {"@type": ptype, "@id": f"{url}#webpage", "url": url, "name": title, "description": desc,
            "isPartOf": {"@id": f"{SITE}/#website"}, "about": {"@id": f"{SITE}/#org"}, "inLanguage": "en",
            "primaryImageOfPage": {"@type": "ImageObject", "url": OG_IMAGE}, "dateModified": TODAY}
    graph = [ORG, WEBSITE, page]
    if crumb:
        bc = {"@type": "BreadcrumbList", "@id": f"{url}#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": crumb, "item": url}]}
        page["breadcrumb"] = {"@id": bc["@id"]}
        graph.append(bc)
    graph += extra
    qa = faqs(src)
    if qa:
        graph.append({"@type": "FAQPage", "@id": f"{url}#faq", "mainEntity": qa, "isPartOf": {"@id": f"{url}#webpage"}})
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1).replace("</", "<\\/")
    return "\n".join([
        f"  <title>{e(title)}</title>",
        f'  <meta name="description" content="{e(desc)}" />',
        f'  <link rel="canonical" href="{url}" />',
        '  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
        *icons(),
        '  <meta property="og:type" content="website" />',
        '  <meta property="og:site_name" content="BlueMind" />',
        '  <meta property="og:locale" content="en_CA" />',
        f'  <meta property="og:url" content="{url}" />',
        f'  <meta property="og:title" content="{e(title)}" />',
        f'  <meta property="og:description" content="{e(desc)}" />',
        f'  <meta property="og:image" content="{OG_IMAGE}" />',
        '  <meta property="og:image:width" content="1200" />',
        '  <meta property="og:image:height" content="630" />',
        '  <meta property="og:image:alt" content="BlueMind — compliance software built for insurance" />',
        '  <meta name="twitter:card" content="summary_large_image" />',
        '  <meta name="twitter:site" content="@BlueMind_app" />',
        f'  <meta name="twitter:title" content="{e(title)}" />',
        f'  <meta name="twitter:description" content="{e(desc)}" />',
        f'  <meta name="twitter:image" content="{OG_IMAGE}" />',
        f'  <script type="application/ld+json">\n{ld}\n  </script>',
    ])


def icons():
    return [
        '  <link rel="icon" href="favicon.ico" sizes="32x32" />',
        '  <link rel="icon" href="favicon.svg" type="image/svg+xml" />',
        '  <link rel="apple-touch-icon" href="apple-touch-icon.png" />',
        '  <link rel="manifest" href="site.webmanifest" />',
        '  <meta name="theme-color" content="#ffffff" />',
    ]


def write_page(f):
    p = ROOT / f
    src = p.read_text()
    src = re.sub(r"\n?\s*<!-- seo:start -->.*?<!-- seo:end -->", "", src, flags=re.S)
    src = re.sub(r"\n\s*<title>.*?</title>", "", src, count=1, flags=re.S)
    src = re.sub(r'\n\s*<meta name="description"[^>]*>', "", src, count=1)
    new = f"\n  <!-- seo:start -->\n{block(f, src)}\n  <!-- seo:end -->"
    src, n = re.subn(r'(<meta name="viewport"[^>]*>)', lambda m: m.group(1) + new, src, count=1)
    assert n == 1, f"no viewport meta in {f}"
    p.write_text(src)


def write_files():
    urls = "\n".join(
        f"  <url><loc>{url_for(f)}</loc><lastmod>{TODAY}</lastmod><priority>{v[4]}</priority></url>"
        for f, v in PAGES.items())
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')

    bots = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot",
            "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot"]
    rules = "\n\n".join(f"User-agent: {b}\nAllow: /" for b in bots)
    (ROOT / "robots.txt").write_text(
        f"# Search and AI assistants are welcome to read and cite this site.\n{rules}\n\n"
        f"User-agent: *\nAllow: /\nDisallow: /archive/\nDisallow: /design-system.html\n\nSitemap: {SITE}/sitemap.xml\n")

    pages = "\n".join(f"- [{v[0]}]({url_for(f)}): {v[1]}" for f, v in PAGES.items())
    (ROOT / "llms.txt").write_text(f"""# BlueMind

> BlueMind is AI-powered compliance and practice management software for financial advisors, insurance agencies, MGAs and insurance carriers in Canada and the US. One platform, three solutions: BlueMind Advisor for individual advisors, BlueMind Enterprise for firms that supervise advisors, and partnerships for insurance carriers.

Key facts:
- Category: compliance software / regtech for life insurance and financial advice.
- Regulators covered: FSRA (Canada), SEC and FINRA (US). Covers KYC, suitability, record-keeping and audit trail.
- Mia is BlueMind's AI assistant: it joins client meetings (with client consent), drafts notes and forms, runs compliance checks and prepares follow-ups. Nothing is filed or sent without the advisor's sign-off.
- Works with the calendar and email advisors already use (Google Calendar, Gmail and others).
- Pricing (BlueMind Advisor): Pro $79 CAD per user per month; Team $169 CAD per month for 2 users, $59 per additional user; Enterprise custom. There is no free plan.
- Founded by a CFP; built by advisors, for advisors.
- Offices: 3601 Hwy 7, Suite 610, Markham, ON L3R 0M3, Canada; 127 West 26th St., Suite 500, New York, NY 10001, USA.
- Contact: +1 888 887 5707, support@bluemind.app, {SITE}/contact.html

## Pages

{pages}
""")

    (ROOT / "site.webmanifest").write_text(json.dumps({
        "name": "BlueMind", "short_name": "BlueMind", "start_url": "/", "display": "browser",
        "background_color": "#ffffff", "theme_color": "#ffffff",
        "icons": [{"src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png"},
                  {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=2) + "\n")


if __name__ == "__main__":
    for f in [*PAGES, *NOINDEX]:
        write_page(f)
    write_files()
    print(f"updated {len(PAGES) + len(NOINDEX)} pages, sitemap.xml, robots.txt, llms.txt, site.webmanifest")
