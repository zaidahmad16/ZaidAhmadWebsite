document.addEventListener("DOMContentLoaded", () => {
  // ========================================
  // CUSTOM CURSOR
  // ========================================
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursor-dot');
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  // Check if device supports hover (not touch-only)
  const hasHover = window.matchMedia('(hover: hover)').matches;

  if (hasHover && cursor && cursorDot) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Immediate dot movement
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
    });

    // Smooth cursor circle follow
    function animateCursor() {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      
      cursor.style.left = cursorX + 'px';
      cursor.style.top = cursorY + 'px';
      
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Cursor effects on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .glass-card, .tech-item, .project-card');
    
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
        cursor.style.borderColor = '#00ff88';
        cursor.style.mixBlendMode = 'normal';
      });
      
      el.addEventListener('mouseleave', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.borderColor = '#00ff88';
        cursor.style.mixBlendMode = 'difference';
      });
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
      cursorDot.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
      cursor.style.opacity = '1';
      cursorDot.style.opacity = '1';
    });
  }

  // ========================================
  // PARTICLE SYSTEM (Enhanced)
  // ========================================
  const particleContainer = document.getElementById('particles');
  const particleCount = 60;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.opacity = Math.random() * 0.4 + 0.1;
    
    const size = Math.random() * 3 + 1;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Random colors from our palette
    const colors = ['#00ff88', '#00d4ff', '#bf00ff', '#ff00aa'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.boxShadow = `0 0 ${size * 2}px ${particle.style.background}`;
    
    particleContainer.appendChild(particle);
  }

  // ========================================
  // TYPEWRITER EFFECT (Terminal Style)
  // ========================================
  const typewriter = document.getElementById('typewriter');
  const prefix = document.querySelector('.typewriter-prefix');
  const phrases = [
    'building full-stack applications...',
    'crafting elegant solutions...',
    'creating intuitive interfaces...',
    'engineering robust systems...',
    'shipping impactful software...'
  ];
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 80;

  function type() {
    const currentPhrase = phrases[phraseIndex];
    
    if (isDeleting) {
      typewriter.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 40;
    } else {
      typewriter.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 80;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      isDeleting = true;
      typingSpeed = 2500;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingSpeed = 500;
    }

    setTimeout(type, typingSpeed);
  }

  type();

  // ========================================
  // SCROLL-BASED SECTION REVEAL
  // ========================================
  const sections = document.querySelectorAll(".section");

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        
        // Animate stat numbers if in hero section
        const stats = entry.target.querySelectorAll('.stat-number');
        stats.forEach(stat => animateCounter(stat));
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));

  // ========================================
  // COUNTER ANIMATION
  // ========================================
  function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    if (!target || element.classList.contains('counted')) return;
    
    element.classList.add('counted');
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current);
      }
    }, stepDuration);
  }

  // Animate hero stats on load
  const heroStats = document.querySelectorAll('.hero-stats .stat-number');
  setTimeout(() => {
    heroStats.forEach(stat => animateCounter(stat));
  }, 1000);

  // ========================================
  // SMOOTH SCROLL FOR NAV LINKS
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const navHeight = document.querySelector('.glass-nav').offsetHeight;
        const targetPosition = target.offsetTop - navHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Close mobile menu if open
        document.querySelector('.nav-links')?.classList.remove('active');
      }
    });
  });

  // ========================================
  // MOBILE MENU TOGGLE
  // ========================================
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
    });
  }

  // ========================================
  // NAV BACKGROUND ON SCROLL
  // ========================================
  const nav = document.querySelector('.glass-nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      nav.style.background = 'rgba(3, 3, 3, 0.95)';
      nav.style.borderBottomColor = 'rgba(0, 255, 136, 0.2)';
    } else {
      nav.style.background = 'rgba(3, 3, 3, 0.8)';
      nav.style.borderBottomColor = 'rgba(0, 255, 136, 0.1)';
    }

    lastScroll = currentScroll;
  });

  // ========================================
  // ACTIVE NAV LINK HIGHLIGHTING
  // ========================================
  const navLinksAll = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const navHeight = document.querySelector('.glass-nav').offsetHeight;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - navHeight - 100;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionBottom) {
        current = section.getAttribute('id');
      }
    });

    navLinksAll.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // ========================================
  // MAGNETIC BUTTON EFFECT
  // ========================================
  const magneticBtns = document.querySelectorAll('.magnetic-wrap');
  
  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });

  // ========================================
  // TECH ITEM HOVER EFFECT
  // ========================================
  const techItems = document.querySelectorAll('.tech-item');
  
  techItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });

  // ========================================
  // PROJECT CARD 3D TILT EFFECT
  // ========================================
  const projectCards = document.querySelectorAll('.project-card');

  projectCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 15;
      const rotateY = (centerX - x) / 15;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      
      // Dynamic light effect
      const glowX = (x / rect.width) * 100;
      const glowY = (y / rect.height) * 100;
      card.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(0, 255, 136, 0.05) 0%, transparent 50%), var(--bg-glass)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.background = '';
    });
  });

  // ========================================
  // HIDE SCROLL INDICATOR ON SCROLL
  // ========================================
  const scrollIndicator = document.querySelector('.scroll-indicator');
  
  if (scrollIndicator) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 100) {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.pointerEvents = 'none';
      } else {
        scrollIndicator.style.opacity = '1';
        scrollIndicator.style.pointerEvents = 'auto';
      }
    });
  }

  // ========================================
  // PARALLAX EFFECT ON SCROLL
  // ========================================
  const spheres = document.querySelectorAll('.gradient-sphere');
  const aurora = document.querySelector('.aurora');
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    
    spheres.forEach((sphere, index) => {
      const speed = 0.1 + (index * 0.05);
      sphere.style.transform = `translateY(${scrolled * speed}px)`;
    });
    
    if (aurora) {
      aurora.style.transform = `translateY(${scrolled * 0.08}px)`;
    }
  });

  // ========================================
  // REVEAL ANIMATION FOR CARDS
  // ========================================
  const cards = document.querySelectorAll('.glass-card');
  
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    cardObserver.observe(card);
  });

  // ========================================
  // CONSOLE EASTER EGG
  // ========================================
  console.log('%c⚡ ZAID AHMAD ⚡', 'font-size: 2rem; font-weight: bold; color: #00ff88; text-shadow: 0 0 10px #00ff88;');
  console.log('%cThanks for checking out the console! 🔍', 'font-size: 1rem; color: #00d4ff;');
  console.log('%cContact: zaidahmad8060@gmail.com', 'font-size: 0.9rem; color: #bf00ff;');
});
