#!/usr/bin/env python3
"""One-off import of the HubSpot blog and legal pages into content/ (JSON) and assets/blog/.

  python3 tools/import_hubspot.py            # all blog posts from the live sitemap + legal pages

Body HTML is cleaned to plain semantic tags (no HubSpot classes or inline styles) and every
image is downloaded so nothing is served from HubSpot afterwards. tools/blog.py renders pages.
"""
import hashlib
import html
import json
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public" if (ROOT / "public").is_dir() else ROOT  # published files; content/, i18n/ and tools/ stay at ROOT
SITE = "https://bluemind.app"
UA = {"User-Agent": "Mozilla/5.0 (site migration)"}
LEGAL = ["terms-conditions", "privacy-policy", "cookies-policy", "acceptable-usage-policy"]

KEEP = {"p", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "b", "em", "i", "blockquote", "br",
        "img", "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "iframe", "hr", "sup", "sub"}
ATTRS = {"a": {"href"}, "img": {"src", "alt", "width", "height"}, "iframe": {"src", "title"},
         "td": {"colspan", "rowspan"}, "th": {"colspan", "rowspan"}}
RENAME = {"h1": "h2", "h5": "h4", "h6": "h4", "b": "strong", "i": "em"}
VOID = {"img", "br", "hr"}


def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "replace")


class Clean(HTMLParser):
    """Rebuild markup keeping only KEEP tags and their allowed attributes."""

    def __init__(self, on_img):
        super().__init__(convert_charrefs=False)
        self.out, self.stack, self.skip, self.on_img = [], [], 0, on_img

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg", "form", "button"):
            self.skip += 1
            return
        if self.skip:
            return
        tag = RENAME.get(tag, tag)
        if tag not in KEEP:
            return
        a = dict(attrs)
        keep = []
        for k in sorted(ATTRS.get(tag, ())):
            v = a.get(k)
            if v is None:
                continue
            if tag == "img" and k == "src":
                v = self.on_img(html.unescape(v))
                if not v:
                    return
            if tag == "iframe" and k == "src" and not re.match(r"https://(www\.)?(youtube(-nocookie)?\.com|player\.vimeo\.com|podbean\.com/player)", v):
                return
            if tag == "a" and k == "href":
                v = relink(html.unescape(v))
            keep.append(f' {k}="{html.escape(v, quote=True)}"')
        if tag == "a" and a.get("href", "").startswith("http") and not a["href"].startswith(SITE):
            keep.append(' target="_blank" rel="noopener"')
        if tag == "img":
            keep.append(' loading="lazy"')
        self.out.append(f"<{tag}{''.join(keep)}>")
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg", "form", "button"):
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        tag = RENAME.get(tag, tag)
        if tag in KEEP and tag not in VOID and tag in self.stack:
            while self.stack:
                t = self.stack.pop()
                self.out.append(f"</{t}>")
                if t == tag:
                    break

    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)

    def handle_entityref(self, name):
        if not self.skip:
            self.out.append(f"&{name};")

    def handle_charref(self, name):
        if not self.skip:
            self.out.append(f"&#{name};")

    def result(self):
        s = "".join(self.out) + "".join(f"</{t}>" for t in reversed(self.stack))
        s = s.replace("\xa0", " ").replace("&nbsp;", " ")
        for _ in range(3):  # drop empty wrappers left behind
            s = re.sub(r"<(p|strong|em|h2|h3|h4|li|a)(?: [^>]*)?>\s*</\1>", "", s)
        s = re.sub(r"(<br>\s*){2,}", "<br>", s)
        # HubSpot CTA buttons (tracked redirects) and in-page anchors to removed players
        s = re.sub(r'<a href="https://cta-redirect\.hubspot\.com/[^"]*"[^>]*>.*?</a>', "", s, flags=re.S)
        s = re.sub(r'<a href="#[^"]*">(.*?)</a>', r"\1", s, flags=re.S)
        s = re.sub(r"[ \t]+", " ", s)
        s = re.sub(r"\s*\n\s*", "\n", s)
        return s.strip()


def relink(href):
    """Point links to the old HubSpot pages at their new homes."""
    m = re.match(r"https?://(?:www\.)?bluemind\.app(/[^?#]*)?([?#].*)?$", href)
    if not m:
        return href
    path = (m.group(1) or "/").rstrip("/") or "/"
    frag = m.group(2) if m.group(2) and m.group(2).startswith("#") else ""
    table = {"/about-us": "/about", "/contact-us": "/contact", "/pricing": "/advisor#pricing",
             "/pricing-plans": "/advisor#pricing", "/book-demo": "/advisor#book-demo",
             "/book-demo/team": "/enterprise#demo", "/features": "/advisor#features", "/faqs": "/#faq",
             "/product/bluemind-advisor": "/advisor", "/product/bluemind-harmony": "/enterprise",
             "/why-bluemind": "/about", "/testimonials": "/advisor", "/enterprise-contact": "/enterprise#demo",
             "/product": "/", "/recommended-books": "/resources/recommended-books-for-financial-advisors"}
    return table.get(path, path) + frag


