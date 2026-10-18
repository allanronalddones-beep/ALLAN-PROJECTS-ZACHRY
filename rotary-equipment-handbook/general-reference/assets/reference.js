/* ==========================================================================
   Rotating Equipment General Reference — shared behaviour
   No dependencies. Must work from file:// — so nothing here uses fetch().
   The search index is loaded as a plain script (assets/search-index.js)
   that assigns window.REF_INDEX, because fetch() is blocked on file://.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- search */

  function initSearch() {
    var input = document.getElementById('site-search');
    var panel = document.getElementById('search-results');
    if (!input || !panel) return;

    var index = window.REF_INDEX || [];
    var base = document.body.getAttribute('data-base') || '';
    var cursor = -1;

    /* Matching is per token, not per substring. Substring matching made
       "rod" hit "product", which put sealless pumps above reciprocating
       compressors for "rod load". Tokens are compared whole, with a prefix
       match so partial typing still finds things.

       Three weighted fields: the section title, then its own sub-headings
       and table captions ("head"), then its body text ("terms"). Without
       that split, a section that merely mentions a term ties with the
       section the term actually titles. */
    function tokenize(s) {
      return String(s).toLowerCase()
        /* Hyphens separate, on both sides of the index. Source text mixes
           "star-delta" and "star–delta"; splitting makes them equal. */
        .split(/[^a-z0-9₀-₉+/·°%]+/)
        .filter(function (w) { return w.length > 0; });
    }

    function prepare(e) {
      if (e._t) return e;
      e._title = tokenize(e.ref + ' ' + e.title);
      e._head = new Set(tokenize(e.head || ''));
      e._t = new Set(tokenize((e.head || '') + ' ' + (e.terms || '') + ' ' + e.chapter));
      return e;
    }

    function hit(set, term) {
      if (set.has(term)) return 2;
      for (var w of set) if (w.length > term.length && w.indexOf(term) === 0) return 1;
      return 0;
    }

    function score(entry, terms) {
      prepare(entry);
      var total = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var body = hit(entry._t, t);
        if (!body) return 0;
        total += body;
        if (hit(entry._head, t)) total += 4;
        for (var j = 0; j < entry._title.length; j++) {
          if (entry._title[j] === t) { total += 10; break; }
          if (entry._title[j].indexOf(t) === 0) { total += 6; break; }
        }
      }
      return total;
    }

    function render(list) {
      panel.innerHTML = '';
      cursor = -1;
      if (!list.length) {
        panel.innerHTML = '<div class="sr-empty">No matching section.</div>';
        panel.classList.add('open');
        return;
      }
      list.forEach(function (e) {
        var a = document.createElement('a');
        a.href = base + e.url;
        a.innerHTML = '<span class="sr-ref"></span><span class="sr-title"></span><span class="sr-ch"></span>';
        a.querySelector('.sr-ref').textContent = e.ref;
        a.querySelector('.sr-title').textContent = e.title;
        a.querySelector('.sr-ch').textContent = e.chapter;
        panel.appendChild(a);
      });
      panel.classList.add('open');
    }

    function run() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { panel.classList.remove('open'); return; }
      var terms = tokenize(q);
      /* A lone letter or digit matches almost everything and only dilutes a
         multi-word query: "iso 20816-3" should not hinge on "3". */
      if (terms.length > 1) {
        var kept = terms.filter(function (t) { return t.length > 1; });
        if (kept.length) terms = kept;
      }
      var hits = [];
      for (var i = 0; i < index.length; i++) {
        var s = score(index[i], terms);
        if (s > 0) hits.push({ s: s, e: index[i] });
      }
      hits.sort(function (a, b) { return b.s - a.s; });
      render(hits.slice(0, 12).map(function (h) { return h.e; }));
    }

    function move(delta) {
      var items = panel.querySelectorAll('a');
      if (!items.length) return;
      if (cursor >= 0) items[cursor].classList.remove('active');
      cursor = (cursor + delta + items.length) % items.length;
      items[cursor].classList.add('active');
      items[cursor].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', run);
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) run(); });

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
      else if (ev.key === 'Enter') {
        var items = panel.querySelectorAll('a');
        if (cursor >= 0 && items[cursor]) { ev.preventDefault(); items[cursor].click(); }
      } else if (ev.key === 'Escape') { panel.classList.remove('open'); input.blur(); }
    });

    document.addEventListener('click', function (ev) {
      if (!panel.contains(ev.target) && ev.target !== input) panel.classList.remove('open');
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && document.activeElement !== input &&
          !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        ev.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  /* ------------------------------------------------------------- converter */

  /* Each unit maps to the category's SI base unit by:  value_SI = v * k + o
     Factors are exact where the definition is exact (marked in the tables). */
  var UNITS = {
    'Length  (m)': [
      ['metre  m', 1], ['millimetre  mm', 1e-3], ['centimetre  cm', 1e-2],
      ['kilometre  km', 1e3], ['micrometre  µm', 1e-6],
      ['inch  in', 0.0254], ['foot  ft', 0.3048], ['yard  yd', 0.9144],
      ['mile  mi', 1609.344], ['nautical mile  NM', 1852]
    ],
    'Mass  (kg)': [
      ['kilogram  kg', 1], ['gram  g', 1e-3], ['tonne  t', 1000],
      ['pound  lb', 0.45359237], ['ounce  oz', 0.028349523125],
      ['short ton  (US)', 907.18474], ['long ton  (UK)', 1016.0469088]
    ],
    'Volume  (m³)': [
      ['cubic metre  m³', 1], ['litre  L', 1e-3],
      ['cubic foot  ft³', 0.028316846592], ['cubic inch  in³', 1.6387064e-5],
      ['US gallon', 3.785411784e-3], ['UK gallon', 4.54609e-3],
      ['US barrel (oil)  bbl', 0.158987294928]
    ],
    'Volume flow  (m³/s)': [
      ['cubic metre/second  m³/s', 1], ['cubic metre/hour  m³/h', 1 / 3600],
      ['cubic metre/minute  m³/min', 1 / 60], ['litre/second  L/s', 1e-3],
      ['litre/minute  L/min', 1e-3 / 60],
      ['US gallon/minute  gpm', 6.30901964e-5], ['UK gallon/minute', 4.54609e-3 / 60],
      ['cubic foot/second  ft³/s', 0.028316846592],
      ['cubic foot/minute  cfm', 4.719474432e-4],
      ['barrel/day  bpd', 1.84013e-6]
    ],
    'Mass flow  (kg/s)': [
      ['kilogram/second  kg/s', 1], ['kilogram/hour  kg/h', 1 / 3600],
      ['tonne/hour  t/h', 1 / 3.6], ['pound/second  lb/s', 0.45359237],
      ['pound/hour  lb/h', 0.45359237 / 3600]
    ],
    'Pressure  (Pa)': [
      ['pascal  Pa', 1], ['kilopascal  kPa', 1e3], ['megapascal  MPa', 1e6],
      ['bar', 1e5], ['millibar  mbar', 100],
      ['kgf/cm²  (at)', 98066.5], ['atmosphere  atm', 101325],
      ['pound/inch²  psi', 6894.757293168],
      ['millimetre mercury  mmHg', 133.322387415],
      ['millimetre water  mmH₂O', 9.80665],
      ['inch water  inH₂O', 249.0889], ['foot water  ftH₂O', 2989.0669]
    ],
    'Temperature  (K)': [
      ['kelvin  K', 1, 0],
      ['Celsius  °C', 1, 273.15],
      ['Fahrenheit  °F', 5 / 9, 255.372222222222],
      ['Rankine  °R', 5 / 9, 0]
    ],
    'Power  (W)': [
      ['watt  W', 1], ['kilowatt  kW', 1e3], ['megawatt  MW', 1e6],
      ['horsepower  hp  (mech.)', 745.6998715822702],
      ['metric horsepower  PS', 735.49875],
      ['kgf·m/s', 9.80665],
      ['BTU/hour', 0.29307107017], ['BTU/second', 1055.05585262],
      ['kcal/hour', 1.163], ['kcal/second', 4186.8]
    ],
    'Energy  (J)': [
      ['joule  J', 1], ['kilojoule  kJ', 1e3], ['megajoule  MJ', 1e6],
      ['kilowatt-hour  kWh', 3.6e6],
      ['kilocalorie  kcal', 4186.8], ['calorie  cal', 4.1868],
      ['BTU', 1055.05585262],
      ['foot-pound force  ft·lbf', 1.3558179483314004],
      ['kgf·m', 9.80665]
    ],
    'Density  (kg/m³)': [
      ['kilogram/cubic metre  kg/m³', 1], ['gram/cubic centimetre  g/cm³', 1000],
      ['pound/cubic foot  lb/ft³', 16.018463373960142],
      ['pound/US gallon  lb/gal', 119.8264273]
    ],
    'Dynamic viscosity  (Pa·s)': [
      ['pascal-second  Pa·s', 1], ['millipascal-second  mPa·s', 1e-3],
      ['poise  P', 0.1], ['centipoise  cP', 1e-3],
      ['lb/(ft·s)', 1.4881639], ['lbf·s/ft²', 47.880259]
    ],
    'Kinematic viscosity  (m²/s)': [
      ['square metre/second  m²/s', 1],
      ['stokes  St', 1e-4], ['centistokes  cSt', 1e-6],
      ['square millimetre/second  mm²/s', 1e-6],
      ['square foot/second  ft²/s', 0.09290304]
    ],
    'Torque  (N·m)': [
      ['newton-metre  N·m', 1], ['kgf·m', 9.80665],
      ['pound-force foot  lbf·ft', 1.3558179483314004],
      ['pound-force inch  lbf·in', 0.1129848290276167]
    ],
    'Speed / velocity  (m/s)': [
      ['metre/second  m/s', 1], ['metre/minute  m/min', 1 / 60],
      ['kilometre/hour  km/h', 1 / 3.6], ['foot/second  ft/s', 0.3048],
      ['foot/minute  ft/min', 0.00508], ['mile/hour  mph', 0.44704]
    ]
  };

  function fmt(x) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e7 || a < 1e-5) return x.toExponential(6).replace(/e([+-])(\d)$/, 'e$10$2');
    return parseFloat(x.toPrecision(10)).toString();
  }

  function initConverter() {
    var root = document.getElementById('unit-converter');
    if (!root) return;

    var catSel  = root.querySelector('[data-conv="category"]');
    var fromSel = root.querySelector('[data-conv="from"]');
    var toSel   = root.querySelector('[data-conv="to"]');
    var inVal   = root.querySelector('[data-conv="input"]');
    var outVal  = root.querySelector('[data-conv="output"]');
    var factor  = root.querySelector('[data-conv="factor"]');
    var swapBtn = root.querySelector('[data-conv="swap"]');

    Object.keys(UNITS).forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c.replace(/\s+\(.*\)$/, '');
      catSel.appendChild(o);
    });

    function fillUnits() {
      var list = UNITS[catSel.value];
      [fromSel, toSel].forEach(function (sel) {
        sel.innerHTML = '';
        list.forEach(function (u, i) {
          var o = document.createElement('option');
          o.value = String(i);
          o.textContent = u[0].replace(/\s{2,}/g, '  ');
          sel.appendChild(o);
        });
      });
      fromSel.value = '0';
      toSel.value = String(Math.min(1, list.length - 1));
    }

    function convert() {
      var list = UNITS[catSel.value];
      var f = list[parseInt(fromSel.value, 10)];
      var t = list[parseInt(toSel.value, 10)];
      if (!f || !t) return;

      var fk = f[1], fo = f.length > 2 ? f[2] : 0;
      var tk = t[1], to = t.length > 2 ? t[2] : 0;

      var v = parseFloat(inVal.value);
      if (isNaN(v)) { outVal.value = ''; } else {
        var si = v * fk + fo;
        var r = (si - to) / tk;
        /* Offset scales (temperature) leave floating-point residue where the
           true answer is zero — 32 °F → °C must read 0, not -1.7e-13. Snap
           anything below 1e-12 of the working magnitude. */
        var scale = Math.max(Math.abs(si), Math.abs(to)) / Math.abs(tk);
        if (scale > 0 && Math.abs(r) < scale * 1e-12) r = 0;
        outVal.value = fmt(r);
      }

      var fname = f[0].replace(/\s{2,}/g, ' ');
      var tname = t[0].replace(/\s{2,}/g, ' ');
      if (fo === 0 && to === 0) {
        factor.textContent = '1 ' + fname + '  =  ' + fmt(fk / tk) + '  ' + tname;
      } else {
        factor.textContent = fname + ' → ' + tname + '  (offset scale — see §1.3.1)';
      }
    }

    catSel.addEventListener('change', function () { fillUnits(); convert(); });
    [fromSel, toSel].forEach(function (s) { s.addEventListener('change', convert); });
    inVal.addEventListener('input', convert);

    swapBtn.addEventListener('click', function () {
      var a = fromSel.value;
      fromSel.value = toSel.value;
      toSel.value = a;
      if (outVal.value !== '') inVal.value = outVal.value;
      convert();
    });

    catSel.value = 'Pressure  (Pa)';
    fillUnits();
    inVal.value = '1';
    convert();
  }

  /* --------------------------------------------------------------- ready */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initSearch(); initConverter(); });
  } else {
    initSearch();
    initConverter();
  }
})();
