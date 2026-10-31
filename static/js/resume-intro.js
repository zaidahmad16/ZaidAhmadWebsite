/* resume-intro.js — clicking Resume plays the Hollow Purple scene (Jujutsu Kaisen S2E4, English dub),
   then the resume is revealed out of the scene's white ending: a purple shockwave, and the page
   sharpening into place. The resume loads behind the clip so it's ready when the white clears.
   Skippable with a click, Esc or the skip button; skipped entirely under reduced motion (it flashes).
   On phones, where PDFs don't scroll inside a frame, it opens the PDF itself.
   The host doesn't answer byte-range requests, which Safari needs to stream video, so the clip is
   fetched in the background when someone points at a Resume link and played from memory. */
(function () {
  'use strict';

  var PDF = 'static/docs/ZaidAhmadResume.pdf';
  var CLIP = 'static/video/hollow-purple.mp4';
  var ov = null, video = null, view = null, frameReady = false, stage = 'off';
  var blobUrl = null, blobPromise = null;

  // Download the clip into memory (once). Skipped for reduced motion and data-saver users.
  function prefetch() {
    if (blobUrl || blobPromise || !window.fetch || !window.URL || reduced()) return blobPromise;
    var c = navigator.connection;
    if (c && c.saveData) return null;
    blobPromise = fetch(CLIP)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { blobUrl = URL.createObjectURL(b); return blobUrl; })
      .catch(function () { blobPromise = null; return null; });
    return blobPromise;
  }

  var reduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var coarse = function () { return window.matchMedia && window.matchMedia('(pointer: coarse)').matches; };

  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function makeOverlay() {
    ov = el('div', 'ri-overlay', document.body);
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Resume');
    document.addEventListener('keydown', onKey, true);
    document.documentElement.classList.add('ri-open');
  }

  // The resume page itself; built hidden so the PDF can load while the clip plays
  function buildView() {
    frameReady = false;
    view = el('div', 'ri-view', ov);
    var bar = el('div', 'ri-bar', view);
    el('span', 'ri-title', bar, 'Resume — Zaid Ahmad');
    var tab = el('a', 'ri-btn', bar, 'Open in new tab ↗');
    tab.href = PDF; tab.target = '_blank'; tab.rel = 'noopener';
    var close = el('button', 'ri-btn ri-close', bar, 'Close ×');
    close.type = 'button';
    close.addEventListener('click', teardown);
    var frame = el('iframe', 'ri-frame', view);
    frame.title = 'Resume';
    frame.addEventListener('load', function () { frameReady = true; });
    frame.src = PDF;
  }

  function open() {
    if (stage !== 'off') return;
    if (reduced()) return showDirect();

    stage = 'video';
    makeOverlay();
    if (!coarse()) buildView();
    video = el('video', 'ri-video', ov);
    var fromMemory = !!blobUrl;
    video.src = blobUrl || CLIP;
    video.preload = 'auto';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    // the last moments of the clip are already white: start the hand-off there, so there's no seam
    video.addEventListener('timeupdate', function () {
      if (video && video.duration && video.duration - video.currentTime <= 0.25) finish();
    });
    video.addEventListener('ended', finish);
    // Streaming failed (Safari without range support): play it from memory instead
    video.addEventListener('error', function () {
      if (fromMemory || !video) return finish();
      fromMemory = true;
      var pr = blobPromise || prefetch();
      if (!pr) return finish();
      pr.then(function (url) {
        if (!url || !video || stage !== 'video') return finish();
        video.src = url;
        playWithSound();
      });
    });
    var skip = el('button', 'ri-skip', ov, 'skip ›');
    skip.type = 'button';
    skip.addEventListener('click', function (e) { e.stopPropagation(); finish(); });
    ov.addEventListener('click', function () { if (stage === 'video') finish(); });
    requestAnimationFrame(function () { if (ov) ov.classList.add('ri-in'); });

    // Started inside the click, so sound is allowed; if the browser still says no, play muted
    playWithSound();
  }

  // Play with sound; fall back to muted only when the browser blocks sound (NotAllowedError).
  // Other failures (a stream that can't load) are left to the error handler, which retries from memory.
  function playWithSound() {
    var p = video && video.play();
    if (p && p.catch) p.catch(function (err) {
      if (!video || !err || err.name !== 'NotAllowedError') return;
      video.muted = true;
      video.play().catch(finish);
    });
  }

  function finish() {
    if (stage !== 'video') return;
    stage = 'reveal';
    // Phones: hand over to the browser's own PDF viewer
    if (coarse()) { teardown(); window.location.href = PDF; return; }

    // 1. go to white (instant if the clip is already white; a quick flash if it was skipped)
    var white = el('div', 'ri-white', ov);
    var s = ov.querySelector('.ri-skip'); if (s) s.remove();
    requestAnimationFrame(function () { white.classList.add('ri-white--in'); });

    setTimeout(function () {
      if (stage !== 'reveal') return;
      if (video) { video.pause(); video.remove(); video = null; }
      // 2. wait (briefly) for the PDF so it doesn't pop in after the reveal
      var waited = 0;
      (function ready() {
        if (stage !== 'reveal') return;
        if (frameReady || waited >= 1400) return reveal(white);
        waited += 100; setTimeout(ready, 100);
      })();
    }, 260);
  }

  // 3. purple shockwave out of the white, and the resume sharpening into place
  function reveal(white) {
    stage = 'resume';
    el('div', 'ri-bloom', ov);
    el('div', 'ri-ring', ov);
    el('div', 'ri-ring ri-ring--late', ov);
    requestAnimationFrame(function () {
      white.classList.add('ri-white--out');
      if (view) view.classList.add('ri-view--in');
      var c = view && view.querySelector('.ri-close');
      if (c) c.focus({ preventScroll: true });
    });
    setTimeout(function () {
      if (!ov) return;
      Array.prototype.forEach.call(ov.querySelectorAll('.ri-ring, .ri-bloom, .ri-white'), function (n) { n.remove(); });
    }, 1600);
  }

  // Reduced motion: no clip, no flashes, the resume just fades in
  function showDirect() {
    if (coarse()) { window.location.href = PDF; return; }
    stage = 'resume';
    makeOverlay();
    ov.classList.add('ri-in', 'ri-overlay--quiet');
    buildView();
    view.classList.add('ri-view--in');
    var c = view.querySelector('.ri-close');
    if (c) c.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (stage === 'video') finish(); else teardown();
  }

  function teardown() {
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.classList.remove('ri-open');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); video = null; }
    if (ov) ov.remove();
    ov = null; view = null; stage = 'off';
  }

  // Every plain click on a resume link goes through the intro; ctrl/cmd/middle-click still open the PDF
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href$="ZaidAhmadResume.pdf"]');
    if (!a || a.closest('.ri-overlay')) return;
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open();
  });

  // Start fetching the clip as soon as someone shows intent: hover, keyboard focus or a touch
  function intent(e) {
    var a = e.target && e.target.closest && e.target.closest('a[href$="ZaidAhmadResume.pdf"]');
    if (a) prefetch();
  }
  document.addEventListener('mouseover', intent, { passive: true });
  document.addEventListener('focusin', intent);
  document.addEventListener('touchstart', intent, { passive: true });

  window.openResume = function () { prefetch(); open(); };
})();
