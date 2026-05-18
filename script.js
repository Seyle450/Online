/* ───────── AGE ───────── */
(function() {
  const el = document.getElementById('age');
  if (!el) return;
  const dob = new Date(el.dataset.dob || '2007-10-15');
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  el.textContent = age;
})();

/* ───────── SCROLL REVEAL ───────── */
(function() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) return;

  const sections = document.querySelectorAll('section[data-screen-label]:not(.hero), .footer');
  sections.forEach(s => s.classList.add('reveal'));

  const staggerTargets = [
    document.querySelector('.tech-pills'),
    document.querySelector('.timeline'),
    document.querySelector('.docs-grid')
  ].filter(Boolean);
  staggerTargets.forEach(el => el.classList.add('reveal-stagger'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px 120px 0px' });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => io.observe(el));
})();

/* ───────── RAIL ───────── */
(function() {
    const rail = document.getElementById('projectsRail');
    const prev = document.getElementById('railPrev');
    const next = document.getElementById('railNext');
    const fill = document.getElementById('railFill');
    const count = document.getElementById('railCount');
    if (!rail) return;
    const cards = () => Array.from(rail.querySelectorAll('.project-card'));
    function step() {
      const c = cards()[0];
      if (!c) return rail.clientWidth;
      const style = getComputedStyle(rail);
      const gap = parseFloat(style.columnGap || style.gap) || 22;
      return c.getBoundingClientRect().width + gap;
    }
    function update() {
      const max = rail.scrollWidth - rail.clientWidth;
      const pct = max <= 0 ? 1 : Math.min(1, rail.scrollLeft / max);
      const total = cards().length;
      const idx = Math.min(total, Math.round(rail.scrollLeft / step()) + 1);
      fill.style.width = (Math.max(5, pct * 100)) + '%';
      count.textContent = String(idx).padStart(2,'0') + ' / ' + String(total).padStart(2,'0');
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max - 2;
    }
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left:  step(), behavior: 'smooth' }));
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();