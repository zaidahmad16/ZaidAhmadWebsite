/* cinematic.js
 * Page-switching nav · text clip reveals · nav entrance · stagger indices
 */
(function () {
'use strict';

var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── 1. Hero text line wrapping ────────────────────────── */
function initHeroLines() {
  document.querySelectorAll('.cin-line').forEach(function (el, i) {
    if (el.querySelector('.cin-inner')) return;
    var outer = document.createElement('span');
    var inner = document.createElement('span');
    outer.className = 'cin-clip';
    inner.className = 'cin-inner';
    inner.style.setProperty('--ci', i);
    while (el.firstChild) inner.appendChild(el.firstChild);
    outer.appendChild(inner);
    el.appendChild(outer);
    outer.style.display = 'block';
  });
}

/* ─── 2. Set stagger indices ─────────────────────────────── */
function initIndices() {
  document.querySelectorAll('.proj-list .proj-row').forEach(function (r, i) {
    r.style.setProperty('--ci', i);
  });
  document.querySelectorAll('.cin-skills .ts-item').forEach(function (it, i) {
    it.style.setProperty('--si', i);
  });
  document.querySelectorAll('.exp-entry').forEach(function (el, i) {
    el.style.setProperty('--ei', i);
  });
  document.querySelectorAll('#contact .ct-link').forEach(function (l, i) {
    l.style.setProperty('--ci', i);
  });
}

/* ─── 3. Highlights slideshow ───────────────────────────── */
var hlTimer = null;

function initHighlights() {
  var slides  = document.querySelectorAll('.hl-slide');
  var counter = document.querySelector('.hl-n');
  if (!slides.length) return;

  var current = 0;
  var total   = slides.length;

  function show(next) {
    var old = slides[current];
    old.classList.add('hl-slide--exit');
    old.classList.remove('hl-slide--active');
    setTimeout(function () { old.classList.remove('hl-slide--exit'); }, 500);

    current = next;
    slides[current].classList.add('hl-slide--active');
    if (counter) counter.textContent = String(current + 1).padStart(2, '0');
  }

  function advance() { show((current + 1) % total); }

  function start() {
    stop();
    hlTimer = setInterval(advance, 4200);
  }
  function stop() {
    if (hlTimer) { clearInterval(hlTimer); hlTimer = null; }
  }

  // Expose so page switcher can restart on About re-entry
  window._hlStart = start;
  window._hlStop  = stop;

  // Start on load (About is first page)
  start();
}

/* ─── 4. Page switching ──────────────────────────────────── */
var currentId = 'about';

function switchPage(id) {
  if (id === currentId) return;

  var old = document.getElementById(currentId);
  if (old) old.classList.remove('page--active');

  // Pause highlights when leaving About
  if (currentId === 'about' && window._hlStop) window._hlStop();

  currentId = id;
  var next = document.getElementById(id);
  if (!next) return;

  next.scrollTop = 0;
  next.classList.add('page--active');

  // Resume highlights when returning to About
  if (id === 'about' && window._hlStart) window._hlStart();

  document.querySelectorAll('.sn-link, .mn-link').forEach(function (l) {
    l.classList.toggle('active', l.dataset.s === id);
  });

  history.pushState(null, '', '#' + id);
}

function initPageNav() {
  document.querySelectorAll('.sn-link[data-s], .mn-link[data-s]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      switchPage(link.dataset.s);
    });
  });

  var wordmark = document.querySelector('.sn-wordmark');
  if (wordmark) wordmark.addEventListener('click', function (e) {
    e.preventDefault();
    switchPage('about');
  });

  window.addEventListener('popstate', function () {
    var hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) switchPage(hash);
  });
}

/* ─── 4. Scroll-progress per page ───────────────────────── */
function initScrollProgress() {
  var bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  document.querySelectorAll('.page').forEach(function (page) {
    page.addEventListener('scroll', function () {
      if (!page.classList.contains('page--active')) return;
      var max = page.scrollHeight - page.clientHeight;
      bar.style.width = (max > 0 ? (page.scrollTop / max) * 100 : 0) + '%';
    }, { passive: true });
  });
}

/* ─── 5. Nav entrance & scroll state ────────────────────── */
function initNav() {
  var nav = document.querySelector('.site-nav');
  if (!nav) return;

  nav.style.cssText = 'opacity:0;transform:translateX(-50%) translateY(-12px);transition:none;';
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      nav.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1)';
      nav.style.opacity   = '1';
      nav.style.transform = 'translateX(-50%) translateY(0)';
      setTimeout(function () { nav.style.cssText = ''; }, 800);
    });
  });

  document.querySelectorAll('.page').forEach(function (page) {
    page.addEventListener('scroll', function () {
      nav.classList.toggle('cin-nav-scrolled', page.scrollTop > 60);
    }, { passive: true });
  });
}

/* ─── Boot ───────────────────────────────────────────────── */
function boot() {
  initHeroLines();
  initIndices();
  initHighlights();
  initNav();
  initPageNav();
  initScrollProgress();
  window.__cinSwitchPage = switchPage;

  // Determine initial page from URL hash (e.g. index.html#work)
  var hash = window.location.hash.slice(1);
  var initialId = (hash && document.getElementById(hash)) ? hash : 'about';
  currentId = initialId;

  document.querySelectorAll('.sn-link').forEach(function (l) {
    l.classList.toggle('active', l.dataset.s === initialId);
  });

  // Activate initial page after two frames so CSS paints hidden state first
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      var pg = document.getElementById(initialId);
      if (pg) pg.classList.add('page--active');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

}());
