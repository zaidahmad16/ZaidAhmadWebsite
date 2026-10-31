/* resume-intro.js — clicking Resume plays the Hollow Purple scene (Jujutsu Kaisen S2E4, English dub),
   then the resume is revealed out of the scene's white ending: a purple shockwave, and the page
   sharpening into place. The resume loads behind the clip so it's ready when the white clears.
   Skippable with a click, Esc or the skip button; skipped entirely under reduced motion (it flashes).
   The resume is drawn with PDF.js (static/vendor/pdfjs) as clean white pages on the site's own
   background: selectable text, clickable links, no browser PDF toolbar. It reads the PDF itself,
   so swapping the resume is just replacing static/docs/ZaidAhmadResume.pdf.
   The host doesn't answer byte-range requests, which Safari needs to stream video, so the clip is
   fetched in the background when someone points at a Resume link and played from memory. */
(function () {
  'use strict';

  var PDF = 'static/docs/ZaidAhmadResume.pdf';
  var CLIP = 'static/video/hollow-purple.mp4';
  var PDFJS = 'static/vendor/pdfjs/pdf.min.js', PDFJS_WORKER = 'static/vendor/pdfjs/pdf.worker.min.js';
  var ov = null, video = null, view = null, frameReady = false, stage = 'off';
  var pdfLib = null, pdfDoc = null, renderToken = 0, resizeTimer = null, lastWidth = 0;
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
    window.addEventListener('resize', onResize);
    document.documentElement.classList.add('ri-open');
  }

  // The resume page itself; built hidden so the PDF can render while the clip plays
  function buildView() {
    frameReady = false;
    view = el('div', 'ri-view', ov);
    var bar = el('div', 'ri-bar', view);
    el('span', 'ri-title', bar, 'Resume — Zaid Ahmad');
    var dl = el('a', 'ri-btn ri-btn--primary', bar, 'Download ↓');
    dl.href = PDF; dl.setAttribute('download', 'ZaidAhmadResume.pdf');
    var tab = el('a', 'ri-btn ri-btn--wide', bar, 'Open ↗');
    tab.href = PDF; tab.target = '_blank'; tab.rel = 'noopener';
    var close = el('button', 'ri-btn ri-close', bar, 'Close ×');
    close.type = 'button';
    close.addEventListener('click', teardown);
    var pages = el('div', 'ri-pages', view);
    pages.setAttribute('tabindex', '0');
    el('div', 'ri-sheet ri-sheet--loading', pages);
    renderPdf(pages);
  }

  // ── PDF.js ──────────────────────────────────────────────────────────────
  function abs(u) { return new URL(u, document.baseURI).href; }
  function loadPdf() {
    if (pdfDoc) return Promise.resolve(pdfDoc);
    return import(abs(PDFJS)).then(function (lib) {
      pdfLib = lib;
      lib.GlobalWorkerOptions.workerSrc = abs(PDFJS_WORKER);
      return lib.getDocument({ url: abs(PDF), isEvalSupported: false }).promise;
    }).then(function (doc) { pdfDoc = doc; return doc; });
  }

  // Draw every page at the width that fits, sharp on high-DPI screens, with a selectable text
  // layer and the PDF's own links on top
  function renderPdf(pages) {
    var token = ++renderToken;
    loadPdf().then(function (doc) {
      if (token !== renderToken || !pages.isConnected) return;
      var avail = pages.clientWidth - (pages.clientWidth < 600 ? 24 : 64);
      var cssW = Math.max(280, Math.min(860, avail));
      lastWidth = pages.clientWidth;
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var frag = document.createDocumentFragment(), jobs = [];
      for (var n = 1; n <= doc.numPages; n++) jobs.push(doc.getPage(n));
      return Promise.all(jobs).then(function (list) {
        return list.reduce(function (chain, page, i) {
          return chain.then(function () {
            if (token !== renderToken) return;
            var base = page.getViewport({ scale: 1 }), scale = cssW / base.width;
            var vp = page.getViewport({ scale: scale });
            var sheet = el('div', 'ri-sheet', frag);
            sheet.style.width = vp.width + 'px'; sheet.style.height = vp.height + 'px';
            sheet.style.setProperty('--total-scale-factor', scale);
            sheet.setAttribute('aria-label', 'Resume page ' + (i + 1));
            var canvas = el('canvas', 'ri-canvas', sheet);
            canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
            canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
            var text = el('div', 'textLayer', sheet);
            var links = el('div', 'ri-links', sheet);
            var done = page.render({ canvas: canvas, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
            var tl = new pdfLib.TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport: vp }).render().catch(function () {});
            var an = page.getAnnotations().then(function (anns) {
              anns.forEach(function (a) {
                if (a.subtype !== 'Link' || !a.url) return;
                // PDF space -> page pixels through the viewport's transform (works across PDF.js versions)
                var m = vp.transform, q = a.rect;
                var r = [m[0] * q[0] + m[2] * q[1] + m[4], m[1] * q[0] + m[3] * q[1] + m[5],
                         m[0] * q[2] + m[2] * q[3] + m[4], m[1] * q[2] + m[3] * q[3] + m[5]];
                var x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]);
                var link = el('a', 'ri-link', links);
                link.href = a.url; link.target = '_blank'; link.rel = 'noopener';
                link.setAttribute('aria-label', a.url.replace(/^mailto:/, ''));
                link.style.left = x + 'px'; link.style.top = y + 'px';
                link.style.width = Math.abs(r[2] - r[0]) + 'px'; link.style.height = Math.abs(r[3] - r[1]) + 'px';
              });
            }).catch(function (err) { if (window.console) console.warn('[resume] links:', err); });
            return Promise.all([done, tl, an]);
          });
        }, Promise.resolve());
      }).then(function () {
        if (token !== renderToken || !pages.isConnected) return;
        pages.innerHTML = '';
        pages.appendChild(frag);
        frameReady = true;
      });
    }).catch(function () {
      // PDF.js couldn't load: fall back to the browser's own viewer
      if (token !== renderToken || !pages.isConnected) return;
      pages.innerHTML = '';
      pages.classList.add('ri-pages--fallback');
      var frame = el('iframe', 'ri-frame', pages);
      frame.title = 'Resume';
      frame.addEventListener('load', function () { frameReady = true; });
      frame.src = PDF;
    });
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var pages = view && view.querySelector('.ri-pages:not(.ri-pages--fallback)');
      if (pages && Math.abs(pages.clientWidth - lastWidth) > 40) renderPdf(pages);
    }, 200);
  }

  function open() {
    if (stage !== 'off') return;
    if (reduced()) return showDirect();

    stage = 'pre';
    var meltTarget = pickMeltTarget();   // before the (invisible) overlay covers the page
    makeOverlay();
    ov.classList.add('ri-overlay--waiting');
    buildView();
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
    ov.addEventListener('click', function () { if (stage === 'video' || stage === 'pre') finish(); });

    // Unlock playback with sound while we're still inside the click (browsers only allow it there),
    // then hold it at the start until the build-up's snapshot is ready
    var fxStarted = false;
    var unlock = video.play();
    if (unlock && unlock.then) unlock.then(function () {
      if (video && stage === 'pre' && !fxStarted) { video.pause(); video.currentTime = 0; }
    }).catch(function () {});

    preEffect(meltTarget, function () { fxStarted = true; }, function () {
      if (stage !== 'pre' || !ov) return;
      stage = 'video';
      // Never show the clip's lead-in (the Six Eyes close-up of Gojo's face). Seeking is slow on a
      // host without range support (the face froze on screen), so don't seek: keep the build-up's
      // full-sky last frame up and reveal the clip once it has played on to its own sky shot.
      if (video && video.paused && video.currentTime < 3.2 && !fx) video.currentTime = 3.2;   // no build-up ran: start hidden at the sky shot
      if (video && video.paused) playWithSound();
      var waited = 0;
      (function whenOnSky() {
        if (stage !== 'video' || !ov) return;
        if (!video || (video.currentTime >= 3.2 && !video.seeking) || waited > 2500) {
          ov.classList.remove('ri-overlay--waiting');
          ov.classList.add('ri-in');
          setTimeout(stopPre, 400);   // let the clip fade in over the build-up's last frame
          return;
        }
        waited += 50; setTimeout(whenOnSky, 50);
      })();
    });
  }

  // ── Build-up, after the reel: a snapshot of the page goes onto a WebGL canvas
  //    (hollow-purple-fx.js); Blue and Red appear inside the element nearest the centre, it melts,
  //    and the orbs open into bubbles of sky that hand over to the clip's sky shot. The clip plays
  //    underneath from the start (its opening is the music swell), and the effect runs on its clock. ──
  var FX_SNAP = 'static/vendor/modern-screenshot/modern-screenshot.min.js';
  var FX_SKY = 'static/images/hp-sky.jpg';
  var FX_DURATION = 3.1;   // the clip cuts to the Blue/Red sky shot at 3.15s
  var fx = null, fxLoad = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  // Fetch the snapshot library and the sky image (once); started on hover like the clip
  function loadFx() {
    if (!fxLoad) {
      var sky = new Image();
      var skyReady = new Promise(function (res, rej) { sky.onload = function () { res(sky); }; sky.onerror = rej; });
      sky.src = FX_SKY;
      var lib = window.modernScreenshot ? Promise.resolve() : loadScript(FX_SNAP);
      fxLoad = Promise.all([lib, skyReady]).then(function (r) { return r[1]; });
      fxLoad.catch(function () { fxLoad = null; });
    }
    return fxLoad;
  }

  // The element the orbs appear inside, like the claw machine in the reel: the block nearest the
  // centre of the screen (the hero terminal on the home page).
  function pickMeltTarget() {
    var vw = window.innerWidth, vh = window.innerHeight, best = null, bestD = Infinity;
    var hero = document.querySelector('.hero-term');
    if (hero) {
      var h = hero.getBoundingClientRect();
      var visible = Math.max(0, Math.min(h.bottom, vh) - Math.max(h.top, 0)) * Math.max(0, Math.min(h.right, vw) - Math.max(h.left, 0));
      if (h.width * h.height > 0 && visible / (h.width * h.height) > 0.6) return hero;
    }
    // probe around the centre: the exact middle is often a gap between blocks
    [[0.5, 0.5], [0.62, 0.5], [0.38, 0.5], [0.72, 0.45], [0.28, 0.45], [0.5, 0.35], [0.5, 0.65]].forEach(function (p) {
      var t = document.elementFromPoint(vw * p[0], vh * p[1]);
      while (t && t !== document.body && t.parentElement) {
        var r = t.getBoundingClientRect();
        if (r.width * r.height >= vw * vh * 0.05 && r.width >= 160 && r.height >= 120) break;
        t = t.parentElement;
      }
      if (!t || t === document.body || t === document.documentElement) return;
      var rr = t.getBoundingClientRect();
      if (rr.width * rr.height > vw * vh * 0.6) return;
      var d = Math.hypot(rr.left + rr.width / 2 - vw / 2, rr.top + rr.height / 2 - vh / 2);
      if (d < bestD) { bestD = d; best = t; }
    });
    return best;
  }

  // Snapshot just the element that melts (cheap); the rest of the page stays the real, live page
  // under a transparent canvas. Taken at the click, never on hover (a whole-page snapshot on hover
  // made hovering Resume laggy).
  function snapshotElement(el) {
    if (!el) return Promise.resolve(null);
    var scale = Math.min(window.devicePixelRatio || 1, 1.5);
    return window.modernScreenshot.domToCanvas(el, { scale: scale });
  }

  function preEffect(target, onStart, done) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var box = target ? target.getBoundingClientRect()
                     : { left: vw * 0.3, top: vh * 0.2, width: vw * 0.4, height: vh * 0.6 };
    if (!window.HollowPurpleFX || !window.HollowPurpleFX.supported()) return done();
    var giveUp = setTimeout(function () { if (stage === 'pre' && !fx) done(); }, 2500);   // never hang on a slow snapshot
    loadFx().then(function (sky) {
      return snapshotElement(target).then(function (snap) { return [snap, sky]; });
    }).then(function (r) {
      clearTimeout(giveUp);
      if (stage !== 'pre' || !video) return;
      onStart();
      video.currentTime = 0;
      playWithSound();
      var t0 = performance.now();
      fx = window.HollowPurpleFX.play({
        snapshot: r[0], sky: r[1], box: box, duration: FX_DURATION,
        // the canvas draws the element (melting) from here on, so hide the real one under it
        onFirstFrame: function () { if (target) { target.style.visibility = 'hidden'; fx && (fx.target = target); } },
        // the clip's clock once it's really playing; the wall clock while it buffers
        clock: function () {
          var wall = (performance.now() - t0) / 1000;
          return video && !video.paused && video.currentTime > 0 ? Math.max(video.currentTime, wall - 0.25) : wall;
        },
        onDone: done,
      });
    }).catch(function (err) {
      clearTimeout(giveUp);
      if (window.console) console.warn('[resume] build-up skipped:', err);
      if (stage === 'pre') done();
    });
  }
  function stopPre() {
    if (fx) {
      if (fx.target) fx.target.style.visibility = '';
      fx.stop(); fx = null;
    }
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
    if (stage !== 'video' && stage !== 'pre') return;
    stage = 'reveal';
    stopPre();
    if (ov) { ov.classList.remove('ri-overlay--waiting'); ov.classList.add('ri-in'); }

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

  // 3. the white clears and the resume grows from a tiny page to full size
  function reveal(white) {
    stage = 'resume';
    requestAnimationFrame(function () {
      white.classList.add('ri-white--out');
      if (view) view.classList.add('ri-view--in');
      var c = view && view.querySelector('.ri-close');
      if (c) c.focus({ preventScroll: true });
    });
    setTimeout(function () {
      if (!ov) return;
      Array.prototype.forEach.call(ov.querySelectorAll('.ri-white'), function (n) { n.remove(); });
    }, 1600);
  }

  // Reduced motion: no clip, no flashes, the resume just fades in
  function showDirect() {
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
    if (stage === 'video' || stage === 'pre') finish(); else teardown();
  }

  function teardown() {
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    renderToken++;
    stopPre();
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
    if (a) { prefetch(); if (!reduced()) loadFx(); }
  }
  document.addEventListener('mouseover', intent, { passive: true });
  document.addEventListener('focusin', intent);
  document.addEventListener('touchstart', intent, { passive: true });

  window.openResume = function () { prefetch(); open(); };
})();
