#!/usr/bin/env python3
"""Render the blog and legal pages from content/ into the site's own design.

  python3 tools/blog.py      # then: python3 tools/seo.py (sitemap) and tools/i18n.py build

content/blog/<slug>.json   -> blog/<slug>.html  (served at /blog/<slug>)
                           -> blog.html         (index, served at /blog)
content/legal/<slug>.json  -> <slug>.html       (served at /terms-conditions etc., same as HubSpot)

The page chrome (head assets, nav, drawer, footer) is copied from resources.html, so nav or footer
changes reach these pages the next time this runs. Copy is English only; /fr/ has no blog.
"""
import datetime
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import seo  # noqa: E402  (shared ORG, WEBSITE, icons)

SITE = seo.SITE
TEMPLATE = ROOT / "resources.html"
e = lambda s: html.escape(s, quote=True)


def chrome():
    src = TEMPLATE.read_text()
    head = src[: src.index("  <!-- seo:start -->")]
    mid = src[src.index("  <!-- seo:end -->") + len("  <!-- seo:end -->"): src.index('  <main id="main">')]
    foot = src[src.index("  </main>"):]
    # nothing in the shared nav is "current" on these pages
    mid = mid.replace(' aria-current="page"', "")
    return head, mid, foot


def up(markup):
    """Make root-relative links work from one folder down (blog/)."""
    def fix(m):
        v = m.group(2)
        if not v or re.match(r"^(?:[a-z]+:|//|#|/|\?)", v, re.I):
            return m.group(0)
        return f'{m.group(1)}="../{v}"'
    markup = re.sub(r'\b(href|src|poster|srcset|data-src)="([^"]*)"', fix, markup)
    return re.sub(r'url\((["\']?)(?!data:|https?:|/|#)([^)"\']+)\1\)', r"url(\1../\2\1)", markup)


def fmt(d):
    try:
        return datetime.date.fromisoformat(d).strftime("%B %-d, %Y")
    except ValueError:
        return d


def head_block(title, desc, url, kind, graph_extra, crumbs, image=None):
    img, iw, ih = image or (seo.OG_IMAGE, 1200, 630)
    page = {"@type": kind, "@id": f"{url}#webpage", "url": url, "name": title, "description": desc,
            "isPartOf": {"@id": f"{SITE}/#website"}, "inLanguage": "en"}
    bc = {"@type": "BreadcrumbList", "@id": f"{url}#breadcrumb", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]}
    page["breadcrumb"] = {"@id": bc["@id"]}
    ld = json.dumps({"@context": "https://schema.org", "@graph": [seo.ORG, seo.WEBSITE, page, bc, *graph_extra]},
                    ensure_ascii=False, indent=1).replace("</", "<\\/")
    og = "article" if graph_extra else "website"
    return "\n".join([
        "  <!-- seo:start -->",
        f"  <title>{e(title)}</title>",
        f'  <meta name="description" content="{e(desc)}" />',
        f'  <link rel="canonical" href="{url}" />',
        '  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
        *seo.icons(),
        f'  <meta property="og:type" content="{og}" />',
        '  <meta property="og:site_name" content="BlueMind" />',
        '  <meta property="og:locale" content="en_CA" />',
        f'  <meta property="og:url" content="{url}" />',
        f'  <meta property="og:title" content="{e(title)}" />',
        f'  <meta property="og:description" content="{e(desc)}" />',
        f'  <meta property="og:image" content="{img}" />',
        f'  <meta property="og:image:width" content="{iw}" />',
        f'  <meta property="og:image:height" content="{ih}" />',
        '  <meta name="twitter:card" content="summary_large_image" />',
        '  <meta name="twitter:site" content="@BlueMind_app" />',
        f'  <meta name="twitter:title" content="{e(title)}" />',
        f'  <meta name="twitter:description" content="{e(desc)}" />',
        f'  <meta name="twitter:image" content="{img}" />',
        f'  <script type="application/ld+json">\n{ld}\n  </script>',
        "  <!-- seo:end -->",
    ])


def posts():
    out = [json.loads(p.read_text()) for p in (ROOT / "content" / "blog").glob("*.json")]
    return sorted(out, key=lambda p: p["date"], reverse=True)


