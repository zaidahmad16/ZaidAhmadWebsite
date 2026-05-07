document.addEventListener('DOMContentLoaded', function () {

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

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var offset = window.innerWidth <= 900 ? 60 : 0;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    });
  });

  // Contact form
  var submitBtn = document.getElementById('contact-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      var inner   = document.getElementById('cf-inner');
      var success = document.getElementById('cf-success');
      var error   = document.getElementById('cf-error');
      var name    = document.getElementById('contact-name').value.trim();
      var email   = document.getElementById('contact-email').value.trim();
      var message = document.getElementById('contact-message').value.trim();

      if (!name || !email || !message) { alert('Please fill in all fields.'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: '8561c428-050d-4d8b-8930-271525dbc678',
          subject: 'New message from portfolio',
          name: name, email: email, message: message
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          inner.style.display = 'none';
          (res.success ? success : error).style.display = 'block';
        })
        .catch(function () {
          inner.style.display = 'none';
          error.style.display = 'block';
        });
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
