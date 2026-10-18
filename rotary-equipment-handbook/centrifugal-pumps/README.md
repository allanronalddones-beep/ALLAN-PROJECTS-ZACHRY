# Centrifugal Pump Knowledge Base

An internal engineering reference for Zachry Philippines, covering centrifugal pump
hydraulics, construction, rotor forces, specification, testing, installation, maintenance
and field troubleshooting.

Static HTML site — no runtime dependencies, no framework, no CDN. It works from a local
folder, a USB stick, an internal web server or GitHub Pages.

---

## Contents

| | Page | Covers |
|---|---|---|
| — | Overview | Landing page, the ten recurring root causes of pump trouble |
| 01 | Fundamentals & types | PD vs roto-dynamic, centrifugal construction families, sealless pumps, design standards |
| 02 | Design & construction | Impellers, casings and recuperators, wear rings, shafts, packing, mechanical seals, bearing housings, couplings |
| 03 | Hydraulics & NPSH | Head, system resistance, efficiency and power, curves, affinity and viscosity corrections, specific speed, cavitation, recirculation, NPSH |
| 04 | Rotor forces | Axial thrust by impeller type, balancing drums, radial load by casing type, shaft deflection, bearing load |
| 05 | Operation & curves | Curve stability and steepness, velocity triangles, parallel/series operation, speed–torque, regulation methods, allowable operating region |
| 06 | Specification & selection | System analysis, flow requirements, fluid and criticality, data sheet, bid request and analysis |
| 07 | Testing & inspection | Material and NDE acceptance, hydrotest, performance test and tolerances, NPSH test |
| 08 | Installation & commissioning | Foundation, grouting, alignment and soft foot, suction/discharge piping rules, pre-operational checks, start-up |
| 09 | Maintenance & reliability | Four-pillar condition monitoring, strip-down limits, reassembly (single-stage, vertical, multistage), Gap-A/Gap-B, overhaul economics |
| 10 | Troubleshooting | 16 reported symptoms with cause lists, filterable and searchable, plus a reverse cause index |
| 11 | Calculators | NPSH-a and margin, affinity scaling, Ns/Nss, power and motor sizing, temperature rise, system head |
| 12 | Formula & data sheet | Every equation, clearance, tolerance and limit on one printable page |
| 13 | Glossary | Working definitions of the terminology used throughout |
| 14 | Standards & sources | Which standard governs which decision, sources, and scope |

---

## Local build and preview

Requires Python 3 only (standard library — no `pip install`).

```bash
python build.py
```

Build and serve in one step:

```bash
python build.py --serve
```

Then open <http://localhost:8975/index.html>.

> **Serve over HTTP rather than opening `index.html` from the file system.**
> Site search fetches `assets/search-index.json`, which browsers block on `file://`
> for security reasons. Everything else — including all six calculators — works fine
> from the file system; only search degrades, and it says so when it does.

---

## How it is built

```
src/
  manifest.json       page list, navigation groups, titles, ledes
  template.html       the single page shell (header, nav, TOC, footer, search)
  content/*.html      one content fragment per page — the article body only
build.py              renders pages/ + index.html, generates the search index
assets/
  site.css            design tokens, light/dark themes, print styles
  site.js             theme, nav, TOC scrollspy, search, filters, calculators
  search-index.json   generated — do not edit
index.html            generated — do not edit
pages/*.html          generated — do not edit
```

**Edit the files in `src/`, never the generated HTML.** `build.py` regenerates
`index.html`, `pages/` and `assets/search-index.json` from them. Keeping the page shell in
one template is what stops the navigation drifting out of step across fifteen pages.

### Adding a page

1. Write the article body as `src/content/15-my-topic.html` — just the content, starting at
   the first `<h2>`. No `<html>`, `<head>`, `<h1>` or navigation.
2. Add an entry to the `pages` array in `src/manifest.json` (`slug`, `num`, `group`, `nav`,
   `title`, `eyebrow`, `crumbs`, `lede`, `content`).
3. Run `python build.py`.

Navigation, previous/next links, the on-page table of contents, heading anchors and the
search index are all generated. Headings get stable `id`s automatically; add an explicit
`id` to an `<h4>` if you want to link to it, since only `h2` and `h3` are done
automatically.

### Checking links before committing

```bash
python tools/check_links.py
```

Verifies that every internal `href` resolves to a real file and that every `#anchor`
exists on the target page.

---

## Publishing to GitHub Pages

The repository root is the site root, so no workflow or build step is needed on
GitHub's side.

1. Commit the generated output as well as `src/` — GitHub Pages serves the files as they
   are.
2. Push to GitHub.
3. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.

`.nojekyll` is present, which stops GitHub trying to run Jekyll over the files.

Re-run `python build.py` and commit before every push, or the published site will not
match `src/`.

---

## Conventions used in the content

- **Units.** SI throughout, except **specific speed and suction specific speed**, which are
  given in the conventional US units (gpm, ft, rpm) because every empirical limit in the
  literature is stated that way. Conversions are on the formula sheet.
- **Indicative values are flagged.** Clearances, tolerances and acceptance criteria carry a
  note naming the standard and edition they came from.
- **Uncertainty is stated, not smoothed over.** Where sources conflict — the off-BEP loss
  exponent, the Nss 11 000 limit — the page says so rather than picking one silently.
- **Cross-references are links.** If a topic is treated properly elsewhere, the text links
  there instead of repeating it.

---

## Scope and status

See [NOTICE.md](NOTICE.md) for copyright, attribution and the disclaimer.

This is a **reference and training aid**. It is not a design code, a standard, or a project
specification, and it does not replace any of them.

It is **original reference material** written to cover the engineering subject matter. Its
technical scope and chapter structure follow *Practical Centrifugal Pumps: Design,
Operation and Maintenance* by P. Girdhar and O. Moniz (Newnes/Elsevier, 2005), which
remains the recommended full text. **No text or figures from that book, or from any other
publication, are reproduced here.** Factual values are attributed to their sources on the
*Standards & Sources* page.

> **For any design, procurement, acceptance, repair or operating decision, work from the
> current edition of the governing standard, the project specification, and the OEM manual
> for the actual machine.** Where this knowledge base conflicts with those documents, those
> documents govern.

Standards referenced (API 610, API 682, ANSI/ASME B73, ISO 5199, NFPA 20, Hydraulic
Institute, ASME Section VIII) are cited for orientation only, and several of the editions
cited have since been superseded — the *Standards & Sources* page lists the values most
likely to have moved.

---

## Contributing

Corrections and additions from project experience are what keep this useful. Edit the
relevant file in `src/content/`, run `python build.py`, run the link check, and commit both
the source and the regenerated output.