def image_saver(folder):
    folder.mkdir(parents=True, exist_ok=True)
    seen = {}

    def save(src):
        if src.startswith("data:"):
            return None
        if src.startswith("/"):
            src = SITE + src
        if src in seen:
            return seen[src]
        try:
            data = get(src, binary=True)
        except Exception as e:  # keep going; report at the end
            print(f"  ! image failed: {src[:90]} ({e})")
            seen[src] = None
            return None
        ext = {b"\x89P": ".png", b"\xff\xd8": ".jpg", b"GI": ".gif", b"RI": ".webp"}.get(data[:2], ".img")
        if data[:5] == b"<?xml" or data[:4] == b"<svg":
            ext = ".svg"
        name = hashlib.sha1(src.encode()).hexdigest()[:10] + ext
        (folder / name).write_bytes(data)
        seen[src] = f"/{folder.relative_to(PUB).as_posix()}/{name}"
        return seen[src]
    return save


def meta(s, prop):
    m = re.search(rf'<meta (?:name|property)="{prop}" content="([^"]*)"', s)
    return html.unescape(m.group(1)).strip() if m else ""


def import_post(url):
    s = get(url)
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    body = re.search(r'<span id="hs_cos_wrapper_post_body"[^>]*>(.*?)</span>\s*</div>', s, re.S)
    if not body:
        print(f"  ! no body: {url}")
        return None
    c = Clean(image_saver(PUB / "assets" / "blog" / slug))
    c.feed(body.group(1))
    title = re.search(r'class="blog-post__headline"[^>]*>(.*?)</', s, re.S)
    date = re.search(r'"datePublished":\s*"([^"]+)"', s)
    author = re.search(r'blog-post__author-name"[^>]*>\s*(.*?)\s*<', s, re.S)
    tags = [html.unescape(t).strip() for t in re.findall(r'href="[^"]*/blog/tag/[^"]*"[^>]*>([^<]+)</a>', s)]
    return {
        "slug": slug,
        "title": html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else meta(s, "og:title"),
        "description": " ".join(meta(s, "description").split()),
        "date": date.group(1)[:10] if date else "",
        "author": html.unescape(author.group(1)).strip() if author else "BlueMind",
        "tags": list(dict.fromkeys(tags)),
        "html": c.result(),
    }


def import_legal(slug):
    s = get(f"{SITE}/{slug}")
    main = s[s.find("<main"):]
    blocks = re.findall(r'<span id="hs_cos_wrapper_(?:dnd_area|widget)[^"]*_" class="[^"]*rich_text"[^>]*>(.*?)</span></div>', main, re.S)
    title = re.search(r"<h1[^>]*>(.*?)</h1>", "\n".join(blocks), re.S)
    blocks = [b for b in blocks if "<h1" not in b]  # the page title is rendered by the template
    c = Clean(image_saver(PUB / "assets" / "legal"))
    c.feed("\n".join(blocks))
    out = c.result()
    return {"slug": slug, "title": html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else slug,
            "description": " ".join(meta(s, "description").split()), "html": out}


RESOURCES = ["podcast-ai-for-financial-advisors", "podcast-intro-at-insurance-nerds",
             "podcast-freeing-the-minds-of-advisors", "intro-video-bluemind-app",
             "podcast-episode-1-challenges-of-a-modern-day-advisor",
             "recommended-books-for-financial-advisors", "recommended-podcasts-for-financial-advisors"]


def import_resource(slug):
    """Video and reading-list pages (the download pages need their PDFs and aren't imported)."""
    s = get(f"{SITE}/resources/{slug}")
    main = s[s.find("<main"): s.find("</main>")]
    main = main[: main.find("footer-row-0")] if "footer-row-0" in main else main
    title = re.search(r"<h1[^>]*>(.*?)</h1>", main, re.S)
    main = re.sub(r"<h1[^>]*>.*?</h1>", "", main, count=1, flags=re.S)
    c = Clean(image_saver(PUB / "assets" / "resources" / slug))
    c.feed(main)  # whole content area, so "Buy on Amazon"-style button links come along
    videos = list(dict.fromkeys(re.findall(r"youtube(?:-nocookie)?\.com/embed/([\w-]{11})", s)))
    return {"slug": slug, "title": html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else meta(s, "og:title"),
            "description": " ".join(meta(s, "description").split()), "videos": videos, "html": c.result()}


def main():
    sitemap = get(f"{SITE}/sitemap.xml")
    posts = [u for u in re.findall(r"<loc>([^<]+)</loc>", sitemap) if re.search(r"/blog/[^/]+/?$", u)]
    out = ROOT / "content" / "blog"
    out.mkdir(parents=True, exist_ok=True)
    print(f"{len(posts)} posts")
    for u in posts if not ({"--legal", "--resources"} & set(sys.argv)) else []:
        p = import_post(u)
        if p:
            (out / f"{p['slug']}.json").write_text(json.dumps(p, ensure_ascii=False, indent=1))
            print(f"  {p['date']} {p['slug']} ({len(p['html'])} chars)")
        time.sleep(0.3)
    res = ROOT / "content" / "resources"
    res.mkdir(parents=True, exist_ok=True)
    for slug in RESOURCES if "--legal" not in sys.argv else []:  # --resources: only these + legal
        p = import_resource(slug)
        (res / f"{slug}.json").write_text(json.dumps(p, ensure_ascii=False, indent=1))
        print(f"  resource {slug}: {p['title']} ({len(p['html'])} chars, videos {p['videos']})")
    legal = ROOT / "content" / "legal"
    legal.mkdir(parents=True, exist_ok=True)
    for slug in LEGAL:
        p = import_legal(slug)
        (legal / f"{slug}.json").write_text(json.dumps(p, ensure_ascii=False, indent=1))
        print(f"  legal {slug}: {p['title']} ({len(p['html'])} chars)")


if __name__ == "__main__":
    main()
