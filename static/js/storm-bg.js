(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var P  = 8;  // pixel art block size (px)
  var GP = 20; // dot grid spacing

  /* ── Cloud pixel-art shapes ─────────────── */
  // 0 = empty, 1 = dark cloud body, 2 = lighter highlight (top edge)
  var SHAPES = [
    // Cumulonimbus — triple bump, anvil mass
    [[0,0,0,0,1,1,0,0,0,1,1,1,0,0,0,0],
     [0,0,0,1,2,2,1,0,1,2,2,2,1,0,0,0],
     [0,0,1,2,2,2,2,1,2,2,2,2,2,1,0,0],
     [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]],
    // Double-bump storm cloud
    [[0,0,1,1,0,0,0,0,1,1,0,0,0],
     [0,1,2,2,1,0,0,1,2,2,1,0,0],
     [1,2,2,2,2,1,1,2,2,2,2,1,0],
     [1,1,1,1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1,1,1,1],
     [0,1,1,1,1,1,1,1,1,1,1,1,0]],
    // Single-peak medium
    [[0,0,0,1,1,1,0,0,0],
     [0,0,1,2,2,2,1,0,0],
     [0,1,2,2,2,2,2,1,0],
     [1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1],
     [0,1,1,1,1,1,1,1,0]],
    // Wide flat stratus
    [[0,1,1,0,0,1,1,0,0,1,1,0,0,0],
     [1,2,2,1,1,2,2,1,1,2,2,1,0,0],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,0],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [0,1,1,1,1,1,1,1,1,1,1,1,1,0]],
    // Anvil top (cumulonimbus with spread cap)
    [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
     [0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0],
     [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
     [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
     [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
     [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]],
    // Small puff
    [[0,0,1,1,1,0,0],
     [0,1,2,2,2,1,0],
     [1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1],
     [0,1,1,1,1,1,0]],
  ];

  var W = 0, H = 0;
  var clouds = [];
  var bolts = [];
  var embers = [];
  var lastFlash = 0, nextFlash = 400 + Math.random() * 800;

  /* ── Dot-grid pattern (cached per theme) ── */
  var dotPat = null, dotCache = '';

  function buildDotPattern(bdrColor) {
    var dc = document.createElement('canvas');
    dc.width = dc.height = GP;
    var dx = dc.getContext('2d');
    dx.fillStyle = bdrColor;
    dx.fillRect(0, 0, 1, 1);
    dotPat   = ctx.createPattern(dc, 'repeat');
    dotCache = bdrColor;
  }

  /* ── Resize + cloud placement ───────────── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildClouds();
  }

  function buildClouds() {
    clouds = [];
    var count = Math.max(10, Math.floor(W * H / 52000));
    for (var i = 0; i < count; i++) {
      var s     = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      var scale = P + Math.floor(Math.random() * 4) * 2; // 8,10,12,14
      clouds.push({
        shape : s,
        x     : Math.random() * (W + 200) - 100,
        y     : Math.random() * (H + 100) - 50,
        scale : scale,
        speed : 0.05 + Math.random() * 0.18,
      });
    }
  }

  /* ── Lightning bolt generator ───────────── */
  function spawnBolt() {
    if (!clouds.length) return;
    var c    = clouds[Math.floor(Math.random() * clouds.length)];
    var cols = c.shape[0].length;
    var rows = c.shape.length;
    var sx   = Math.floor((c.x + cols * c.scale * (0.2 + Math.random() * 0.6)) / P);
    var sy   = Math.floor((c.y + rows * c.scale) / P);

    var pixels = [];
    var px = sx, py = sy;
    var len = 20 + Math.floor(Math.random() * 30); // much longer bolts
    for (var i = 0; i < len; i++) {
      pixels.push([px, py]);
      // wider, more jagged zigzag
      var jag = Math.random();
      if (jag < 0.4)      px -= 1 + Math.floor(Math.random() * 2);
      else if (jag < 0.8) px += 1 + Math.floor(Math.random() * 2);
      py++;
    }
    // 1–3 branches
    var numBranches = 1 + Math.floor(Math.random() * 3);
    for (var b = 0; b < numBranches; b++) {
      var bi  = Math.floor(len * (0.2 + Math.random() * 0.6));
      var bx2 = pixels[bi][0], by2 = pixels[bi][1];
      var dir = Math.random() > 0.5 ? 1 : -1;
      var bl  = 5 + Math.floor(Math.random() * 12);
      for (var j = 0; j < bl; j++) {
        pixels.push([bx2, by2]);
        by2++; bx2 += dir + (Math.random() > 0.5 ? dir : 0);
      }
    }
    bolts.push({ pixels: pixels, alpha: 1, decay: 0.025 + Math.random() * 0.02 });
  }

  /* ── Fire pillar (Reshiram / light mode) ─── */
  function spawnFlame() {
    // Rise from ground level — tall dramatic pillar
    var sx = Math.floor(Math.random() * (W / P));
    var sy = Math.floor(H / P);

    var pixels = [];
    var px = sx, py = sy;
    var len = 30 + Math.floor(Math.random() * 35); // very tall columns
    for (var i = 0; i < len; i++) {
      // Wide base (up to 4px), tapering to 1px tip
      var halfW = Math.max(0, Math.floor((1 - i / len) * (3 + Math.random() * 3)));
      for (var w = -halfW; w <= halfW; w++) pixels.push([px + w, py]);
      py--;
      if (i % 2 === 0) px += Math.floor(Math.random() * 3) - 1;
    }
    // 2–4 branching flame tongues
    var numTongues = 2 + Math.floor(Math.random() * 3);
    for (var t = 0; t < numTongues; t++) {
      var ti = Math.floor(len * (0.15 + Math.random() * 0.5));
      if (!pixels[ti]) continue;
      var tx = pixels[ti][0], ty = pixels[ti][1];
      var td = Math.random() > 0.5 ? 1 : -1;
      var tl = 6 + Math.floor(Math.random() * 14);
      for (var j = 0; j < tl; j++) {
        var tw = Math.max(0, Math.floor((1 - j / tl) * 2));
        for (var tw2 = -tw; tw2 <= tw; tw2++) pixels.push([tx + tw2, ty]);
        ty--;
        tx += td + (Math.random() > 0.6 ? td : 0);
      }
    }
    bolts.push({ pixels: pixels, alpha: 1, decay: 0.022 + Math.random() * 0.02 });
  }

  /* ── Ember sparks (light mode ambient) ───── */
  var embers = [];
  function spawnEmbers() {
    var count = 3 + Math.floor(Math.random() * 5);
    for (var i = 0; i < count; i++) {
      embers.push({
        x: Math.random() * W,
        y: H - Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.5 + Math.random() * 1.2),
        alpha: 0.8 + Math.random() * 0.2,
        decay: 0.008 + Math.random() * 0.008,
      });
    }
  }

  /* ── Spawn whichever fits the theme ─────── */
  function spawnEffect() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) spawnBolt(); else spawnFlame();
  }

  /* ── Read CSS custom property ───────────── */
  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  /* ── Draw loop ──────────────────────────── */
  function draw(ts) {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var bg  = css('--bg');
    var bdr = css('--bdr');
    var acc = css('--accent');

    // ── Background fill
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Dot grid
    if (bdr !== dotCache) buildDotPattern(bdr);
    ctx.fillStyle = dotPat;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, W, H);

    // ── Theme-specific colours
    var boltColor, boltCore;
    if (isDark) {
      boltColor = acc;
      boltCore  = '#e8f4ff';

      // ── Zekrom: dark storm clouds
      clouds.forEach(function (c) {
        c.x += c.speed;
        if (c.x > W + c.shape[0].length * c.scale) c.x = -c.shape[0].length * c.scale;
        ctx.fillStyle   = '#08090f';
        ctx.globalAlpha = 0.85;
        c.shape.forEach(function (row, ry) {
          row.forEach(function (cell, rx) {
            if (cell === 1) ctx.fillRect(c.x + rx * c.scale, c.y + ry * c.scale, c.scale, c.scale);
          });
        });
        ctx.fillStyle   = '#141626';
        ctx.globalAlpha = 0.75;
        c.shape.forEach(function (row, ry) {
          row.forEach(function (cell, rx) {
            if (cell === 2) ctx.fillRect(c.x + rx * c.scale, c.y + ry * c.scale, c.scale, c.scale);
          });
        });
      });
    } else {
      // ── Reshiram: atmospheric fire — ground glow + embers
      boltColor = '#ff6a00';   // deep fire orange
      boltCore  = '#fff8e1';   // white-hot core

      // Ground fire glow gradient
      var grd = ctx.createLinearGradient(0, H, 0, H * 0.55);
      grd.addColorStop(0,   'rgba(255,100,0,0.18)');
      grd.addColorStop(0.5, 'rgba(255,60,0,0.07)');
      grd.addColorStop(1,   'rgba(255,60,0,0)');
      ctx.fillStyle   = grd;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, W, H);

      // Ember sparks rising
      if (Math.random() > 0.6) spawnEmbers();
      embers.forEach(function (e) {
        e.x += e.vx; e.y += e.vy;
        e.alpha -= e.decay;
        ctx.globalAlpha = e.alpha;
        ctx.fillStyle   = e.alpha > 0.5 ? '#ffcc44' : '#ff6600';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur  = 6;
        ctx.fillRect(e.x, e.y, P * 0.75, P * 0.75);
        ctx.shadowBlur  = 0;
      });
      embers = embers.filter(function (e) { return e.alpha > 0 && e.y > -20; });
    }

    // ── Lightning / fire pillar rendering
    bolts.forEach(function (b) {
      // Outer glow
      ctx.globalAlpha = b.alpha * 0.22;
      ctx.fillStyle   = boltColor;
      ctx.shadowColor = boltColor;
      ctx.shadowBlur  = 32;
      b.pixels.forEach(function (p) {
        ctx.fillRect(p[0] * P - P * 2, p[1] * P - P, P * 5, P * 3);
      });
      // Mid glow
      ctx.globalAlpha = b.alpha * 0.5;
      ctx.fillStyle   = boltColor;
      ctx.shadowBlur  = 16;
      b.pixels.forEach(function (p) {
        ctx.fillRect(p[0] * P - P, p[1] * P, P * 3, P);
      });
      // White-hot core
      ctx.globalAlpha = b.alpha;
      ctx.fillStyle   = boltCore;
      ctx.shadowColor = boltColor;
      ctx.shadowBlur  = 10;
      b.pixels.forEach(function (p) {
        ctx.fillRect(p[0] * P, p[1] * P, P, P);
      });
      ctx.shadowBlur = 0;
      b.alpha -= b.decay;
    });

    ctx.globalAlpha = 1;
    bolts = bolts.filter(function (b) { return b.alpha > 0; });

    // ── Schedule next flash
    if (ts - lastFlash > nextFlash) {
      lastFlash = ts;
      nextFlash = 400 + Math.random() * 800;
      // spawn 1–3 bolts per flash
      var strikes = 1 + Math.floor(Math.random() * 3);
      for (var s = 0; s < strikes; s++) {
        (function (delay) { setTimeout(spawnEffect, delay); })(s * (40 + Math.random() * 80));
      }
    }
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();
