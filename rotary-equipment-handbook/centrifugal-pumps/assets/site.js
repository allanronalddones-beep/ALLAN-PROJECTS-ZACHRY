/* ==========================================================================
   Centrifugal Pump Knowledge Base — shared behaviour
   Theme · mobile nav · heading anchors · TOC scrollspy · search · calculators
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var ROOT_PATH = document.body.getAttribute('data-root') || './';

  /* ---------------------------------------------------------------- Theme */
  var THEME_KEY = 'cpkb-theme';

  function readStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStored(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* private mode */ }
  }

  function applyTheme(mode) {
    if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
    } else {
      root.removeAttribute('data-theme');
    }
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var dark = mode === 'dark' ||
      (!mode && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    btn.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
  }

  applyTheme(readStored(THEME_KEY));

  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var isDark = root.getAttribute('data-theme') === 'dark' ||
        (!root.hasAttribute('data-theme') && window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = isDark ? 'light' : 'dark';
      writeStored(THEME_KEY, next);
      applyTheme(next);
    });
  }

  /* ----------------------------------------------------------- Mobile nav */
  var navToggle = document.getElementById('nav-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (navToggle && sidebar) {
    navToggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        sidebar.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', function (e) {
      if (!sidebar.classList.contains('open')) return;
      if (sidebar.contains(e.target) || navToggle.contains(e.target)) return;
      sidebar.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  }

  /* -------------------------------------------------- Heading anchors+TOC */
  var article = document.querySelector('.prose');
  var tocNav = document.querySelector('.toc');

  function slugify(text) {
    return text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  if (article) {
    var headings = article.querySelectorAll('h2, h3');
    var seen = {};
    var tocItems = [];

    Array.prototype.forEach.call(headings, function (h) {
      if (!h.id) {
        var base = slugify(h.textContent) || 'section';
        var id = base;
        var n = 2;
        while (seen[id] || document.getElementById(id)) { id = base + '-' + n++; }
        h.id = id;
      }
      seen[h.id] = true;

      if (!h.querySelector('.anchor')) {
        var a = document.createElement('a');
        a.className = 'anchor';
        a.href = '#' + h.id;
        a.setAttribute('aria-label', 'Link to this section');
        a.textContent = '#';
        h.insertBefore(a, h.firstChild);
      }
      if (!h.hasAttribute('data-no-toc')) {
        tocItems.push({ id: h.id, text: h.textContent.replace(/^#/, '').trim(), level: h.tagName });
      }
    });

    if (tocNav && tocItems.length > 1) {
      var ul = document.createElement('ul');
      tocItems.forEach(function (item) {
        var li = document.createElement('li');
        li.className = item.level === 'H3' ? 'lvl-3' : 'lvl-2';
        var link = document.createElement('a');
        link.href = '#' + item.id;
        link.textContent = item.text;
        li.appendChild(link);
        ul.appendChild(li);
      });
      tocNav.appendChild(ul);

      /* scrollspy */
      var tocLinks = tocNav.querySelectorAll('a');
      var spyTargets = tocItems.map(function (i) { return document.getElementById(i.id); });

      var markActive = function () {
        var best = 0;
        var offset = 90;
        for (var i = 0; i < spyTargets.length; i++) {
          if (spyTargets[i] && spyTargets[i].getBoundingClientRect().top <= offset) { best = i; }
        }
        for (var j = 0; j < tocLinks.length; j++) {
          tocLinks[j].classList.toggle('active', j === best);
        }
      };

      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () { markActive(); ticking = false; });
      }, { passive: true });
      markActive();
    }
  }

  /* --------------------------------------------------------------- Search */
  var overlay = document.getElementById('search-overlay');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  var searchOpenBtn = document.getElementById('search-open');
  var index = null;
  var indexState = 'idle';
  var selIdx = 0;

  function loadIndex() {
    if (indexState !== 'idle') return;
    indexState = 'loading';
    fetch(ROOT_PATH + 'assets/search-index.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { index = data; indexState = 'ready'; if (searchInput && searchInput.value) runSearch(); })
      .catch(function () {
        indexState = 'failed';
        if (searchResults) {
          searchResults.innerHTML = '<p class="search-empty">Search index unavailable.<br>' +
            'Open this site over HTTP (see README) rather than from the file system.</p>';
        }
      });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, terms) {
    var out = escapeHtml(text);
    terms.forEach(function (t) {
      if (t.length < 2) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function openSearch() {
    if (!overlay) return;
    loadIndex();
    overlay.classList.add('open');
    searchInput.focus();
    searchInput.select();
  }
  function closeSearch() {
    if (!overlay) return;
    overlay.classList.remove('open');
  }

  function runSearch() {
    if (!searchResults) return;
    var q = searchInput.value.trim();
    if (!q) {
      searchResults.innerHTML = '<p class="search-empty">Type to search every page of the knowledge base.</p>';
      return;
    }
    if (indexState === 'loading') {
      searchResults.innerHTML = '<p class="search-empty">Loading index…</p>';
      return;
    }
    if (!index) return;

    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var hits = [];

    index.forEach(function (entry) {
      var hay = (entry.t + ' ' + entry.p + ' ' + entry.b).toLowerCase();
      var score = 0;
      var matchedAll = true;
      terms.forEach(function (t) {
        var inTitle = entry.t.toLowerCase().indexOf(t) !== -1;
        var inBody = hay.indexOf(t) !== -1;
        if (!inBody) { matchedAll = false; return; }
        score += inTitle ? 12 : 1;
        var c = hay.split(t).length - 1;
        score += Math.min(c, 6);
      });
      if (matchedAll) hits.push({ e: entry, s: score });
    });

    hits.sort(function (a, b) { return b.s - a.s; });
    hits = hits.slice(0, 28);

    if (!hits.length) {
      searchResults.innerHTML = '<p class="search-empty">No matches for “' + escapeHtml(q) + '”.</p>';
      return;
    }

    searchResults.innerHTML = hits.map(function (h, i) {
      var e = h.e;
      var body = e.b;
      var lower = body.toLowerCase();
      var pos = lower.indexOf(terms[0]);
      var start = Math.max(0, pos - 70);
      var snip = (start > 0 ? '…' : '') + body.slice(start, start + 190) + '…';
      return '<a href="' + ROOT_PATH + e.u + '" class="' + (i === 0 ? 'sel' : '') + '">' +
        '<div class="r-crumb">' + escapeHtml(e.p) + '</div>' +
        '<div class="r-title">' + highlight(e.t, terms) + '</div>' +
        '<div class="r-snip">' + highlight(snip, terms) + '</div></a>';
    }).join('');
    selIdx = 0;
  }

  function moveSel(delta) {
    var links = searchResults.querySelectorAll('a');
    if (!links.length) return;
    links[selIdx] && links[selIdx].classList.remove('sel');
    selIdx = (selIdx + delta + links.length) % links.length;
    links[selIdx].classList.add('sel');
    links[selIdx].scrollIntoView({ block: 'nearest' });
  }

  if (searchOpenBtn) searchOpenBtn.addEventListener('click', openSearch);
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', runSearch);
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
      else if (e.key === 'Enter') {
        var sel = searchResults.querySelector('a.sel');
        if (sel) { e.preventDefault(); window.location.href = sel.getAttribute('href'); }
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); openSearch(); return;
    }
    if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Escape') { closeSearch(); }
  });

  /* ---------------------------------------------- Troubleshooting filter */
  var tsInput = document.getElementById('ts-search');
  var tsChips = document.querySelectorAll('.ts-filter .chip');
  var symptoms = document.querySelectorAll('.symptom');

  function applyTsFilter() {
    var q = tsInput ? tsInput.value.toLowerCase().trim() : '';
    var active = [];
    Array.prototype.forEach.call(tsChips, function (c) {
      if (c.getAttribute('aria-pressed') === 'true') active.push(c.dataset.group);
    });

    var shown = 0;
    Array.prototype.forEach.call(symptoms, function (s) {
      var groups = (s.dataset.group || '').split(' ');
      var groupOk = !active.length || active.some(function (g) { return groups.indexOf(g) !== -1; });
      var textOk = !q || s.textContent.toLowerCase().indexOf(q) !== -1;
      var show = groupOk && textOk;
      s.hidden = !show;
      if (show) { shown++; if (q) s.open = true; }
    });

    var empty = document.getElementById('ts-empty');
    if (empty) empty.hidden = shown > 0;
    var count = document.getElementById('ts-count');
    if (count) count.textContent = shown + ' of ' + symptoms.length + ' symptoms';
  }

  if (tsInput) tsInput.addEventListener('input', applyTsFilter);
  Array.prototype.forEach.call(tsChips, function (c) {
    c.addEventListener('click', function () {
      var on = c.getAttribute('aria-pressed') === 'true';
      c.setAttribute('aria-pressed', on ? 'false' : 'true');
      applyTsFilter();
    });
  });
  if (tsInput || tsChips.length) applyTsFilter();

  /* ----------------------------------------------------------- Calculators */
  var fmt = function (v, dp) {
    if (!isFinite(v)) return '—';
    dp = dp === undefined ? 2 : dp;
    return v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  };
  var num = function (id) {
    var el = document.getElementById(id);
    return el ? parseFloat(el.value) : NaN;
  };
  var put = function (id, text, cls) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = text;
    el.classList.remove('good', 'bad');
    if (cls) el.classList.add(cls);
  };

  var CALCS = {
    /* NPSH available — metric, head form */
    npsha: function () {
      var pa = num('npsh-pa');      // absolute pressure on liquid surface, kPa a
      var sg = num('npsh-sg');      // specific gravity
      var z  = num('npsh-z');       // static suction head (+ flooded / - lift), m
      var hf = num('npsh-hf');      // suction friction + fitting losses, m
      var pv = num('npsh-pv');      // vapour pressure at pumping temp, kPa a
      var nr = num('npsh-nr');      // NPSH required, m

      var rho = sg * 1000;
      var ha = (pa * 1000) / (rho * 9.81);
      var hv = (pv * 1000) / (rho * 9.81);
      var npsha = ha + z - hf - hv;
      var margin = npsha - nr;
      var ratio = npsha / nr;

      put('npsh-out-ha', fmt(ha) + ' <small>m</small>');
      put('npsh-out-hv', fmt(hv) + ' <small>m</small>');
      put('npsh-out-a', fmt(npsha) + ' <small>m</small>', npsha > 0 ? null : 'bad');
      put('npsh-out-margin', fmt(margin) + ' <small>m</small>', margin >= 1 ? 'good' : 'bad');
      put('npsh-out-ratio', fmt(ratio) + '×', ratio >= 1.1 ? 'good' : 'bad');

      var verdict;
      if (!isFinite(margin)) {
        verdict = 'Enter all values to evaluate the suction margin.';
      } else if (margin < 0) {
        verdict = '<strong class="pill danger">Cavitating</strong> NPSH-a is below NPSH-r. The pump will cavitate. Raise the suction level, lower the losses, cool the liquid, or reselect the pump.';
      } else if (margin < 1) {
        verdict = '<strong class="pill warn">Marginal</strong> Below the 1.0 – 1.5 m margin most specifications demand. Confirm NPSH-r by witnessed test and check the ratio against the suction-energy table.';
      } else if (ratio < 1.1) {
        verdict = '<strong class="pill warn">Thin ratio</strong> Absolute margin is acceptable but the ratio is under 1.1. For medium or high suction-energy service, check the required ratio.';
      } else {
        verdict = '<strong class="pill ok">Acceptable</strong> Meets the usual 1.0 – 1.5 m / 1.1× minimum. Re-check at maximum flow and at minimum suction vessel level, with the strainer fouled.';
      }
      var v = document.getElementById('npsh-verdict');
      if (v) v.innerHTML = verdict;
    },

    /* Affinity laws — speed and diameter */
    affinity: function () {
      var q1 = num('aff-q1'), h1 = num('aff-h1'), p1 = num('aff-p1');
      var n1 = num('aff-n1'), n2 = num('aff-n2');
      var d1 = num('aff-d1'), d2 = num('aff-d2');

      var rn = n2 / n1;
      var rd = d2 / d1;
      var r = rn * rd;

      put('aff-out-q', fmt(q1 * r) + ' <small>m³/h</small>');
      put('aff-out-h', fmt(h1 * r * r) + ' <small>m</small>');
      put('aff-out-p', fmt(p1 * r * r * r) + ' <small>kW</small>');

      var msg = [];
      if (isFinite(rd) && rd < 1) {
        var calcPct = rd * 100;
        var actualPct = 16.2 + 0.838 * calcPct;
        msg.push('Calculated trim <b>' + fmt(calcPct, 1) + '%</b> of full diameter; the empirical correction suggests cutting only to <b>' + fmt(actualPct, 1) + '%</b> to land on the duty.');
        if (rd < 0.8) msg.push('<span class="pill warn">Trim too deep</span> Cuts past 80% of full diameter lose efficiency badly below N<sub>s</sub> 2500 — reselect instead.');
      }
      if (isFinite(rn) && Math.abs(rn - 1) > 0.25) {
        msg.push('<span class="pill warn">Speed change &gt; 25%</span> The constant-efficiency assumption breaks down; treat the result as indicative only.');
      }
      if (!msg.length) msg.push('Affinity laws hold only at constant efficiency. Diameter scaling is an approximation, not a true similarity law.');
      var v = document.getElementById('aff-verdict');
      if (v) v.innerHTML = msg.join(' ');
    },

    /* Specific speed and suction specific speed (US units) */
    nspeed: function () {
      var n = num('ns-n'), q = num('ns-q'), h = num('ns-h');
      var stages = num('ns-stages'), npshr = num('ns-npshr');
      var dbl = document.getElementById('ns-double');
      var isDouble = dbl ? dbl.value === 'yes' : false;

      // inputs are metric; convert to US gpm / ft
      var qUS = q / 0.2271;                 // m3/h -> US gpm
      var hStage = h / Math.max(stages, 1); // m per stage
      var hFt = hStage / 0.3048;
      var npshrFt = npshr / 0.3048;

      var ns = (n * Math.sqrt(qUS)) / Math.pow(hFt, 0.75);
      var qSuction = isDouble ? qUS / 2 : qUS;
      var nss = (n * Math.sqrt(qSuction)) / Math.pow(npshrFt, 0.75);

      put('ns-out-ns', fmt(ns, 0));
      put('ns-out-nsm', fmt(ns * 0.614, 0));
      put('ns-out-nss', fmt(nss, 0), nss <= 11000 ? 'good' : 'bad');

      var geom;
      if (ns < 1500) geom = 'radial-vane impeller — low flow, high head';
      else if (ns < 4000) geom = 'Francis-vane impeller';
      else if (ns < 9000) geom = 'mixed-flow impeller';
      else geom = 'axial-flow (propeller) impeller — high flow, low head';

      var msg = 'N<sub>s</sub> ≈ ' + fmt(ns, 0) + ' points to a <strong>' + geom + '</strong>. ';
      if (!isFinite(nss)) {
        msg += 'Enter NPSH-r to evaluate suction specific speed.';
      } else if (nss > 11000) {
        msg += '<span class="pill danger">N<sub>ss</sub> &gt; 11 000</span> Field data shows failure rates climbing sharply above this. Keep the duty above 60–70% of BEP, or buy a slower pump.';
      } else if (nss > 8500) {
        msg += '<span class="pill warn">N<sub>ss</sub> ' + fmt(nss, 0) + '</span> Inside the usual 8000–11 000 comfort band but above the Hydraulic Institute 8500 basis.';
      } else {
        msg += '<span class="pill ok">N<sub>ss</sub> ' + fmt(nss, 0) + '</span> Conservative suction design with a wide stable operating range.';
      }
      var v = document.getElementById('ns-verdict');
      if (v) v.innerHTML = msg;
    },

    /* Hydraulic / shaft / motor power */
    power: function () {
      var q = num('pw-q'), h = num('pw-h'), sg = num('pw-sg');
      var eta = num('pw-eta') / 100, etam = num('pw-etam') / 100;

      var rho = sg * 1000;
      var ph = (q * rho * 9.81 * h) / (3.6e6);
      var ps = ph / eta;
      var pm = ps / etam;

      put('pw-out-ph', fmt(ph) + ' <small>kW</small>');
      put('pw-out-ps', fmt(ps) + ' <small>kW</small>');
      put('pw-out-pm', fmt(pm) + ' <small>kW</small>');

      // next standard IEC motor frame rating
      var ratings = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400, 450, 500];
      var pick = ratings.find(function (r) { return r >= ps * 1.1; });
      put('pw-out-motor', (pick ? fmt(pick, 1) : '—') + ' <small>kW</small>');

      var v = document.getElementById('pw-verdict');
      if (v) {
        v.innerHTML = isFinite(ps)
          ? 'Shaft power shown is at the duty entered. Size the driver on the <strong>end-of-curve</strong> power (around 120% of BEP flow) for a low-specific-speed overloading pump, not on the rated point — the suggestion above adds only a 10% margin to the entered duty.'
          : 'Enter flow, head, SG and efficiencies.';
      }
    },

    /* Temperature rise at low flow / shut-off */
    temprise: function () {
      var hp = num('tr-hp'), vol = num('tr-vol'), cp = num('tr-cp'), sg = num('tr-sg');
      var allow = num('tr-allow');

      // Tr (degF/min) = (5.1 x HP_shutoff) / (gallons x specific heat x SG)
      var hpImp = hp * 1.34102;                   // kW -> hp
      var gal = vol * 0.264172;                   // litres -> US gallons
      var trF = (5.1 * hpImp) / (gal * cp * sg);
      var trC = trF * 5 / 9;
      var mins = allow / trC;

      put('tr-out-rate', fmt(trC) + ' <small>&deg;C/min</small>');
      put('tr-out-ratef', fmt(trF) + ' <small>&deg;F/min</small>');
      put('tr-out-time', fmt(mins, 1) + ' <small>min</small>', mins < 3 ? 'bad' : (mins < 10 ? null : 'good'));

      var v = document.getElementById('tr-verdict');
      if (v) {
        if (!isFinite(mins)) { v.innerHTML = 'Enter all values.'; return; }
        v.innerHTML = 'At fully closed discharge the casing contents reach the allowable rise in about <strong>' +
          fmt(mins, 1) + ' minutes</strong>. This neglects heat lost through the casing, so it is conservative. ' +
          (mins < 3
            ? '<span class="pill danger">Very short</span> Treat closed-valve running as a trip condition and fit a continuous minimum-flow bypass.'
            : '<span class="pill warn">Set the operating rule from this</span> Fit the bypass or the low-flow trip well inside this window — 50 &deg;F (28 &deg;C) is the usual ceiling, 15 &deg;F for boiler feed.');
      }
    },

    /* System head curve point */
    syshead: function () {
      var hst = num('sh-hst'), hf = num('sh-hf'), qd = num('sh-qd'), q = num('sh-q');
      var k = hf / (qd * qd);
      var ht = hst + k * q * q;
      put('sh-out-k', fmt(k, 5));
      put('sh-out-hf', fmt(k * q * q) + ' <small>m</small>');
      put('sh-out-ht', fmt(ht) + ' <small>m</small>');
      var v = document.getElementById('sh-verdict');
      if (v) {
        var frac = hst / ht;
        v.innerHTML = isFinite(frac)
          ? 'Static head is <strong>' + fmt(frac * 100, 0) + '%</strong> of total head at this flow. ' +
            (frac > 0.7
              ? 'A static-dominated system — the resistance curve is flat, so throttling moves the duty point a long way and speed control gives little saving below the static head.'
              : 'A friction-dominated system — the resistance curve is steep, which suits variable-speed control and makes the duty point sensitive to fouling.')
          : 'Enter a design point and a flow to evaluate.';
      }
    }
  };

  function wireCalc(name) {
    var box = document.querySelector('[data-calc="' + name + '"]');
    if (!box || !CALCS[name]) return;
    var run = CALCS[name];
    box.addEventListener('input', run);
    box.addEventListener('change', run);
    run();
  }
  Object.keys(CALCS).forEach(wireCalc);

  /* -------------------------------------------- Mark current nav item */
  var here = window.location.pathname.split('/').pop() || 'index.html';
  Array.prototype.forEach.call(document.querySelectorAll('.nav-list a'), function (a) {
    var target = a.getAttribute('href').split('/').pop().split('#')[0];
    if (target === here) {
      a.classList.add('current');
      a.setAttribute('aria-current', 'page');
    }
  });
})();