CATS = {  # first HubSpot tag -> (filter name, tint var, icons to rotate through)
    "Client Relations": ("Client relations", "pink", ["handshake", "users-three", "chats-circle", "heart"]),
    "Technology": ("Technology", "blue", ["cpu", "devices", "cloud-arrow-up", "robot"]),
    "Artificial Intelligence": ("Technology", "blue", ["robot", "sparkle"]),
    "Productivity Tips": ("Productivity", "yellow", ["lightning", "timer", "check-square", "rocket-launch"]),
    "Business Growth": ("Business growth", "green", ["chart-line-up", "trend-up", "plant", "target"]),
    "New Advisors": ("Business growth", "green", ["compass", "plant"]),
    "Compliance": ("Compliance", "lilac", ["shield-check", "seal-check", "scales", "file-lock"]),
    "Clients Risk": ("Compliance", "lilac", ["scales", "gauge", "shield-check"]),
    "Regulation": ("Compliance", "lilac", ["bank", "scales"]),
}
FILTERS = ["Client relations", "Technology", "Productivity", "Business growth", "Compliance"]


def category(p):
    if "licensing" in p["slug"] or "ministry" in p["slug"]:  # policy submission, tagged Technology on HubSpot
        return CATS["Regulation"]
    for t in p.get("tags") or []:
        if t in CATS:
            return CATS[t]
    return CATS["Technology"]


def minutes(p):
    return max(2, round(len(re.sub(r"<[^>]+>", " ", p["html"]).split()) / 220))


COVERS = ROOT / "assets" / "blog" / "covers"  # one Lummi photo per post, named by slug


def photo(p):
    """(site path, width, height) of the post's cover photo, or None."""
    f = COVERS / f"{p['slug']}.jpg"
    if not f.exists():
        return None
    from PIL import Image
    with Image.open(f) as im:
        return f"assets/blog/covers/{f.name}", *im.size


def cover(p, big=False, up="../", lazy=True):
    name, tint, icons = category(p)
    ph = photo(p)
    cls = f'bcover bcover--{tint}{" bcover--lg" if big else ""}{" bcover--photo" if ph else ""}'
    if ph:
        src, w, h = ph
        load = 'loading="lazy"' if lazy else 'fetchpriority="high"'
        art = f'<img src="{up}{src}" alt="" width="{w}" height="{h}" decoding="async" {load} />'
    else:
        art = f'<i class="icon ph-duotone ph-{icons[sum(map(ord, p["slug"])) % len(icons)]}"></i>'
    return f'<span class="{cls}" aria-hidden="true"><span class="bcover__chip">{name}</span>{art}</span>'



def card(p, prefix="", lazy=True):
    name, _, _ = category(p)
    return (f'          <li class="bcard" data-cat="{name}"><a href="{prefix}{p["slug"]}.html">{cover(p, up="" if prefix else "../")}'
            f'<span class="bcard__meta">{fmt(p["date"])} · {minutes(p)} min read</span>'
            f'<h3>{e(p["title"])}</h3><p>{e(p["description"])}</p></a></li>')


def post_row(p, prefix=""):
    return card(p, prefix)


