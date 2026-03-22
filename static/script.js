// ====================================================
// PORTFOLIO — Script
// ====================================================

document.addEventListener("DOMContentLoaded", () => {

  // ── Typewriter ──
  // (We removed the typewriter from HTML, so this is a no-op
  // but kept for safety if the element exists)
  const typewriter = document.getElementById('typewriter');
  if (typewriter) {
    const phrases = [
      'full-stack applications',
      'developer tools',
      'intuitive interfaces',
      'robust systems',
      'impactful software'
    ];
    let phraseIndex = 0, charIndex = 0, isDeleting = false, speed = 100;

    function type() {
      const phrase = phrases[phraseIndex];
      if (isDeleting) {
        typewriter.textContent = phrase.substring(0, --charIndex);
        speed = 40;
      } else {
        typewriter.textContent = phrase.substring(0, ++charIndex);
        speed = 80;
      }
      if (!isDeleting && charIndex === phrase.length) { isDeleting = true; speed = 2000; }
      else if (isDeleting && charIndex === 0) { isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; speed = 400; }
      setTimeout(type, speed);
    }
    type();
  }

  // ── Scroll Reveal ──
  const sections = document.querySelectorAll(".section");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");

        // Stagger children (exclude about-stat to not interfere with counters)
        const children = entry.target.querySelectorAll(
          '.work-card, .exp-row:not(.exp-row--header), .contact-link, .edu-courses span'
        );
        children.forEach((el, i) => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
          el.style.transition = `opacity .5s var(--ease) ${i * 0.06}s, transform .5s var(--ease) ${i * 0.06}s`;
          requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'none';
          }));
        });
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px 0px 0px' });

  sections.forEach(s => observer.observe(s));

  // ── Counter ──
  // Simple, direct counter that just works
  document.querySelectorAll('.about-stat-num').forEach(function(el) {
    var target = Number(el.getAttribute('data-target'));
    if (!target || target <= 0) { el.textContent = '0'; return; }
    var current = 0;
    var stepTime = Math.max(Math.floor(1000 / target), 40);
    var timer = setInterval(function() {
      current++;
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, stepTime);
  });

  // ── Nav: Scroll hide/show ──
  const nav = document.querySelector('.nav');
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 100) {
      nav.style.transform = y > lastY ? 'translateY(-100%)' : 'translateY(0)';
    } else {
      nav.style.transform = 'translateY(0)';
    }
    nav.style.transition = 'transform .35s cubic-bezier(.4,0,.2,1)';
    lastY = y;
  });

  // ── Nav: Active Link ──
  const navLinks = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
      const top = s.offsetTop - 100;
      if (window.scrollY >= top) current = s.id;
    });
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  });

  // ── Mobile Menu ──
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-links');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('active');
      // Animate hamburger
      const spans = toggle.querySelectorAll('span');
      if (menu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(3px, 3px)';
        spans[1].style.transform = 'rotate(-45deg) translate(1px, -1px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.transform = '';
      }
    });
    // Close on link click
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.classList.remove('active');
        toggle.querySelectorAll('span').forEach(s => s.style.transform = '');
      });
    });
  }

  // ── Smooth Scroll ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 70,
          behavior: 'smooth'
        });
      }
    });
  });

  // ── Scroll Indicator Hide ──
  const scrollEl = document.querySelector('.hero-scroll');
  if (scrollEl) {
    window.addEventListener('scroll', () => {
      scrollEl.style.opacity = window.scrollY > 150 ? '0' : '1';
      scrollEl.style.transition = 'opacity .4s';
    });
  }

  // ── Contact Form (Web3Forms) ──
  const submitBtn = document.getElementById('contact-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', function() {
      const container = document.getElementById('contact-form-container');
      const success = document.getElementById('contact-success');
      const error = document.getElementById('contact-error');
      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const message = document.getElementById('contact-message').value.trim();

      if (!name || !email || !message) { alert('Please fill in all fields'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: '8561c428-050d-4d8b-8930-271525dbc678',
          subject: 'New Contact from Portfolio',
          name, email, message
        })
      })
      .then(r => r.json())
      .then(res => {
        container.style.display = 'none';
        (res.success ? success : error).style.display = 'block';
      })
      .catch(() => {
        container.style.display = 'none';
        error.style.display = 'block';
      });
    });
  }

});
