#!/usr/bin/env python3
"""French version of the site.

The English pages in the repo root are the source. This script copies them into fr/,
swapping every piece of visible copy for its translation in i18n/fr.json.

  python3 tools/i18n.py extract   # list strings with no translation yet -> i18n/todo.json
  python3 tools/i18n.py build     # write fr/*.html and fr/*.js from the English pages

Workflow after changing English copy: run seo.py, then `extract`, translate the strings in
i18n/todo.json into i18n/fr.json, then `build`.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "fr"
DICT = ROOT / "i18n" / "fr.json"
TODO = ROOT / "i18n" / "todo.json"
PAGES = ["index.html", "advisor.html", "enterprise.html", "mia.html", "carriers.html", "partners.html",
         "about.html", "team.html", "brand.html", "contact.html", "resources.html"]
SCRIPTS = ["sections.js", "main.js", "product.js", "company.js", "mia.js"]
LANG = "fr-CA"

SKIP_BLOCKS = re.compile(r"<(script|style|svg|code|pre)\b[^>]*>.*?</\1\s*>", re.S | re.I)
TOKEN = re.compile(r"(<!--.*?-->|<[^>]+>)", re.S)
TEXT_ATTRS = {"alt", "title", "aria-label", "placeholder"}
META_TEXT = re.compile(r'<meta (?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"')
URL_ATTRS = ("href", "src", "poster", "srcset", "data-src", "action")
BLOCK = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "label", "button", "a", "td", "th", "dt", "dd",
         "figcaption", "blockquote", "summary", "title", "option", "legend", "caption"}


def norm(s):
    return " ".join(s.split())


def wordy(s):
    """Visible copy worth translating (has letters; not a bare number, symbol or code)."""
    t = html.unescape(s).strip()
    return bool(re.search(r"[A-Za-z]", t)) and not re.fullmatch(r"[A-Z]{2}|[\w.+-]+@[\w.-]+|https?://\S+|\+?[\d ()-]+", t)


# ---------------------------------------------------------------- HTML

def shield(src):
    """Hide script/style/svg/code blocks behind placeholders so the scanner leaves them alone."""
    kept = []

    def keep(m):
        kept.append(m.group(0))
        return f"\x00{len(kept) - 1}\x00"
    return SKIP_BLOCKS.sub(keep, src), kept


def unshield(src, kept):
    return re.sub(r"\x00(\d+)\x00", lambda m: kept[int(m.group(1))], src)


def walk(src, on_text, on_attr):
    """Yield the page back with text nodes and text attributes passed through the callbacks.
    on_text(key, ctx) / on_attr(key, ctx) return the replacement, or None to keep the original."""
    body, kept = shield(src)
    parts = TOKEN.split(body)
    stack, blocks, out = [], [], []
    # first pass: context text for each block element
    ctx_of = {}
    bid = 0
    texts = []
    for i, p in enumerate(parts):
        if i % 2:
            m = re.match(r"<\s*(/)?\s*([a-zA-Z0-9-]+)", p)
            if not m or p.startswith("<!"):
                continue
            close, tag = m.group(1), m.group(2).lower()
            if tag in BLOCK:
                if close:
                    if stack:
                        stack.pop()
                elif not p.rstrip().endswith("/>"):
                    bid += 1
                    stack.append(bid)
        else:
            if stack:
                ctx_of.setdefault(stack[-1], []).append(p)
            texts.append(stack[-1] if stack else None)
    ctx_text = {k: norm(re.sub(r"\x00\d+\x00", " ", html.unescape("".join(v)))) for k, v in ctx_of.items()}
    ti = 0
    for i, p in enumerate(parts):
        if i % 2 == 0:
            b = texts[ti]
            ti += 1
            ctx = ctx_text.get(b, "") if b else ""
            pieces = re.split(r"(\x00\d+\x00)", p)  # text either side of an inline svg/script
            for j, piece in enumerate(pieces):
                key = norm(piece)
                if j % 2 == 0 and key and wordy(key):
                    new = on_text(key, ctx if ctx != norm(html.unescape(key)) else "")
                    if new is not None:
                        pieces[j] = piece[: len(piece) - len(piece.lstrip())] + new + piece[len(piece.rstrip()):]
            out.append("".join(pieces))
        else:
            out.append(attr_pass(p, on_attr))
    return unshield("".join(out), kept)


def attr_pass(tag, on_attr):
    if tag.startswith("<!") or tag.startswith("</"):
        return tag
    is_meta = bool(META_TEXT.match(tag))

    def rep(m):
        name, val = m.group(1), m.group(2)
        want = name in TEXT_ATTRS or (is_meta and name == "content") or (
            name.startswith("data-") and name not in ("data-src", "data-cal", "data-hubspot", "data-video")
            and " " in val.strip())
        if want and wordy(val):
            new = on_attr(norm(val), f"[{name}]")
            if new is not None:
                return f'{name}="{new}"'
        return m.group(0)
    return re.sub(r'\b([a-zA-Z:-]+)="([^"]*)"', rep, tag)


# ---------------------------------------------------------------- JS

JS_STR = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", re.S)


def js_chunks(src):
    """(start, end, text) for every natural-language piece of a string literal.
    Template literals are split around ${…} so only the static parts are touched."""
    for m in JS_STR.finditer(mask_comments(src)):
        g = 1 if m.group(1) is not None else 2 if m.group(2) is not None else 3
        s, body = m.start(g), m.group(g)
        if g == 3:
            pos = 0
            for seg in re.split(r"(\$\{(?:[^{}]|\{[^{}]*\})*\})", body):
                if not seg.startswith("${"):
                    yield from js_pieces(s + pos, seg)
                pos += len(seg)
        else:
            yield from js_pieces(s, body)


def mask_comments(src):
    """Blank out // and /* */ comments (same length) so apostrophes in them aren't read as quotes."""
    out, i, n, q = [], 0, len(src), None
    while i < n:
        c = src[i]
        if q:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1]); i += 2; continue
            if c == q:
                q = None
            i += 1
        elif c in "'\"`":
            q = c; out.append(c); i += 1
        elif src.startswith("//", i) and (i == 0 or src[i - 1] != ":"):
            j = src.find("\n", i); j = n if j < 0 else j
            out.append(" " * (j - i)); i = j
        elif src.startswith("/*", i):
            j = src.find("*/", i + 2); j = n if j < 0 else j + 2
            out.append(re.sub(r"[^\n]", " ", src[i:j])); i = j
        else:
            out.append(c); i += 1
    return "".join(out)


