#!/usr/bin/env python
"""
Verify every internal link in the generated site.

Checks that each relative href resolves to a real file, and that each #anchor
exists as an id on the target page. Run after `python build.py`:

    python tools/check_links.py

Exits non-zero if anything is broken, so it can be used in a pre-commit hook.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HREF_RE = re.compile(r'href="([^"]+)"')
ID_RE = re.compile(r'\sid="([^"]+)"')
EXTERNAL = ("http://", "https://", "data:", "mailto:", "#!")


def main() -> int:
    files = [ROOT / "index.html"] + sorted((ROOT / "pages").glob("*.html"))
    files = [f for f in files if f.exists()]

    if not files:
        print("No generated pages found. Run `python build.py` first.")
        return 1

    ids: dict[str, set[str]] = {}
    for f in files:
        ids[f.name] = set(ID_RE.findall(f.read_text(encoding="utf-8")))

    broken: list[tuple[str, str, str]] = []

    for f in files:
        text = f.read_text(encoding="utf-8")
        for href in HREF_RE.findall(text):
            if href.startswith(EXTERNAL):
                continue

            target, _, fragment = href.partition("#")

            if not target:  # same-page anchor
                if fragment and fragment not in ids[f.name]:
                    broken.append((f.name, href, "missing anchor on this page"))
                continue

            resolved = (f.parent / target).resolve()

            # Links that deliberately point above the knowledge base — the "up"
            # link to the rotary equipment handbook — only resolve once this is
            # published inside the engineering tools database. Skip them.
            if ROOT not in resolved.parents and resolved != ROOT:
                continue

            if not resolved.exists():
                broken.append((f.name, href, "missing file"))
                continue

            base = os.path.basename(target)
            if fragment and base in ids and fragment not in ids[base]:
                broken.append((f.name, href, f"missing anchor in {base}"))

    print(f"Checked {len(files)} pages.")
    if broken:
        print(f"\n{len(broken)} broken link(s):\n")
        for page, href, why in broken:
            print(f"  {page:26} -> {href:72} [{why}]")
        return 1

    print("All internal links and anchors resolve.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
