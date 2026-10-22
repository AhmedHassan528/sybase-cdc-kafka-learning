// Handbook behaviour (local, no dependencies): TOC filter, active-section highlight, copy buttons.
// The page is fully readable without this script.
(function () {
  'use strict';

  // Filter the table of contents (both sidebar and mobile copies).
  document.querySelectorAll('input[data-toc-filter]').forEach(function (input) {
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      document.querySelectorAll('.toc li').forEach(function (li) {
        var text = li.textContent.toLowerCase();
        var extra = (li.getAttribute('data-keywords') || '').toLowerCase();
        li.hidden = q !== '' && text.indexOf(q) < 0 && extra.indexOf(q) < 0;
      });
    });
  });

  // Highlight the section currently in view.
  var links = {};
  document.querySelectorAll('.sidebar .toc a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var current = null;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && links[e.target.id]) {
          if (current) current.classList.remove('active');
          current = links[e.target.id];
          current.classList.add('active');
        }
      });
    }, { rootMargin: '0px 0px -75% 0px' });
    document.querySelectorAll('main h2[id], main h3[id]').forEach(function (h) { obs.observe(h); });
  }

  // Copy buttons on code blocks.
  document.querySelectorAll('main pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      var text = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { selectText(pre); });
      } else { selectText(pre); }
    });
    pre.appendChild(btn);
  });
  function selectText(el) {
    var r = document.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
})();
