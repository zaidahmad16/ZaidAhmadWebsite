document.addEventListener('DOMContentLoaded', function () {

  // ── Animated theme toggler ──────────────
  var themeBtn = document.getElementById('theme-toggle');

  // Sound (ported from animated-theme-toggler component)
  var _actx = null, _abuf = null, _lastSnd = 0;
  function _audioCtx() {
    if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
    if (_actx.state === 'suspended') _actx.resume();
    return _actx;
  }
  function _playTick() {
    var now = performance.now();
    if (now - _lastSnd < 80) return;
    _lastSnd = now;
    try {
      var ac  = _audioCtx();
      if (!_abuf || _abuf.sampleRate !== ac.sampleRate) {
        var rate = ac.sampleRate, len = Math.floor(rate * 0.006);
        _abuf = ac.createBuffer(1, len, rate);
        var ch = _abuf.getChannelData(0);
        for (var i = 0; i < len; i++) {
          var t = i / len;
          ch[i] = (Math.sin(2 * Math.PI * 3400 * t) * 0.6 + (Math.random() * 2 - 1) * 0.4) * Math.pow(1 - t, 3);
        }
      }
      var src = ac.createBufferSource(), gain = ac.createGain();
      src.buffer = _abuf; gain.gain.value = 0.08;
      src.connect(gain); gain.connect(ac.destination); src.start();
    } catch(e) {}
  }

  // Update all theme toggle icons
  function _updateIcon(isDark, animate) {
    document.querySelectorAll('.att-svg').forEach(function (svg) {
      var body = svg.querySelector('.att-body');
      var mc   = svg.querySelector('.att-mc');
      var rays = svg.querySelector('.att-rays');
      if (!animate) svg.closest('button').classList.add('att-no-transition');
      if (isDark) {
        svg.style.transform  = 'rotate(270deg)';
        body.setAttribute('r', '9');
        mc.setAttribute('cx', '17');
        mc.setAttribute('cy', '8');
        rays.style.opacity   = '0';
        rays.style.transform = 'scale(0) rotate(-30deg)';
      } else {
        svg.style.transform  = 'rotate(0deg)';
        body.setAttribute('r', '5');
        mc.setAttribute('cx', '33');
        mc.setAttribute('cy', '0');
        rays.style.opacity   = '1';
        rays.style.transform = 'scale(1) rotate(0deg)';
      }
      if (!animate) {
        requestAnimationFrame(function () {
          svg.closest('button').classList.remove('att-no-transition');
        });
      }
    });
  }

  function setTheme(theme, animate) {
    var isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    _updateIcon(isDark, animate);
  }

  // Always default to light; dark is session-only (toggle resets on next visit)
  setTheme('light', false);

  function _toggleTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'light' : 'dark', true);
    _playTick();
  }

  [themeBtn, document.getElementById('hero-theme-toggle')].forEach(function (btn) {
    if (btn) btn.addEventListener('click', _toggleTheme);
  });


  // ── Scroll reveal ────────────────────────
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el, i) {
    // Set stagger index on children for reveal-stagger
    if (el.classList.contains('reveal-stagger')) {
      Array.from(el.children).forEach(function (child, j) {
        child.style.setProperty('--i', j);
      });
    }
    revealObs.observe(el);
  });

  // Active nav link via IntersectionObserver
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.pn-link');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.dataset.s === entry.target.id);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  sections.forEach(function (s) { io.observe(s); });

  // Mobile menu toggle
  var toggle = document.getElementById('mh-toggle');
  var mhNav  = document.getElementById('mh-nav');
  if (toggle && mhNav) {
    toggle.addEventListener('click', function () {
      var open = mhNav.classList.toggle('open');
      var spans = toggle.querySelectorAll('span');
      spans[0].style.transform = open ? 'rotate(45deg) translate(3px, 3.5px)' : '';
      spans[1].style.transform = open ? 'rotate(-45deg) translate(1px, -3px)' : '';
    });
    mhNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mhNav.classList.remove('open');
        toggle.querySelectorAll('span').forEach(function (s) { s.style.transform = ''; });
      });
    });
  }

  // ── Scroll progress bar ──────────────────
  var progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', function () {
      var scrollTop  = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight  = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = pct + '%';
    }, { passive: true });
  }

  // ── Copy email to clipboard ───────────────
  var emailLink = document.querySelector('.ct-link[href^="mailto:"]');
  if (emailLink && navigator.clipboard) {
    emailLink.addEventListener('click', function (e) {
      e.preventDefault();
      var email = 'zaidahmad8060@gmail.com';
      navigator.clipboard.writeText(email).then(function () {
        var val = emailLink.querySelector('.ct-val');
        if (!val) return;
        var orig = val.textContent;
        val.textContent = 'Copied!';
        val.style.color = 'var(--color-accent)';
        setTimeout(function () {
          val.textContent = orig;
          val.style.color = '';
        }, 1800);
      });
    });
  }

  // Contact form
  var contactForm = document.getElementById('contact-form');
  var cfStatus    = document.getElementById('cf-status');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name  = document.getElementById('cf-name').value.trim();
      var email = document.getElementById('cf-email').value.trim();
      var msg   = document.getElementById('cf-msg').value.trim();
      if (!name || !email || !msg) return;

      var subject = encodeURIComponent('Portfolio contact from ' + name);
      var body    = encodeURIComponent('From: ' + name + ' <' + email + '>\n\n' + msg);
      window.location.href = 'mailto:zaidahmad8060@gmail.com?subject=' + subject + '&body=' + body;

      if (cfStatus) {
        cfStatus.textContent = 'Opening your email client…';
        setTimeout(function () { cfStatus.textContent = ''; }, 4000);
      }
    });
  }

  // Resume overlay
  var overlay = document.getElementById('resume-overlay');
  var roClose = document.getElementById('ro-close');
  if (roClose && overlay) {
    roClose.addEventListener('click', function () { overlay.style.display = 'none'; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.style.display === 'flex') overlay.style.display = 'none';
    });
  }

});
