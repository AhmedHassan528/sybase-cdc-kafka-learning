// Browser behaviour for the article website. No libraries. The pages read fine without this script.
// Each feature runs in its own guarded function so that one failure cannot stop the others.
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  function safely(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('site.js: ' + name + ' failed', e); } }
  function all(sel, from) { return Array.prototype.slice.call((from || doc).querySelectorAll(sel)); }

  // Script is running: reveal the script-only controls.
  root.classList.remove('no-js');

  // Polite announcements for screen readers (copy result, search result count).
  var status = doc.createElement('div');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  doc.body.appendChild(status);
  function announce(msg) { status.textContent = ''; window.setTimeout(function () { status.textContent = msg; }, 30); }

  // ---- Contents: mark the heading in view (aria-current="true") --------------------------------------------------
  safely('contents', function () {
    var heads = all('.prose-site h2[id], .prose-site h3[id]');
    var links = all('.contents-list a[href^="#"]');
    if (!heads.length || !links.length) return;
    var current = null, ticking = false;
    function pick() {
      ticking = false;
      var id = heads[0].id;
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].getBoundingClientRect().top <= 110) id = heads[i].id; else break;
      }
      if (id === current) return;
      current = id;
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        // Keep the active item visible inside the sticky list without scrolling the page itself.
        if (on) {
          var box = a.closest('.contents-wide');
          if (box && box.offsetParent !== null) {
            var side = box.closest('.contents-side');
            var r = a.getBoundingClientRect(), s = side.getBoundingClientRect();
            if (r.top < s.top + 40) side.scrollTop -= (s.top + 40 - r.top);
            else if (r.bottom > s.bottom - 40) side.scrollTop += (r.bottom - s.bottom + 40);
          }
        }
      });
    }
    function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(pick); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', onScroll);
    pick();
    // Choosing an entry from the narrow-window menu closes the menu.
    all('.contents-menu a').forEach(function (a) {
      a.addEventListener('click', function () { var d = a.closest('details'); if (d) d.open = false; });
    });
  });

  // ---- A link with #heading: re-align once everything has loaded (images can move the page after the first jump) ----
  safely('hash', function () {
    function align() {
      if (!location.hash || location.hash.length < 2) return;
      var el = doc.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) el.scrollIntoView();
    }
    if (doc.readyState === 'complete') align(); else window.addEventListener('load', align);
  });

  // ---- Reading progress ------------------------------------------------------------------------------------------
  safely('progress', function () {
    var bar = doc.querySelector('#ui-progress span');
    if (!bar) return;
    var ticking = false;
    function draw() {
      ticking = false;
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(draw); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    draw();
  });

  // ---- Search ----------------------------------------------------------------------------------------------------
  // The index is embedded in each page (so it works from disk, where fetch is not allowed): one entry per heading.
  safely('search', function () {
    var input = doc.getElementById('ui-search');
    var box = doc.getElementById('ui-results');
    var holder = doc.getElementById('search-index');
    if (!input || !box || !holder) return;
    var index = JSON.parse(holder.textContent);
    var siteRoot = root.getAttribute('data-root') || '';
    var selected = -1;

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function tokens(q) { return q.toLowerCase().split(/\s+/).filter(Boolean); }
    function score(e, toks, phrase) {
      var h = e.heading.toLowerCase(), k = (e.keywords || '').toLowerCase(), t = (e.text || '').toLowerCase();
      var s = 0, i;
      if (h.indexOf(phrase) >= 0) s += 100;
      for (i = 0; i < toks.length; i++) {
        var inH = h.indexOf(toks[i]) >= 0, inK = k.indexOf(toks[i]) >= 0, inT = t.indexOf(toks[i]) >= 0;
        if (!inH && !inK && !inT) return 0;
        if (inH) s += 20;
        if (inK) s += 8;
        if (inT) s += 2;
      }
      if (t.indexOf(phrase) >= 0) s += 6;
      return s;
    }
    function snippet(e, toks) {
      var t = e.text || '', low = t.toLowerCase(), at = -1, i;
      for (i = 0; i < toks.length && at < 0; i++) at = low.indexOf(toks[i]);
      if (at < 0) return t.slice(0, 120);
      var from = Math.max(0, at - 50);
      return (from > 0 ? '… ' : '') + t.slice(from, from + 150) + (from + 150 < t.length ? ' …' : '');
    }
    function where(e) {
      if (e.page === 'index.html') return 'Article, section ' + e.section;
      if (e.page.indexOf('guide/') === 0) return 'Build-along' + (e.section ? ', increment ' + e.section : '');
      return e.page;
    }
    function close() { box.hidden = true; box.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); selected = -1; }
    function render() {
      var q = input.value.trim();
      if (q.length < 2) { close(); return; }
      var toks = tokens(q), phrase = q.toLowerCase();
      var hits = [];
      index.forEach(function (e, n) { var s = score(e, toks, phrase); if (s > 0) hits.push({ e: e, s: s, n: n }); });
      hits.sort(function (a, b) { return b.s - a.s || a.n - b.n; });
      hits = hits.slice(0, 12);
      box.hidden = false; input.setAttribute('aria-expanded', 'true'); selected = -1;
      if (!hits.length) {
        box.innerHTML = '<p class="r-none">Nothing found for ' + esc(q) + '</p>';
        announce('Nothing found for ' + q);
        return;
      }
      box.innerHTML = hits.map(function (h) {
        var e = h.e;
        return '<a href="' + esc(siteRoot + e.page + (e.anchor ? '#' + e.anchor : '')) + '"><span class="r-head">' + esc(e.heading) + '</span>' +
          '<span class="r-meta"> ' + esc(where(e)) + '</span><span class="r-text block">' + esc(snippet(e, toks)) + '</span></a>';
      }).join('');
      announce(hits.length + (hits.length === 1 ? ' result' : ' results'));
    }
    function move(d) {
      var items = all('a', box);
      if (!items.length) return;
      if (selected >= 0) items[selected].removeAttribute('aria-selected');
      selected = (selected + d + items.length) % items.length;
      items[selected].setAttribute('aria-selected', 'true');
      items[selected].scrollIntoView({ block: 'nearest' });
    }
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
      else if (ev.key === 'Escape') { close(); }
      else if (ev.key === 'Enter') {
        var items = all('a', box);
        var target = items[selected >= 0 ? selected : 0];
        if (target) { ev.preventDefault(); target.click(); }
      }
    });
    box.addEventListener('click', function () { window.setTimeout(close, 0); });
    doc.addEventListener('click', function (ev) { if (!ev.target.closest('.search')) close(); });
    // "/" focuses the search box when the reader is not typing somewhere else.
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) { ev.preventDefault(); input.focus(); }
    });
  });

  // ---- Theme: light or dark, remembered in this browser only ------------------------------------------------------
  safely('theme', function () {
    var btn = doc.getElementById('ui-theme');
    if (!btn) return;
    function dark() { return root.classList.contains('dark'); }
    function paint() {
      btn.setAttribute('aria-pressed', dark() ? 'true' : 'false');
      btn.textContent = dark() ? 'Light' : 'Dark';
      btn.setAttribute('aria-label', dark() ? 'Dark theme is on. Switch to the light theme' : 'Dark theme is off. Switch to the dark theme');
    }
    btn.addEventListener('click', function () {
      root.classList.toggle('dark');
      try { localStorage.setItem('theme', dark() ? 'dark' : 'light'); } catch (e) { /* storage unavailable: the choice lasts for this page only */ }
      paint();
    });
    paint();
  });

  // ---- Copy buttons on code blocks -------------------------------------------------------------------------------
  safely('copy', function () {
    function legacyCopy(text) {
      var back = doc.activeElement;
      var t = doc.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      doc.body.appendChild(t); t.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(t);
      if (back && back.focus) back.focus();   // keep the keyboard position on the button
      return ok;
    }
    function copy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
      }
      return Promise.resolve(legacyCopy(text));
    }
    all('.prose-site pre').forEach(function (pre) {
      var wrap = doc.createElement('div');
      wrap.className = 'pre-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var btn = doc.createElement('button');
      btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy this code block to the clipboard');
      var timer = null;
      btn.addEventListener('click', function () {
        copy(pre.textContent).then(function (ok) {
          btn.textContent = ok ? 'Copied' : 'Copy failed';
          announce(ok ? 'Copied to the clipboard' : 'Copy failed. Select the text and copy it by hand.');
          window.clearTimeout(timer);
          timer = window.setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
        });
      });
      wrap.appendChild(btn);
    });
  });
})();
