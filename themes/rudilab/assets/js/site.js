/* =====================================================
   site.js - rudilab Hugo theme
   Dark/light toggle, mobile nav, scroll-to-top
   ===================================================== */
(function () {
  // ── DARK MODE (default = dark, ALWAYS) ──────────────
  const root = document.documentElement;
  const btn  = document.getElementById('themeBtn');

  function applyTheme(t) {
    const safe = t === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', safe);
    if (btn) btn.textContent = safe === 'dark' ? '☀' : '☾';
  }
  // Apply on load – default dark
  applyTheme(localStorage.getItem('theme') || 'dark');

  if (btn) {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
  }

  // ── MOBILE NAV ──────────────────────────────────────
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // ── SCROLL TO TOP FAB ───────────────────────────────
  const fab = document.getElementById('fabTop');
  if (fab) {
    window.addEventListener('scroll', () => {
      fab.classList.toggle('show', window.scrollY > 300);
    }, { passive: true });
    fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ── CARD GLOW on mousemove ───────────────────────────
  document.querySelectorAll('.card, .log-item, .cert-card, .ach-card, .book-card').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // ── SEARCH + FILTER (collect pages) ─────────────────
  const searchInput = document.getElementById('searchInput');
  const filterBtns  = document.querySelectorAll('.filter-tags button');
  const cards       = document.querySelectorAll('[data-card]');

  if (searchInput && cards.length) {
    let activeFilter = 'all';

    function filterCards() {
      const q = searchInput.value.toLowerCase();
      cards.forEach(c => {
        const text   = c.textContent.toLowerCase();
        const tag    = c.getAttribute('data-tag') || '';
        const matchQ = !q || text.includes(q);
        const matchF = activeFilter === 'all' || tag.includes(activeFilter);
        c.style.display = matchQ && matchF ? '' : 'none';
      });
    }

    searchInput.addEventListener('input', filterCards);

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        filterCards();
      });
    });
  }

  // ── RE-SCROLL AFTER ASYNC CONTENT (homepage anchors) ─
  if (location.hash && /^#[A-Za-z][\w:.-]*$/.test(location.hash)) {
    setTimeout(() => {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }
})();
