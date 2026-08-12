// ========== Navbar scroll effect ==========
const navbar = document.getElementById('navbar');
let lastScroll = 0;

// ========== Hero video: respect data, battery and motion preferences ==========
const heroVideo = document.getElementById('heroVideo');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hasDesktopViewport = window.matchMedia('(min-width: 769px)');
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const shouldSaveData = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''));
if (heroVideo && hasDesktopViewport.matches && !prefersReducedMotion.matches && !shouldSaveData) {
  heroVideo.muted = true;
  const playHero = () => {
    heroVideo.play().then(() => heroVideo.classList.add('is-playing')).catch(() => {});
  };
  const heroMediaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) playHero();
      else heroVideo.pause();
    });
  }, { threshold: 0.08 });
  const observeHero = () => window.setTimeout(() => heroMediaObserver.observe(heroVideo), 1200);
  if (document.readyState === 'complete') observeHero();
  else window.addEventListener('load', observeHero, { once: true });
}

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  lastScroll = scrollY;
});

// ========== Mobile menu toggle ==========
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navOverlay = document.getElementById('navOverlay');

function toggleMenu() {
  navLinks.classList.toggle('open');
  navToggle.classList.toggle('active');
  navOverlay.classList.toggle('active');
  const isOpen = navLinks.classList.contains('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMenu() {
  navLinks.classList.remove('open');
  navToggle.classList.remove('active');
  navOverlay.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

navToggle.addEventListener('click', toggleMenu);
navOverlay.addEventListener('click', closeMenu);

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

// ========== Scroll animations (IntersectionObserver) ==========
const observerOptions = {
  root: null,
  rootMargin: '0px 0px -60px 0px',
  threshold: 0.15,
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay || '0', 10);
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
  observer.observe(el);
});

// ========== Parallax on hero circles ==========
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const hero = document.getElementById('hero');
  if (!hero) return;
  const heroHeight = hero.offsetHeight;

  if (scrollY < heroHeight) {
    const ratio = scrollY / heroHeight;
    const circles = hero.querySelectorAll('.circle');
    circles.forEach((c, i) => {
      const speed = (i + 1) * 15;
      c.style.transform = `translateY(${ratio * speed}px)`;
    });
  }
});

// ========== Smooth counter for stats (if any) ==========
function animateCount(el, target, duration = 1500) {
  let start = 0;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