def write_index(all_posts, head, mid, foot):
    url = f"{SITE}/blog"
    top, rest = all_posts[0], all_posts[1:]
    name, _, _ = category(top)
    counts = {f: sum(1 for p in rest if category(p)[0] == f) for f in FILTERS}  # the grid, not the featured post
    pills = "".join(f'<button type="button" data-cat="{f}" aria-pressed="false">{f}<span>{counts[f]}</span></button>' for f in FILTERS if counts[f])
    cards = "\n".join(card(p, "blog/") for p in rest)
    main = f'''  <main id="main">
    <section class="chero bhero" aria-labelledby="blog-title">
      <div class="container">
        <p class="eyebrow">Blog</p>
        <h1 class="chero__title" id="blog-title">Written by advisors, <span>for advisors.</span></h1>
        <p class="lead">Practical ideas on compliance, client relationships, technology and growing your practice.</p>
      </div>
    </section>

    <section class="section section--snug" aria-label="Latest article">
      <div class="container">
        <a class="bfeature" href="blog/{top['slug']}.html" data-reveal>
          {cover(top, big=True, up="", lazy=False)}
          <span class="bfeature__body">
            <span class="bcard__meta">Latest · {fmt(top['date'])} · {minutes(top)} min read</span>
            <span class="bfeature__title">{e(top['title'])}</span>
            <span class="bfeature__text">{e(top['description'])}</span>
            <span class="bfeature__go">Read article<i class="icon ph ph-arrow-right" aria-hidden="true"></i></span>
          </span>
        </a>
      </div>
    </section>

    <section class="section section--snug" aria-labelledby="all-title">
      <div class="container">
        <div class="cbar bbar">
          <h2 id="all-title">All articles</h2>
          <div class="cfilter bfilter" role="group" aria-label="Filter articles by topic"><button type="button" data-cat="all" aria-pressed="true">All<span>{len(rest)}</span></button>{pills}</div>
        </div>
        <ul class="bgrid" data-page="9">
{cards}
        </ul>
        <p class="bmore"><button class="btn btn--border btn--md" type="button">Show more articles</button></p>
      </div>
    </section>

    <section class="section section--snug" aria-label="Get started">
      <div class="container">
        <div class="pband on-dark">
          <h2 class="pband__title">Spend your time on clients, not paperwork.</h2>
          <div class="actions actions--center"><a class="btn btn--primary btn--lg" href="advisor.html#pricing">Get started</a><a class="btn btn--secondary btn--lg" href="#">Book a demo</a></div>
        </div>
      </div>
    </section>
  </main>
'''
    block = head_block("Blog — ideas for financial and insurance advisors — BlueMind",
                       "Practical articles for financial and insurance advisors on compliance, client relationships, technology and growing a practice.",
                       url, "CollectionPage", [], [("Home", f"{SITE}/"), ("Blog", url)])
    (ROOT / "blog.html").write_text(head + block + mid + main + foot)


def write_post(p, all_posts, head, mid, foot):
    url = f"{SITE}/blog/{p['slug']}"
    i = next(n for n, x in enumerate(all_posts) if x["slug"] == p["slug"])
    more = [x for x in all_posts if x["slug"] != p["slug"]][max(0, i - 1): max(0, i - 1) + 3]
    article = {"@type": "BlogPosting", "@id": f"{url}#article", "headline": p["title"], "description": p["description"],
               "datePublished": p["date"], "dateModified": p["date"], "inLanguage": "en",
               "author": {"@type": "Organization", "name": "BlueMind"} if p["author"] in ("BlueMind", "") else {"@type": "Person", "name": p["author"]},
               "publisher": {"@id": f"{SITE}/#org"}, "mainEntityOfPage": {"@id": f"{url}#webpage"}, "image": seo.OG_IMAGE}
    ph = photo(p)
    if ph:
        article["image"] = f"{SITE}/{ph[0]}"
    hero = (f'\n      <figure class="post__cover container"><img src="../{ph[0]}" alt="" width="{ph[1]}" height="{ph[2]}" fetchpriority="high" /></figure>'
            if ph else "")
    same = p["description"].strip().lower() in ("", p["title"].strip().lower())
    lead = "" if same else f'\n        <p class="lead">{e(p["description"])}</p>'  # skip when HubSpot reused the title
    main = f'''  <main id="main">
    <article class="post" aria-labelledby="post-title">
      <header class="post__head container">
        <a class="post__back" href="../blog.html"><i class="icon ph ph-arrow-left" aria-hidden="true"></i>All articles</a>
        <p class="post__meta"><span class="post__cat post__cat--{category(p)[1]}">{category(p)[0]}</span><time datetime="{p['date']}">{fmt(p['date'])}</time> · {minutes(p)} min read</p>
        <h1 class="post__title" id="post-title">{e(p['title'])}</h1>{lead}
      </header>{hero}
      <div class="post__body prose container">
{p['html']}
      </div>
    </article>
    <section class="section" aria-labelledby="more-title">
      <div class="container">
        <div class="cbar"><h2 id="more-title">More from the blog</h2><a class="btn btn--border btn--sm" href="../blog.html">All articles</a></div>
        <ul class="bgrid bgrid--related">
{chr(10).join(card(x) for x in more)}
        </ul>
      </div>
    </section>
  </main>
'''
    block = head_block(f"{p['title']} — BlueMind Blog", p["description"] or p["title"], url, "WebPage",
                       [article], [("Home", f"{SITE}/"), ("Blog", f"{SITE}/blog"), (p["title"], url)],
                       (f"{SITE}/{ph[0]}", ph[1], ph[2]) if ph else None)
    (ROOT / "blog" / f"{p['slug']}.html").write_text(up(head) + up(block) + up(mid) + main + up(foot))


