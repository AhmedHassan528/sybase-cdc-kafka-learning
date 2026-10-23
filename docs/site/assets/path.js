// Progress on the learning path. The lessons read fine without this script. Progress is kept in this browser only
// (localStorage, key cdc-path-progress-v1); every storage call is guarded, because storage can be blocked.
(function () {
  'use strict';
  var KEY = 'cdc-path-progress-v1';
  var doc = document;
  function all(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); }
  var canStore = true, done = [];

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var v = raw ? JSON.parse(raw) : null;
      if (v && Array.isArray(v.done)) done = v.done.filter(function (x) { return typeof x === 'string'; });
    } catch (e) { canStore = canStoreTest(); }
  }
  function canStoreTest() { try { window.localStorage.getItem(KEY); return true; } catch (e) { return false; } }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify({ done: done })); return true; } catch (e) { return false; }
  }
  function isDone(id) { return done.indexOf(id) >= 0; }

  function render() {
    var total = 0;
    var ids = all('.lesson-list li').map(function (li) { return li.getAttribute('data-lesson'); });
    var all_ = ids.length ? ids : null;
    var totalEl = doc.querySelector('.path-progress');
    total = totalEl ? parseInt(totalEl.getAttribute('data-total'), 10) : 0;
    var count = all_ ? all_.filter(isDone).length : done.length;
    if (totalEl) {
      totalEl.querySelector('.label').textContent = count + ' of ' + total + ' lessons complete';
      totalEl.querySelector('.bar > span').style.width = (total ? (100 * count / total) : 0) + '%';
    }
    all('.lesson-list li').forEach(function (li) {
      li.classList.toggle('done', isDone(li.getAttribute('data-lesson')));
    });
    all('.stage-count').forEach(function (el) {
      var card = el.closest('.stage-card');
      var n = card ? all_filter(card) : 0;
      el.textContent = n + ' of ' + el.getAttribute('data-total');
    });
    all('.complete-btn').forEach(function (b) {
      var on = isDone(b.getAttribute('data-lesson'));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? 'Lesson complete (click to undo)' : 'Mark this lesson complete';
    });
    all('.prereq-list li').forEach(function (li) {
      var s = li.querySelector('.pstatus');
      if (!s) return;
      var on = isDone(li.getAttribute('data-prereq'));
      s.textContent = on ? 'done' : 'open';
      s.className = 'pstatus js-only ' + (on ? 'done' : 'open');
    });
    var go = doc.querySelector('.continue-btn');
    if (go && ids.length) {
      var next = null;
      all('.lesson-list li').some(function (li) { if (!isDone(li.getAttribute('data-lesson'))) { next = li; return true; } return false; });
      if (next) { go.href = next.querySelector('a').href; go.textContent = count ? 'Continue with lesson ' + next.getAttribute('data-lesson') : 'Start the path'; }
      else { go.textContent = 'All lessons complete'; }
    }
  }
  function all_filter(card) {
    return all('.lesson-list li').filter(function (li) { return card.contains(li) && isDone(li.getAttribute('data-lesson')); }).length;
  }

  load();
  if (!canStore) all('.storage-note').forEach(function (n) { n.hidden = false; });
  render();
  all('.complete-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-lesson');
      if (isDone(id)) done = done.filter(function (x) { return x !== id; }); else done.push(id);
      if (!save()) all('.storage-note').forEach(function (n) { n.hidden = false; });
      render();
    });
  });
})();
