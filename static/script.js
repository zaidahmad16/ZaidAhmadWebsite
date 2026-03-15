// ========================================
// COPY EMAIL FUNCTION
// ========================================
function copyEmail() {
  const email = 'zaidahmad8060@gmail.com';
  
  // Try to open email client first
  const mailtoLink = document.createElement('a');
  mailtoLink.href = 'mailto:' + email;
  mailtoLink.click();
  
  // Also copy to clipboard as fallback
  navigator.clipboard.writeText(email).then(() => {
    const msg = document.getElementById('email-copied');
    if (msg) {
      msg.style.display = 'block';
      setTimeout(() => {
        msg.style.display = 'none';
      }, 3000);
    }
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = email;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    const msg = document.getElementById('email-copied');
    if (msg) {
      msg.style.display = 'block';
      setTimeout(() => {
        msg.style.display = 'none';
      }, 3000);
    }
  });
}



document.addEventListener("DOMContentLoaded", () => {
  // ========================================
  // PARTICLE SYSTEM
  // ========================================
  const particleContainer = document.getElementById('particles');
  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.opacity = Math.random() * 0.5 + 0.2;
    particle.style.width = particle.style.height = (Math.random() * 4 + 2) + 'px';
    particleContainer.appendChild(particle);
  }

  // ========================================
  // TYPEWRITER EFFECT
  // ========================================
  const typewriter = document.getElementById('typewriter');
  const phrases = [
    'full-stack applications',
    'elegant solutions',
    'intuitive interfaces',
    'robust systems',
    'impactful software'
  ];
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  function type() {
    const currentPhrase = phrases[phraseIndex];
    
    if (isDeleting) {
      typewriter.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 50;
    } else {
      typewriter.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 100;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      isDeleting = true;
      typingSpeed = 2000; // Pause at end
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingSpeed = 500; // Pause before new phrase
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
      nav.style.background = 'rgba(10, 10, 15, 0.95)';
    } else {
      nav.style.background = 'rgba(10, 10, 15, 0.8)';
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
  // PROJECT CARD TILT EFFECT
  // ========================================
  const projectCards = document.querySelectorAll('.project-card');

  projectCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
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
      } else {
        scrollIndicator.style.opacity = '1';
      }
    });
  }

  // ========================================
  // FORM FOCUS EFFECTS (if you add a form)
  // ========================================
  const formInputs = document.querySelectorAll('input, textarea');
  
  formInputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
      if (!this.value) {
        this.parentElement.classList.remove('focused');
      }
    });
  });

  // ========================================
  // CONTAINER SCROLL ANIMATION
  // ========================================
  const scrollContainer = document.querySelector('[data-scroll-container]');
  const scrollHeader = document.querySelector('[data-scroll-header]');
  const scrollCard = document.querySelector('[data-scroll-card]');

  if (scrollContainer && scrollHeader && scrollCard) {
    // Check if mobile
    let isMobile = window.innerWidth <= 768;
    
    window.addEventListener('resize', () => {
      isMobile = window.innerWidth <= 768;
    });

    // Helper function to interpolate values based on scroll progress
    const lerp = (start, end, progress) => {
      return start + (end - start) * progress;
    };

    // Clamp value between min and max
    const clamp = (value, min, max) => {
      return Math.min(Math.max(value, min), max);
    };

    const updateScrollAnimation = () => {
      const rect = scrollContainer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate scroll progress (0 to 1) based on element position
      // Start when element enters viewport, end when it's near the top
      const elementTop = rect.top;
      const elementHeight = rect.height;
      
      // Progress goes from 0 (element just entering) to 1 (element scrolled past)
      const start = windowHeight;
      const end = -elementHeight * 0.5;
      const progress = clamp((start - elementTop) / (start - end), 0, 1);
      
      // Calculate transform values based on scroll progress
      const scaleDimensions = isMobile ? [0.7, 0.9] : [1.05, 1];
      
      // Rotate from 20deg to 0deg
      const rotateX = lerp(20, 0, progress);
      
      // Scale based on mobile/desktop
      const scale = lerp(scaleDimensions[0], scaleDimensions[1], progress);
      
      // Translate header from 0 to -100
      const translateY = lerp(0, -100, progress);
      
      // Apply transforms
      scrollHeader.style.transform = `translateY(${translateY}px)`;
      scrollCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) scale(${scale})`;
    };

    // Use requestAnimationFrame for smooth animation
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateScrollAnimation();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Initial update
    updateScrollAnimation();
  }

  // ========================================
  // CONTACT FORM HANDLER (Web3Forms)
  // ========================================
  const contactSubmitBtn = document.getElementById('contact-submit-btn');
  
  if (contactSubmitBtn) {
    contactSubmitBtn.addEventListener('click', function() {
      const contactFormContainer = document.getElementById('contact-form-container');
      const contactSuccess = document.getElementById('contact-success');
      const contactError = document.getElementById('contact-error');
      
      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const message = document.getElementById('contact-message').value.trim();
      
      // Validation
      if (!name || !email || !message) {
        alert('Please fill in all fields');
        return;
      }
      
      // Disable button and show loading state
      contactSubmitBtn.disabled = true;
      contactSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      
      const data = {
        access_key: '8561c428-050d-4d8b-8930-271525dbc678',
        subject: 'New Contact from Portfolio Website',
        name: name,
        email: email,
        message: message
      };
      
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(result) {
        console.log('Web3Forms result:', result);
        if (result.success) {
          contactFormContainer.style.display = 'none';
          contactSuccess.style.display = 'block';
        } else {
          contactFormContainer.style.display = 'none';
          contactError.style.display = 'block';
        }
      })
      .catch(function(error) {
        console.error('Error:', error);
        contactFormContainer.style.display = 'none';
        contactError.style.display = 'block';
      });
    });
  }

  console.log('🚀 Portfolio loaded successfully!');
});
