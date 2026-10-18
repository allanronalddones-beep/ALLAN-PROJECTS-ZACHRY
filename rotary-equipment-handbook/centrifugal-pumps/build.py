#!/usr/bin/env python
"""
Static site builder for the Centrifugal Pump Knowledge Base.

Reads  : src/manifest.json  + src/content/*.html   + src/template.html
Writes : index.html, pages/*.html, assets/search-index.json

Stdlib only. Run from the project root:

    python build.py
    python build.py --serve     # build, then serve on http://localhost:8975
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
CONTENT = SRC / "content"
PAGES_DIR = ROOT / "pages"
ASSETS = ROOT / "assets"

PORT = 8975


# --------------------------------------------------------------------------
# Navigation
# --------------------------------------------------------------------------
def build_nav(manifest: dict, current: str, root_path: str) -> str:
    """Render the sidebar navigation, flagging the current page."""
    home_cls = ' class="current" aria-current="page"' if current == "index" else ""
    out = [
        '<nav class="nav-group" aria-label="Main">',
        '<p class="nav-title">Start here</p>',
        '<ul class="nav-list">',
        f'<li><a href="{root_path}index.html"{home_cls}>'
        '<span class="nav-num">⌂</span><span>Overview</span></a></li>',
        "</ul></nav>",
    ]

    for group in manifest["groups"]:
        pages = [p for p in manifest["pages"] if p["group"] == group["id"]]
        if not pages:
            continue
        out.append('<nav class="nav-group">')
        out.append(f'<p class="nav-title">{html.escape(group["title"])}</p>')
        out.append('<ul class="nav-list">')
        for p in pages:
            cls = ' class="current" aria-current="page"' if p["slug"] == current else ""
            out.append(
                f'<li><a href="{root_path}pages/{p["slug"]}.html"{cls}>'
                f'<span class="nav-num">{html.escape(p["num"])}</span>'
                f'<span>{html.escape(p["nav"])}</span></a></li>'
            )
        out.append("</ul></nav>")

    return "\n".join(out)


def build_pager(manifest: dict, idx: int, root_path: str) -> str:
    """Previous / next links across the ordered page list."""
    pages = manifest["pages"]
    prev_p = pages[idx - 1] if idx > 0 else None
    next_p = pages[idx + 1] if idx < len(pages) - 1 else None
    if not prev_p and not next_p:
        return ""

    parts = ['<nav class="pager" aria-label="Page navigation">']
    if prev_p:
        parts.append(
            f'<a class="prev" href="{root_path}pages/{prev_p["slug"]}.html">'
            f'<span class="dir">← Previous</span>'
            f'<span class="ttl">{html.escape(prev_p["nav"])}</span></a>'
        )
    if next_p:
        parts.append(
            f'<a class="next" href="{root_path}pages/{next_p["slug"]}.html">'
            f'<span class="dir">Next →</span>'
            f'<span class="ttl">{html.escape(next_p["nav"])}</span></a>'
        )
    parts.append("</nav>")
    return "\n".join(parts)


# --------------------------------------------------------------------------
# Search index
# --------------------------------------------------------------------------
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")
# split the article on h2/h3 so a hit lands on the right section
SECTION_RE = re.compile(
    r'<(h2|h3)\b[^>]*\bid="([^"]+)"[^>]*>(.*?)</\1>(.*?)(?=<h2\b|<h3\b|\Z)',
    re.S | re.I,
)
HEADING_ID_RE = re.compile(r'<(h2|h3)\b([^>]*)>(.*?)</\1>', re.S | re.I)


def slugify(text: str) -> str:
    text = TAG_RE.sub("", text).lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return re.sub(r"-+", "-", text)


def ensure_heading_ids(body: str) -> str:
    """Give every h2/h3 a stable id so search results and the TOC agree."""
    used: set[str] = set()

    def repl(m: re.Match) -> str:
        tag, attrs, inner = m.group(1), m.group(2), m.group(3)
        existing = re.search(r'\bid="([^"]+)"', attrs)
        if existing:
            used.add(existing.group(1))
            return m.group(0)
        base = slugify(inner) or "section"
        sid, n = base, 2
        while sid in used:
            sid = f"{base}-{n}"
            n += 1
        used.add(sid)
        return f"<{tag}{attrs} id=\"{sid}\">{inner}</{tag}>"

    return HEADING_ID_RE.sub(repl, body)


def text_of(fragment: str) -> str:
    txt = re.sub(r"<(script|style)\b.*?</\1>", " ", fragment, flags=re.S | re.I)
    txt = TAG_RE.sub(" ", txt)
    txt = html.unescape(txt)
    return WS_RE.sub(" ", txt).strip()


def index_page(page: dict, body: str, url: str) -> list[dict]:
    """One index entry for the page itself, one per h2/h3 section."""
    entries = [
        {
            "u": url,
            "p": page["nav"],
            "t": page["title"],
            "b": text_of(page.get("lede", ""))[:600] + " " + text_of(body)[:900],
        }
    ]
    for m in SECTION_RE.finditer(body):
        hid, heading, section = m.group(2), text_of(m.group(3)), text_of(m.group(4))
        if not section:
            continue
        entries.append(
            {
                "u": f"{url}#{hid}",
                "p": f"{page['nav']} › {page['num']}",
                "t": heading,
                "b": section[:1400],
            }
        )
    return entries


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------
def build() -> int:
    manifest = json.loads((SRC / "manifest.json").read_text(encoding="utf-8"))
    template = (SRC / "template.html").read_text(encoding="utf-8")
    pages = manifest["pages"]
    PAGES_DIR.mkdir(exist_ok=True)
    ASSETS.mkdir(exist_ok=True)

    search: list[dict] = []
    written = 0

    def render(page: dict, body: str, root_path: str, out_path: Path, pager: str) -> None:
        nonlocal written
        toc_class = "" if page.get("no_toc") else " has-toc"
        toc_html = "" if page.get("no_toc") else '<aside class="toc"><h2>On this page</h2></aside>'
        head_extra = page.get("head", "")

        site_name = "Centrifugal Pump Knowledge Base"
        page_title = (
            site_name
            if page["title"] == site_name
            else f"{page['title']} · {site_name}"
        )

        page_html = template
        for key, val in {
            "{{PAGE_TITLE}}": html.escape(page_title),
            "{{TITLE}}": html.escape(page["title"]),
            "{{DESCRIPTION}}": html.escape(text_of(page.get("lede", ""))[:180]),
            "{{ROOT}}": root_path,
            "{{NAV}}": build_nav(manifest, page["slug"], root_path),
            "{{CRUMBS}}": page.get("crumbs", ""),
            "{{EYEBROW}}": (
                f'<p class="eyebrow">{html.escape(page["eyebrow"])}</p>'
                if page.get("eyebrow")
                else ""
            ),
            "{{H1}}": html.escape(page["title"]),
            "{{LEDE}}": (
                f'<p class="lede">{page["lede"]}</p>' if page.get("lede") else ""
            ),
            "{{BODY}}": body,
            "{{PAGER}}": pager,
            "{{TOC_CLASS}}": toc_class,
            "{{TOC}}": toc_html,
            "{{HEAD_EXTRA}}": head_extra,
        }.items():
            page_html = page_html.replace(key, val)

        out_path.write_text(page_html, encoding="utf-8")
        written += 1

    # --- landing page ---
    home = manifest["home"]
    home_body = ensure_heading_ids(
        (CONTENT / home["content"]).read_text(encoding="utf-8")
    )
    render(home, home_body, "./", ROOT / "index.html", "")
    search.extend(index_page(home, home_body, "index.html"))

    # --- chapter pages ---
    for i, page in enumerate(pages):
        src_file = CONTENT / page["content"]
        if not src_file.exists():
            print(f"  ! missing content: {src_file.name}", file=sys.stderr)
            continue
        body = ensure_heading_ids(src_file.read_text(encoding="utf-8"))
        pager = build_pager(manifest, i, "../")
        render(page, body, "../", PAGES_DIR / f"{page['slug']}.html", pager)
        search.extend(index_page(page, body, f"pages/{page['slug']}.html"))

    (ASSETS / "search-index.json").write_text(
        json.dumps(search, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    kb = (ASSETS / "search-index.json").stat().st_size / 1024
    print(f"  {written} pages written")
    print(f"  {len(search)} search entries ({kb:.0f} KB index)")
    return 0


def serve() -> None:
    import http.server
    import socketserver

    os.chdir(ROOT)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"\n  Serving at http://localhost:{PORT}/index.html   (Ctrl+C to stop)\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Stopped.")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--serve", action="store_true", help="serve the site after building")
    args = ap.parse_args()

    print("Building Centrifugal Pump Knowledge Base...")
    rc = build()
    if rc == 0 and args.serve:
        serve()
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
