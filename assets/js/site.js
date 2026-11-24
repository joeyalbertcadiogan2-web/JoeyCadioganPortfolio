/* Joey Cadiogan portfolio: scroll choreography (hero scrub, passages, reveals, nav). */
(function () {
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add(reduced ? 'reduced-motion' : 'motion');
  const mqMobile = window.matchMedia('(max-width: 760px)');

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  const hero = $('.hero'), media = $('#hero-media'), cutWrap = $('#hero-cutout-wrap');
  const title = $('#hero-title'), nameEl = $('#hero-name'), actions = $('#hero-actions'), cue = $('#scroll-cue');
  const nav = $('#nav'), navToggle = $('#nav-toggle'), bar = $('#hero-progress-bar'), video = $('#hero-video');
  const passages = $$('.passage').map((el) => ({ el, art: $('.passage-art', el), start: +el.dataset.start, end: +el.dataset.end, side: el.dataset.side }));

  /* ---------- Smooth scrolling (Lenis) ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false });
    root.classList.add('lenis', 'lenis-smooth');
  }
  function goTo(hash) {
    const el = hash === '#top' ? 0 : $(hash);
    if (el === null) return;
    const offset = hash === '#process' ? -84 : 0;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (el === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduced ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const hash = a.getAttribute('href');
    if (hash.length < 2) { if (a.dataset.todo) e.preventDefault(); return; }
    e.preventDefault(); closeMenu(); goTo(hash);
    if (hash !== '#top') history.replaceState(null, '', hash);
  }));

  /* ---------- Mobile menu ---------- */
  function closeMenu() { nav.classList.remove('menu-open'); navToggle.setAttribute('aria-expanded', 'false'); }
  navToggle.addEventListener('click', () => {
    const open = !nav.classList.contains('menu-open');
    nav.classList.toggle('menu-open', open); navToggle.setAttribute('aria-expanded', String(open));
  });

  /* ---------- Headline: span ~90% of the viewport width ---------- */
  function fitName() {
    nameEl.style.fontSize = '100px';
    const w = nameEl.getBoundingClientRect().width;
    if (w > 0) nameEl.style.fontSize = (100 * window.innerWidth * 0.9) / w + 'px';
  }
  fitName();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
  window.addEventListener('resize', fitName);

  /* ---------- Hero video (scroll-scrubbed) ---------- */
  let videoReady = false;
  const videoSrc = (mqMobile.matches && video.dataset.srcMobile) || video.dataset.src;
  if (videoSrc) {
    video.src = videoSrc;
    video.addEventListener('loadeddata', () => { videoReady = true; hero.classList.add('has-video'); video.pause(); }, { once: true });
    // iOS needs one play() inside a gesture before currentTime seeking renders frames.
    const unlock = () => { video.play().then(() => video.pause()).catch(() => {}); };
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    video.load();
  }

  /* ---------- Placeholder camera (used until the orbit video is added) ----------
     Keyframes: [progress, pan (-1 left … 1 right), scale]. Joey is framed opposite each passage. */
  const camKeys = [[0, 0, 1], [0.05, 0, 1.06], [0.14, 1, 1.22], [0.27, 1, 1.25], [0.37, -1, 1.22], [0.48, -1, 1.25], [0.58, 1, 1.22], [0.69, 1, 1.25], [0.8, -1, 1.22], [0.91, -1, 1.25], [1, 0, 1.08]];
  function camAt(p) {
    for (let i = 0; i < camKeys.length - 1; i++) {
      const [p0, x0, s0] = camKeys[i], [p1, x1, s1] = camKeys[i + 1];
      if (p <= p1) { const t = smooth(p0, p1, p); return [lerp(x0, x1, t), lerp(s0, s1, t)]; }
    }
    return [0, 1.08];
  }

  /* ---------- Hero loop with inertia ---------- */
  let target = 0, cur = 0, last = performance.now();
  // Settle rate: ~98% of the way in ~1.3 s after scrolling stops. Reduced motion: near-direct tracking.
  const K = reduced ? 14 : 3.0;
  const blur = (px) => (reduced || px < 0.02 ? 'none' : `blur(${px.toFixed(2)}px)`);
  function heroTarget() {
    const r = hero.getBoundingClientRect(), total = hero.offsetHeight - window.innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }
  function renderHero(p) {
    const intro = 1 - smooth(0.003, 0.05, p);
    const out = 1 - intro;
    const fx = (el, lift) => {
      el.style.opacity = intro.toFixed(3);
      el.style.filter = blur(out * 14);
      el.style.transform = `translate3d(0, ${(-out * lift).toFixed(1)}px, 0)`;
      el.style.visibility = intro < 0.01 ? 'hidden' : 'visible';
    };
    fx(title, 40); fx(actions, 24); cue.style.opacity = intro;
    // Foreground cutout only matches the first frame: in video mode it leaves sooner.
    const cutO = videoReady ? 1 - smooth(0, 0.025, p) : intro;
    cutWrap.style.opacity = cutO.toFixed(3);
    cutWrap.style.visibility = cutO < 0.01 ? 'hidden' : 'visible';

    if (videoReady) {
      media.style.transform = cutWrap.style.transform = 'none';
      const d = video.duration || 0, t = p * Math.max(0, d - 0.05);
      if (d && !video.seeking && Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;
    } else {
      const [pan, s] = camAt(p);
      const tr = `translate3d(${(pan * ((s - 1) / 2) * 100).toFixed(3)}vw, 0, 0) scale(${s.toFixed(4)})`;
      media.style.transform = cutWrap.style.transform = tr;
    }

    const mobile = mqMobile.matches;
    passages.forEach((ps) => {
      const local = (p - ps.start) / (ps.end - ps.start);
      const o = smooth(0, 0.2, local) * (1 - smooth(0.8, 1, local));
      const el = ps.el;
      if (o <= 0.001) { if (el.style.visibility !== 'hidden') { el.style.visibility = 'hidden'; el.style.opacity = 0; } return; }
      const dir = local < 0.5 ? 1 : -1, y = dir * (1 - o) * 40;
      el.style.visibility = 'visible'; el.style.opacity = o.toFixed(3);
      el.style.filter = blur((1 - o) * 10);
      el.style.transform = mobile ? `translate3d(0, ${y.toFixed(1)}px, 0)` : `translate3d(0, calc(-50% + ${y.toFixed(1)}px), 0)`;
      const sideSign = ps.side === 'left' ? -1 : 1;
      ps.art.style.transform = `translate3d(${(sideSign * (1 - o) * 30).toFixed(1)}px, ${((0.5 - local) * 70).toFixed(1)}px, 0) rotate(${((local - 0.5) * 10 * sideSign).toFixed(2)}deg) scale(${(0.9 + o * 0.1).toFixed(3)})`;
    });

    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    hero.classList.toggle('is-scrolling', p > 0.02 && p < 0.985);
    return intro;
  }

  function renderNav(intro) {
    const heroRect = hero.getBoundingClientRect();
    const inHero = heroRect.bottom > window.innerHeight * 0.5;
    const o = inHero ? intro : 1;
    nav.style.opacity = o.toFixed(3);
    nav.style.filter = blur((1 - o) * 10);
    nav.classList.toggle('is-hidden', o < 0.05);
    nav.classList.toggle('is-solid', !inHero);
    if (o < 0.05) closeMenu();
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (lenis) lenis.raf(now);
    target = heroTarget();
    const heroVisible = hero.getBoundingClientRect().bottom > -50;
    cur += (target - cur) * (1 - Math.exp(-dt * K));
    if (Math.abs(target - cur) < 0.00004) cur = target;
    const intro = heroVisible || Math.abs(target - cur) > 0.0001 ? renderHero(cur) : 0;
    renderNav(heroVisible ? intro : 0);
    requestAnimationFrame(frame);
  }

  // Reduced motion keeps the scroll-driven hero and 3D (they only move when the visitor scrolls)
  // but drops smooth-scroll easing, blur, auto-spin and ambient animation.
  cur = target = heroTarget();
  requestAnimationFrame(frame);

  /* ---------- Content reveals + light-path pulses on the 3D core ---------- */
  let lastPulse = 0;
  const pulse = () => { const t = performance.now(); if (t - lastPulse > 260) { lastPulse = t; window.dispatchEvent(new CustomEvent('core:pulse')); } };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target; el.classList.add('is-in'); io.unobserve(el);
      if (el.hasAttribute('data-pulse') || el.tagName === 'H2') pulse();
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => {
    const sibs = $$('.reveal', el.parentElement).filter((s) => s.parentElement === el.parentElement);
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 5) * 0.08 + 's');
    io.observe(el);
  });

  /* ---------- Active nav link ---------- */
  const links = $$('.nav-links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = '#' + en.target.id;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['#work', '#services', '#process', '#contact', '#about'].forEach((s) => { const el = $(s); if (el) spy.observe(el); });

  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  window.__site = { reduced, lenis };
})();
