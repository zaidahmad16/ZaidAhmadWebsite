/* hollow-purple-fx.js — the build-up before the Hollow Purple clip, after the reel it's based on.
   A snapshot of one element (the one that melts) is drawn on a transparent full-screen WebGL canvas
   over the live page and warped by one fragment shader:
   Blue and Red appear inside an element, the element melts toward them (twirl, pinch, drip) with
   rainbow fringes and ripples, then both orbs open into bubbles of anime sky that merge (a smooth
   union of two circles) until the sky fills the screen, matching the clip's next shot.
   HollowPurpleFX.play({ snapshot, sky, box, clock, duration, onFirstFrame, onDone }) -> { stop } */
(function () {
  'use strict';

  var VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D uPage, uSky;',
    'uniform vec2 uRes, uSkySize, uBlue, uRed;',
    'uniform vec4 uBox;',                 // melting element: x, y, w, h (px, top-left origin)
    'uniform float uBlueR, uRedR, uMelt, uBub, uBubB, uBubR, uTime, uOrbs, uHasPage;',
    'mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }',
    // the element's snapshot lives in its box; everywhere else is transparent (the live page shows)
    'vec4 page(vec2 q){',
    '  vec2 uv = (q - uBox.xy) / uBox.zw;',
    '  if (uHasPage < 0.5 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);',
    '  return texture2D(uPage, uv);',     // premultiplied RGBA
    '}',
    // the sky texture fills the screen like object-fit: cover
    'vec3 sky(vec2 q){',
    '  float s = max(uRes.x / uSkySize.x, uRes.y / uSkySize.y);',
    '  vec2 uv = (q - 0.5 * uRes) / (uSkySize * s) + 0.5;',
    '  return texture2D(uSky, clamp(uv, 0.0, 1.0)).rgb;',
    '}',
    'vec3 rainbow(float h){ return 0.5 + 0.5 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67))); }',
    'float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }',
    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  float S = min(uRes.x, uRes.y);',
    '  vec2 dB = p - uBlue, dR = p - uRed;',
    '  float rB = length(dB), rR = length(dR);',
    '  vec2 q = p;',
    // twirl: Blue spins the page one way, Red the other
    '  q = uBlue + rot(uMelt * 2.8 * exp(-rB / (0.20 * S))) * (q - uBlue);',
    '  q = uRed + rot(-uMelt * 1.6 * exp(-rR / (0.14 * S))) * (q - uRed);',
    // pinch: content is drawn in toward both orbs (and bulges around them early on)
    '  q = uBlue + (q - uBlue) * (1.0 + uMelt * 0.55 * exp(-rB / (0.16 * S)));',
    '  q = uRed + (q - uRed) * (1.0 + uMelt * 0.45 * exp(-rR / (0.11 * S)));',
    // drip: the element stretches down between the orbs like melting wax
    '  float colX = smoothstep(uBox.x - 30.0, uBox.x + 30.0, p.x) * (1.0 - smoothstep(uBox.x + uBox.z - 30.0, uBox.x + uBox.z + 30.0, p.x));',
    '  float colY = smoothstep(uBox.y - 60.0, uBox.y + 20.0, p.y) * (1.0 - smoothstep(uBox.y + uBox.w, uBox.y + uBox.w + 0.35 * uBox.w, p.y));',
    '  float wave = 0.55 + 0.45 * sin(p.x * 0.035 + uTime * 1.7) * sin(p.x * 0.013 - uTime * 0.9);',
    '  q.y -= uMelt * uMelt * 0.32 * uBox.w * wave * colX * colY * clamp((p.y - uBox.y) / uBox.w, 0.0, 1.3);',
    '  q.x += uMelt * 18.0 * sin(p.y * 0.05 + uTime * 3.0) * colX * colY;',
    // ripples rolling out from Blue across the page
    '  float rip = sin(rB * 0.085 - uTime * 9.0) * exp(-rB / (0.28 * S)) * smoothstep(0.25, 0.7, uMelt);',
    '  q += normalize(dB + 0.001) * rip * 5.0;',
    // vortex: once the bubbles open, everything streaks toward them
    '  q = uBlue + (q - uBlue) * (1.0 + uBub * 1.4 * exp(-rB / (0.6 * S)));',
    // chromatic aberration: the oil-slick rainbow edges
    '  float ca = uMelt * 12.0 * exp(-min(rB, rR) / (0.2 * S)) + uBub * 16.0;',
    '  vec2 dir = normalize(q - uBlue + 0.001);',
    '  vec4 pg = page(q);',
    '  vec3 col = vec3(page(q + dir * ca).r, pg.g, page(q - dir * ca).b);',   // premultiplied
    '  float al = max(pg.a, max(page(q + dir * ca).a, page(q - dir * ca).a));',
    '  col += al * uMelt * 0.16 * rainbow(atan(dB.y, dB.x) * 0.5 + rB * 0.006 - uTime * 0.8) * exp(-rB / (0.22 * S)) * colX;',
    // orbs: glossy spheres. Blue refracts the sky (clouds swirling inside), Red is a red glass ball
    '  if (uOrbs > 0.0) {',
    '    float gB = exp(-max(rB - uBlueR, 0.0) / (0.55 * uBlueR + 1.0));',
    '    col += vec3(0.25, 0.55, 1.0) * gB * 0.85 * uOrbs; al = max(al, gB * 0.55 * uOrbs);',
    '    if (rB < uBlueR) {',
    '      vec2 n = dB / uBlueR; float z = sqrt(max(1.0 - dot(n, n), 0.0));',
    '      vec2 sq = uBlue + rot(uTime * 2.2) * n * uBlueR * 3.0 / (0.6 + z);',
    '      vec3 c = sky(sq) * vec3(0.55, 0.8, 1.25) + vec3(0.05, 0.12, 0.35);',
    '      c = mix(vec3(0.02, 0.12, 0.55), c, smoothstep(0.0, 0.55, z));',
    '      c += pow(max(1.0 - length(n - vec2(-0.35, -0.42)) * 2.2, 0.0), 2.5) * 0.9;',
    '      float m = uOrbs * (1.0 - smoothstep(0.92, 1.0, length(n)));',
    '      col = mix(col, c, m); al = mix(al, 1.0, m);',
    '    }',
    '    float gR = exp(-max(rR - uRedR, 0.0) / (0.5 * uRedR + 1.0));',
    '    col += vec3(1.0, 0.25, 0.3) * gR * 0.75 * uOrbs; al = max(al, gR * 0.5 * uOrbs);',
    '    if (rR < uRedR) {',
    '      vec2 n = dR / uRedR; float z = sqrt(max(1.0 - dot(n, n), 0.0));',
    '      vec3 c = mix(vec3(0.45, 0.0, 0.06), vec3(1.0, 0.35, 0.4), z) + vec3(0.25, 0.05, 0.1) * sin(atan(n.y, n.x) * 3.0 + uTime * 5.0) * z;',
    '      c += pow(max(1.0 - length(n - vec2(-0.3, -0.38)) * 2.4, 0.0), 2.5) * 0.9;',
    '      float m = uOrbs * (1.0 - smoothstep(0.9, 1.0, length(n)));',
    '      col = mix(col, c, m); al = mix(al, 1.0, m);',
    '    }',
    '  }',
    // bubbles of sky that merge through a smooth neck; the swirl inside unwinds as they fill the screen
    '  if (uBub > 0.0) {',
    '    float d = smin(rB - uBubB, rR - uBubR, 0.22 * S);',
    '    float rim = 0.035 * S;',
    '    vec2 c = rB - uBubB < rR - uBubR ? uBlue : uRed;',
    '    vec2 dc = p - c; float r = length(dc);',
    '    float swirl = (1.0 - uBub) * 3.2 * exp(-r / (0.35 * S));',
    '    float lens = smoothstep(-rim * 2.5, 0.0, d);',     // refraction toward the rim
    '    vec2 sq = c + rot(swirl + uTime * 0.6 * (1.0 - uBub)) * dc * (1.0 - 0.18 * lens);',
    '    vec3 s = sky(mix(sq, p, smoothstep(0.75, 1.0, uBub)));',
    '    s += vec3(0.55, 0.8, 1.0) * smoothstep(-rim, 0.0, d) * 0.7;',     // bright refractive rim
    '    float inside = 1.0 - smoothstep(-1.5, 1.5, d);',
    '    col = mix(col, s, inside); al = mix(al, 1.0, inside);',
    '    float halo = exp(-abs(d) / (0.02 * S)) * 0.35 * (1.0 - uBub);',  // glow just outside
    '    col += vec3(0.4, 0.7, 1.0) * halo; al = max(al, halo);',
    '  }',
    '  gl_FragColor = vec4(min(col, vec3(al + 0.6)), clamp(al, 0.0, 1.0));',
    '}'
  ].join('\n');

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
  function easeIn(k) { return k * k; }
  function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function texture(gl, unit, source, rgba) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !!rgba);
    var f = rgba ? gl.RGBA : gl.RGB;
    gl.texImage2D(gl.TEXTURE_2D, 0, f, f, gl.UNSIGNED_BYTE, source);
    return t;
  }

  function supported() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
    catch (e) { return false; }
  }

  // opts.snapshot: canvas of the visible page; opts.sky: loaded <img>; opts.box: DOMRect of the element
  // that melts (CSS px); opts.clock(): seconds into the build-up; opts.duration (s); opts.onDone()
  function play(opts) {
    var canvas = document.createElement('canvas');
    canvas.className = 'ri-fx';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false }) ||
             canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) throw new Error('no webgl');

    var vw = window.innerWidth, vh = window.innerHeight;
    var k = Math.min(window.devicePixelRatio || 1, 1.5);   // device pixels per CSS px
    canvas.width = Math.round(vw * k); canvas.height = Math.round(vh * k);
    document.body.appendChild(canvas);

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    if (opts.snapshot) texture(gl, 0, opts.snapshot, true);
    else texture(gl, 0, new ImageData(1, 1), true);
    texture(gl, 1, opts.sky, false);
    var U = {};
    ['uPage', 'uSky', 'uRes', 'uSkySize', 'uBlue', 'uRed', 'uBox', 'uBlueR', 'uRedR', 'uMelt', 'uBub', 'uBubB', 'uBubR', 'uTime', 'uOrbs', 'uHasPage']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uPage, 0); gl.uniform1i(U.uSky, 1);
    gl.uniform1f(U.uHasPage, opts.snapshot ? 1 : 0);
    gl.clearColor(0, 0, 0, 0);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uSkySize, opts.sky.naturalWidth || opts.sky.width, opts.sky.naturalHeight || opts.sky.height);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // geometry in device px: the orbs start inside the element, like the prizes in the claw machine
    var b = opts.box;
    var bx = b.left * k, by = b.top * k, bw = b.width * k, bh = b.height * k;
    var cx = bx + bw / 2;
    gl.uniform4f(U.uBox, bx, by, bw, bh);
    var r0 = Math.max(14 * k, Math.min(48 * k, bw * 0.085));
    var diag = Math.hypot(canvas.width, canvas.height);
    var D = opts.duration || 3.1, done = false, raf = null, first = true;

    function frame() {
      if (done) return;
      var t = opts.clock();
      // timeline (fractions of D): appear, rise and start to melt, full melt, bubbles
      var a = easeInOut(seg(t, 0.0, 0.13 * D));
      var rise = easeInOut(seg(t, 0.13 * D, 0.55 * D));
      var melt = 0.08 * a + 0.4 * easeIn(seg(t, 0.13 * D, 0.42 * D)) + 0.52 * easeIn(seg(t, 0.42 * D, 0.71 * D));
      var bubB = easeIn(seg(t, 0.71 * D, 0.99 * D)), bubR = easeIn(seg(t, 0.75 * D, 0.99 * D));
      var blueY = lerp(by + bh * 0.42, by + bh * 0.04, rise), redY = lerp(by + bh * 0.62, by + bh * 0.96, rise);
      var blueR = r0 * a * lerp(1, 2.6, rise) * (1 + 0.06 * Math.sin(t * 9));
      var redR = r0 * 0.62 * a * lerp(1, 1.5, rise) * (1 + 0.06 * Math.cos(t * 11));
      gl.uniform2f(U.uBlue, cx, blueY);
      gl.uniform2f(U.uRed, cx, redY);
      gl.uniform1f(U.uBlueR, blueR);
      gl.uniform1f(U.uRedR, redR);
      gl.uniform1f(U.uMelt, Math.min(1, melt));
      gl.uniform1f(U.uBub, bubB);
      gl.uniform1f(U.uBubB, lerp(blueR * 0.9, diag * 1.15, bubB));
      gl.uniform1f(U.uBubR, lerp(redR * 0.9, diag * 1.15, bubR));
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uOrbs, a * (1 - seg(t, 0.72 * D, 0.8 * D)));
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (first) { first = false; if (opts.onFirstFrame) opts.onFirstFrame(); }
      if (t >= D) { done = true; if (opts.onDone) opts.onDone(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      canvas: canvas,
      stop: function () {
        done = true;
        if (raf) cancelAnimationFrame(raf);
        var lose = gl.getExtension('WEBGL_lose_context');
        canvas.remove();
        if (lose) lose.loseContext();
      },
    };
  }

  window.HollowPurpleFX = { play: play, supported: supported };
})();
