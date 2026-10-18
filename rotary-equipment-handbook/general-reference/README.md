# Rotating Equipment General Reference

A cross-cutting engineering reference for rotating machinery — pumps, compressors,
turbines, expanders, and the materials, electrical, construction and operation topics
that surround them.

Fourteen chapters, 141 searchable sections, four original figures. Opens in any browser
with no installation and no network.

**Live:** <https://allanronalddones-beep.github.io/ALLAN-PROJECTS-ZACHRY/rotary-equipment-handbook/general-reference/>

---

## Where this sits

This is the **general** reference — breadth across every machine family, at the depth you
need for selection, review and a field decision. The dedicated tools in this handbook go
deep on one machine: start here to orient, go there to work.

| Chapter | Covers |
|---:|---|
| 1 | Units, Conversions & Formulas — constants, conversion tables, interactive converter, working formulas |
| 2 | Standards — API, ISO, ASME, IEC, NEMA; how the families map, how to read a citation |
| 3 | Materials — classes, temperature limits, hardness, corrosion and sour service, P–T ratings |
| 4 | Pump Selection — API 610 types, affinity laws, specific speed, curves, NPSH, PD pumps |
| 5 | Compressor Selection — coverage map, fans and blowers, polytropic head, surge, rod load |
| 6 | Expander Selection — cryogenic turboexpanders, hot gas power recovery |
| 7 | Steam Turbine Selection — classification, steam rate, Mollier, governing, overspeed |
| 8 | Gas Turbine Selection — types, heat rate, site derating, fuel and emissions |
| 9 | Coupling — types, torque cases, service factors, torsional, API 671 |
| 10 | Heat Exchanger — TEMA designation, LMTD, fouling, air coolers, package coolers |
| 11 | Electrical — motors, hazardous area, explosion protection, IP and NEMA |
| 12 | Trade Terms — Incoterms® 2020, risk transfer, insurance, procurement guidance |
| 13 | Construction — foundations, balancing, vibration, alignment, bolting |
| 14 | Operation — start-up and running checks, troubleshooting, lubrication |

Written for a tropical, 60 Hz, coastal context wherever that changes the engineering
answer — ambient derating, 60 Hz speeds, moisture in bearing housings, Type 4X enclosures.

---

## Using it

Open `index.html`. Everything is relative, so it works from the live site, from a copied
folder, or from a USB stick with no network.

- **Search** — press `/` anywhere. Arrow keys and Enter to navigate.
- **Convert** — the converter in §1.2.2 covers fourteen quantity types and shows the
  factor behind every pair.
- **Print** — Ctrl+P on any chapter. Navigation, search and the converter are suppressed;
  tables and equations avoid page breaks and table headers repeat.

---

## How it is built

Hand-written HTML. There is no page generator and no build step for content — edit the
chapter file directly.

```bash
python tools/build_search_index.py   # after editing any chapter
```

That is the one generated artefact. It rebuilds `assets/search-index.js` from each
section's own text.

### Layout

```
general-reference/
├── index.html                      landing page and chapter grid
├── ch01-units-formulas.html        … through …
├── ch14-operation.html
├── assets/
│   ├── reference.css               one stylesheet: screen, print, light, dark
│   ├── reference.js                search and the unit converter
│   └── search-index.js             GENERATED — do not hand-edit
├── tools/build_search_index.py     regenerates the search index
├── SOURCES.md                      standards cited, by chapter
└── NOTICE.md                       copyright, attribution and disclaimer
```

### Adding or editing a chapter

1. Copy an existing chapter as the template — it carries the masthead, TOC, section,
   table and callout patterns.
2. Keep the heading markup exactly:
   `<h2 id="sX-Y"><span class="sec-no">X.Y</span>Title</h2>`. The index generator keys
   off it and will silently skip a section that deviates.
3. Run `python tools/build_search_index.py`.
4. Add the chapter to the grid in `index.html` and to the table above.
5. End the chapter with a **Sources** section citing standards by number and clause.

### Two constraints worth knowing

- **No `fetch()`.** It is blocked under `file://`, which is why the search index is a
  `.js` file assigning `window.REF_INDEX` rather than the `.json` you might expect.
- **Equations are native MathML**, not a typesetting library. They stay searchable,
  selectable and correct in print, and nothing has to be downloaded. Chrome and Edge
  109+, Firefox and Safari all render it.

### House rules this follows

Relative links only · no CDN dependencies · light and dark themes · works at phone width ·
indicative values flagged as indicative, with the standard and edition named.

---

## Status and disclaimer

An engineering reference and aid. **Not** a design code, standard or project
specification, and not a substitute for any of them. For any design, procurement,
acceptance, repair or operating decision, work from the current edition of the governing
standard, the project specification, and the manufacturer's data for the actual machine.
Where this conflicts with those documents, **those documents govern.**

Copyright and attribution: [NOTICE.md](NOTICE.md).
