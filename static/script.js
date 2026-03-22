// Portfolio Script

document.addEventListener("DOMContentLoaded", function() {

  // Scroll reveal
  var sections = document.querySelectorAll(".section");
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");

        // Stagger children
        var children = entry.target.querySelectorAll(
          '.work-card, .exp-row:not(.exp-row--header), .contact-link, .edu-courses span'
        );
        children.forEach(function(el, i) {
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
          el.style.transition = 'opacity .5s cubic-bezier(.4,0,.2,1) ' + (i * 0.06) + 's, transform .5s cubic-bezier(.4,0,.2,1) ' + (i * 0.06) + 's';
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              el.style.opacity = '1';
              el.style.transform = 'none';
            });
          });
        });
      }
    });
  }, { threshold: 0.01 });

  sections.forEach(function(s) { observer.observe(s); });

  // Nav scroll hide/show
  var nav = document.querySelector('.nav');
  var lastY = 0;
  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    if (y > 100) {
      nav.style.transform = y > lastY ? 'translateY(-100%)' : 'translateY(0)';
    } else {
      nav.style.transform = 'translateY(0)';
    }
    nav.style.transition = 'transform .35s cubic-bezier(.4,0,.2,1)';
    lastY = y;
  });

  // Nav active link
  var navLinks = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', function() {
    var current = '';
    sections.forEach(function(s) {
      var top = s.offsetTop - 100;
      if (window.scrollY >= top) current = s.id;
    });
    navLinks.forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  });

  // Mobile menu
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('nav-links');
  if (toggle && menu) {
    toggle.addEventListener('click', function() {
      menu.classList.toggle('active');
      var spans = toggle.querySelectorAll('span');
      if (menu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(3px, 3px)';
        spans[1].style.transform = 'rotate(-45deg) translate(1px, -1px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.transform = '';
      }
    });
    menu.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        menu.classList.remove('active');
        toggle.querySelectorAll('span').forEach(function(s) { s.style.transform = ''; });
      });
    });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 70,
          behavior: 'smooth'
        });
      }
    });
  });

  // Scroll indicator hide
  var scrollEl = document.querySelector('.hero-scroll');
  if (scrollEl) {
    window.addEventListener('scroll', function() {
      scrollEl.style.opacity = window.scrollY > 150 ? '0' : '1';
      scrollEl.style.transition = 'opacity .4s';
    });
  }

  // Contact form
  var submitBtn = document.getElementById('contact-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', function() {
      var container = document.getElementById('contact-form-container');
      var success = document.getElementById('contact-success');
      var error = document.getElementById('contact-error');
      var name = document.getElementById('contact-name').value.trim();
      var email = document.getElementById('contact-email').value.trim();
      var message = document.getElementById('contact-message').value.trim();

      if (!name || !email || !message) { alert('Please fill in all fields'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: '8561c428-050d-4d8b-8930-271525dbc678',
          subject: 'New Contact from Portfolio',
          name: name, email: email, message: message
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        container.style.display = 'none';
        (res.success ? success : error).style.display = 'block';
      })
      .catch(function() {
        container.style.display = 'none';
        error.style.display = 'block';
      });
    });
  }

});