def js_pieces(start, s):
    # literals that hold markup are split into their text runs, like an HTML page
    if "<" in s and ">" in s:
        pos = 0
        for seg in TOKEN.split(s):
            if not seg.startswith("<") and is_js_copy(seg):
                lead = len(seg) - len(seg.lstrip())
                yield start + pos + lead, start + pos + len(seg.rstrip()), seg.strip()
            pos += len(seg)
    elif is_js_copy(s):
        yield start, start + len(s), s


def is_js_copy(s):
    t = s.strip()
    if not t or not re.search(r"[A-Za-z]", t):
        return False
    if re.match(r"^[.#\[:]|^--|^data-|^aria-|^https?:|^assets/|\.(?:html|svg|js|css|png|jpg|mp4|webm)\b", t):
        return False
    if re.fullmatch(r"[a-z][a-zA-Z0-9_-]*", t):  # identifiers, class names, event names
        return False
    if re.search(r"[{};=]|=>|\(\)|--|__|\"\]|^[()]|\bpx\b|\bcalc\(| > ", t):
        return False
    if re.fullmatch(r"Escape|Enter|Tab|Home|End|Arrow\w+|POST|GET|Content-Type|b span|\d+px( -?\d+%?px)*.*", t):
        return False
    if all(re.fullmatch(r"[a-z][a-z0-9-]*", w) for w in t.split()) and any("-" in w for w in t.split()):
        return False  # class lists
    return " " in t or t[0].isupper()


LD = re.compile(r'(<script type="application/ld\+json">\n)(.*?)(\n  </script>)', re.S)
LD_KEYS = {"name", "description", "text"}


def ld_strings(obj, fn):
    """Apply fn to every translatable string in a JSON-LD graph; returns the new graph."""
    if isinstance(obj, dict):
        return {k: (fn(v) if k in LD_KEYS and isinstance(v, str) and " " in v else ld_strings(v, fn))
                for k, v in obj.items()}
    if isinstance(obj, list):
        return [ld_strings(v, fn) for v in obj]
    return obj


# ---------------------------------------------------------------- commands

def load():
    return json.loads(DICT.read_text()) if DICT.exists() else {}


def extract():
    tr = load()
    todo = {}

    def note(key, ctx, where):
        if key not in tr and key not in todo:
            todo[key] = {"ctx": ctx[:300], "in": where}
        return None
    for f in PAGES:
        src = (ROOT / f).read_text()
        walk(src, lambda k, c: note(k, c, f), lambda k, c: note(k, c, f))
        for m in LD.finditer(src):
            ld_strings(json.loads(m.group(2).replace("<\\/", "</")), lambda v: note(html.escape(v, quote=False), "[structured data]", f) or v)
    for f in SCRIPTS:
        src = (ROOT / f).read_text()
        for _, _, t in js_chunks(src):
            note(t, "", f)
    TODO.parent.mkdir(exist_ok=True)
    TODO.write_text(json.dumps(todo, ensure_ascii=False, indent=1))
    print(f"{len(todo)} strings need a translation -> {TODO.relative_to(ROOT)}")


