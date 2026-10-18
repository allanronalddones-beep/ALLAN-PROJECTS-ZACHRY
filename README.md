# ALLAN-PROJECTS-ZACHRY

**Central database of engineering tools created for Zachry Philippines.**

Engineering references, handbooks and calculators — each one a self-contained static
site that runs in any browser with no installation, no licence and no network once the
page is open.

🔗 **Live site:** https://allanronalddones-beep.github.io/ALLAN-PROJECTS-ZACHRY/

---

## What's in here

| Tool | Status | Path |
|---|---|---|
| [Centrifugal Pump Knowledge Base](rotary-equipment-handbook/centrifugal-pumps/) | ✅ Live | `rotary-equipment-handbook/centrifugal-pumps/` |
| Material Selection per API 610 | 🔸 Planned | — |
| Performance Evaluation | 🔸 Planned | — |
| Centrifugal Compressors | 🔸 Planned | — |
| Steam & Gas Turbines | 🔸 Planned | — |
| Fans & Blowers | 🔸 Planned | — |

---

## Structure

Tools are grouped by discipline, one folder per discipline handbook, one folder per tool
inside it.

```
/
├── index.html                          Engineering Tools Database — the hub
├── .nojekyll                           stops GitHub running Jekyll over the site
├── README.md                           this file
│
└── rotary-equipment-handbook/
    ├── index.html                      handbook hub — lists its tools
    └── centrifugal-pumps/              a tool, entirely self-contained
        ├── index.html                  the tool's own landing page
        ├── pages/                      generated content pages
        ├── assets/                     its CSS, JS and search index
        ├── src/                        its source files — edit these
        ├── tools/check_links.py        its link checker
        ├── build.py                    its build script
        ├── README.md                   how that tool is built
        └── NOTICE.md                   its copyright and attribution
```

**Every tool is self-contained.** It can be opened from the live site, copied to a laptop,
or carried on a USB stick, and it will still work. Nothing is shared between tools, so one
tool can never break another — and a tool can be handed to someone as a folder.

---

## Adding a new tool

1. Create the folder — `<discipline>-handbook/<tool-name>/`. Use
   **lowercase-with-hyphens** for folder names; spaces become `%20` in URLs and are
   awkward to type and link.
2. Build the tool so that `index.html` sits at the root of its own folder and every
   internal link is **relative**. That is what lets it work from any location.
3. Add a card for it on the discipline handbook's `index.html`, and on the root
   `index.html` if it should appear on the main hub.
4. If the discipline is new, copy `rotary-equipment-handbook/index.html` as the starting
   point for the new handbook hub.
5. Commit and push. GitHub Pages republishes automatically — usually within a minute.

### Conventions

- **Relative links only.** No absolute paths and no leading `/`, or the tool breaks when
  opened from the file system.
- **No CDN dependencies.** Everything needed must be in the folder, so the tool works
  offline.
- **Light and dark themes**, and a layout that works on a phone — these get used on site,
  on whatever device is to hand.
- **Flag indicative values.** Where a number comes from a standard, name the standard and
  the edition, and say that it is indicative.

---

## Working on the pump knowledge base

It is generated from source files — **do not edit the HTML in `pages/` directly**, it is
overwritten on every build.

```bash
cd rotary-equipment-handbook/centrifugal-pumps
python build.py              # regenerate pages/ index.html and the search index
python tools/check_links.py  # verify every internal link and anchor
python build.py --serve      # build, then serve at http://localhost:8975
```

Requires Python 3 only — standard library, nothing to install. Full detail in that tool's
own [README](rotary-equipment-handbook/centrifugal-pumps/README.md).

---

## GitHub Pages

Served from the repository root of branch `main`. `.nojekyll` at the root is what stops
GitHub trying to process the files with Jekyll — **keep it there**, or folders and files
beginning with an underscore will stop being served.

Settings → Pages → Source: *Deploy from a branch* · Branch: `main` · Folder: `/ (root)`

---

## Status and disclaimer

These tools are **engineering references and aids**. They are not design codes, standards
or project specifications, and they do not replace any of them.

> For any design, procurement, acceptance, repair or operating decision, work from the
> current edition of the governing standard, the project specification, and the equipment
> manufacturer's data for the actual machine. Where a tool here conflicts with those
> documents, **those documents govern.**

Each tool carries its own `NOTICE.md` with copyright, attribution and sources.

Copyright © 2026 Zachry Philippines. All rights reserved.

---

## Contributing

Corrections and additions from project experience are what keep these useful. Edit the
tool's source files, rebuild, run its link check, and commit both the source and the
regenerated output.