def write_legal(head, mid, foot):
    for f in sorted((ROOT / "content" / "legal").glob("*.json")):
        p = json.loads(f.read_text())
        url = f"{SITE}/{p['slug']}"
        main = f'''  <main id="main">
    <article class="post post--legal" aria-labelledby="legal-title">
      <header class="post__head container">
        <p class="eyebrow">Legal</p>
        <h1 class="post__title" id="legal-title">{e(p['title'])}</h1>
      </header>
      <div class="post__body prose container">
{p['html']}
      </div>
    </article>
  </main>
'''
        block = head_block(f"{p['title']} — BlueMind", p["description"] or f"BlueMind {p['title']}.", url, "WebPage", [],
                           [("Home", f"{SITE}/"), (p["title"], url)])
        (ROOT / f"{p['slug']}.html").write_text(head + block + mid + main + foot)


TITLES = {  # HubSpot titles were split over two lines; these read as one
    "podcast-ai-for-financial-advisors": "AI for Financial Advisors — Landed for Success podcast",
    "podcast-intro-at-insurance-nerds": "Insurance Nerds podcast with Akil Balachandran",
    "podcast-freeing-the-minds-of-advisors": "Freeing the minds of advisors — Insurtech podcast",
    "intro-video-bluemind-app": "BlueMind: designed by advisors, for advisors",
    "podcast-episode-1-challenges-of-a-modern-day-advisor": "Podcast episode 1: challenges of a modern-day advisor",
}
BLOCK_TAGS = ("<p", "<h2", "<h3", "<h4", "<ul", "<ol", "<li", "<blockquote", "<table", "<figure", "<iframe", "<img", "<hr", "</")


def paragraphs(markup):
    """Wrap loose text runs (HubSpot modules outside rich text) in <p> so prose spacing applies."""
    out, run = [], []
    for line in markup.split("\n"):
        t = line.strip()
        if not t:
            continue
        if t.startswith(BLOCK_TAGS) and not t.startswith(("</a", "</strong", "</em")):
            if run:
                out.append("<p>" + " ".join(run) + "</p>")
                run = []
            out.append(t)
        else:
            run.append(t)
    if run:
        out.append("<p>" + " ".join(run) + "</p>")
    return "\n".join(out)


def write_resources(head, mid, foot):
    folder = ROOT / "resources"
    folder.mkdir(exist_ok=True)
    n = 0
    for f in sorted((ROOT / "content" / "resources").glob("*.json")):
        p = json.loads(f.read_text())
        title = TITLES.get(p["slug"], p["title"])
        url = f"{SITE}/resources/{p['slug']}"
        video = "".join(
            f'\n      <div class="post__video container"><iframe src="https://www.youtube-nocookie.com/embed/{v}?rel=0" '
            f'title="{e(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
            for v in p["videos"])
        kind = "Podcast" if "podcast" in p["slug"] and not p["slug"].startswith("recommended") else "Video" if p["videos"] else "Reading list"
        main = f'''  <main id="main">
    <article class="post" aria-labelledby="res-title">
      <header class="post__head container">
        <a class="post__back" href="../resources.html"><i class="icon ph ph-arrow-left" aria-hidden="true"></i>All resources</a>
        <p class="post__meta">{kind}</p>
        <h1 class="post__title" id="res-title">{e(title)}</h1>
        <p class="lead">{e(p['description'])}</p>
      </header>{video}
      <div class="post__body prose container">
{paragraphs(p['html'])}
      </div>
    </article>
  </main>
'''
        block = head_block(f"{title} — BlueMind", p["description"] or title, url, "WebPage", [],
                           [("Home", f"{SITE}/"), ("Resources", f"{SITE}/resources"), (title, url)])
        (folder / f"{p['slug']}.html").write_text(up(head) + up(block) + up(mid) + main + up(foot))
        n += 1
    return n


def main():
    head, mid, foot = chrome()
    all_posts = posts()
    (ROOT / "blog").mkdir(exist_ok=True)
    write_index(all_posts, head, mid, foot)
    for p in all_posts:
        write_post(p, all_posts, head, mid, foot)
    write_legal(head, mid, foot)
    write_resources(head, mid, foot)
    print(f"blog.html + {len(all_posts)} posts in blog/, {len(list((ROOT / 'content' / 'legal').glob('*.json')))} legal pages")


if __name__ == "__main__":
    main()