def local_url(v, pages):
    """Rewrite a relative URL from the root so it still works from fr/."""
    if not v or re.match(r"^(?:[a-z]+:|//|#|\?)", v, re.I):
        return v
    if v.startswith("/"):
        return "/fr/" if v == "/" else v
    path = re.split(r"[#?]", v)[0]
    return v if path in pages else "../" + v


def build():
    tr = load()
    missing = set()

    def t(key, _ctx=""):
        if key in tr:
            return tr[key]
        missing.add(key)
        return None
    OUT.mkdir(exist_ok=True)
    pages = set(PAGES) | set(SCRIPTS)  # these have French copies inside fr/
    for f in PAGES:
        src = (ROOT / f).read_text()
        out = walk(src, t, t)
        out = LD.sub(lambda m: m.group(1) + json.dumps(
            ld_strings(json.loads(m.group(2).replace("<\\/", "</")),
                       lambda v: html.unescape(t(html.escape(v, quote=False)) or html.escape(v, quote=False))),
            ensure_ascii=False, indent=1).replace("</", "<\\/") + m.group(3), out)
        # URLs: pages stay side by side inside fr/, everything else points back up to the root
        out = re.sub(r'\b(' + "|".join(URL_ATTRS) + r')="([^"]*)"',
                     lambda m: f'{m.group(1)}="{local_url(m.group(2), pages)}"', out)
        out = re.sub(r'url\((["\']?)(?!data:|https?:|/|#)([^)"\']+)\1\)', r'url(\1../\2\1)', out)
        out = out.replace('<html lang="en">', f'<html lang="{LANG}">', 1)
        out = fix_head(out, f)
        out = switcher(out)
        (OUT / f).write_text(out)
    for f in SCRIPTS:
        src = (ROOT / f).read_text()
        chunks = list(js_chunks(src))
        for s, e, txt in reversed(chunks):
            new = t(txt)
            if new is not None:
                src = src[:s] + new.replace("\\", "\\\\").replace(quote_at(src, s), "\\" + quote_at(src, s)) + src[e:]
        src = re.sub(r"(['\"`])assets/", r"\1../assets/", src)
        src = src.replace('href="assets/', 'href="../assets/').replace("href='assets/", "href='../assets/")
        (OUT / f).write_text(src)
    if missing:
        TODO.write_text(json.dumps({k: {} for k in sorted(missing)}, ensure_ascii=False, indent=1))
        print(f"WARNING: {len(missing)} strings left in English -> {TODO.relative_to(ROOT)}")
    print(f"built {len(PAGES)} pages and {len(SCRIPTS)} scripts into fr/")


def quote_at(src, i):
    """The quote character of the literal that contains position i."""
    j = i - 1
    depth = 0
    while j >= 0:
        c = src[j]
        if c in "'\"`" and (j == 0 or src[j - 1] != "\\"):
            return c
        j -= 1
    return "'"


def fix_head(out, f):
    en = "https://bluemind.app/" + ("" if f == "index.html" else f)
    fr = "https://bluemind.app/fr/" + ("" if f == "index.html" else f)
    out = out.replace(f'<link rel="canonical" href="{en}" />', f'<link rel="canonical" href="{fr}" />')
    out = out.replace(f'<meta property="og:url" content="{en}" />', f'<meta property="og:url" content="{fr}" />')
    out = out.replace('<meta property="og:locale" content="en_CA" />',
                      '<meta property="og:locale" content="fr_CA" />\n  <meta property="og:locale:alternate" content="en_CA" />')
    out = out.replace('"inLanguage": "en"', '"inLanguage": "fr-CA"')
    out = out.replace(f'"url": "{en}"', f'"url": "{fr}"').replace(f'"@id": "{en}#', f'"@id": "{fr}#')
    out = out.replace('href="../site.webmanifest"', 'href="/site.webmanifest"')
    return out


def switcher(out):
    """Mark French as the current language in the static markup (JS keeps it in sync)."""
    out = out.replace('data-lang="en" lang="en" aria-current="true"', 'data-lang="en" lang="en"')
    out = out.replace('data-lang="fr" lang="fr">', 'data-lang="fr" lang="fr" aria-current="true">', 1)
    out = out.replace('data-lang="en" lang="en" aria-pressed="true"', 'data-lang="en" lang="en" aria-pressed="false"')
    out = out.replace('data-lang="fr" lang="fr" aria-pressed="false"', 'data-lang="fr" lang="fr" aria-pressed="true"')
    out = re.sub(r'(<span class="lang__code">)EN(</span>)', r"\1FR\2", out)
    return out


if __name__ == "__main__":
    {"extract": extract, "build": build}[sys.argv[1] if len(sys.argv) > 1 else "build"]()
