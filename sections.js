(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Flow buttons: wrap the label and add the arrows + fill circle (styles in sections.css)
  document.querySelectorAll('.btn').forEach((b) => {
    if (b.classList.contains('flow')) return;
    b.querySelectorAll(':scope > .icon').forEach((i) => i.remove()); // replaced by the flow arrows
    const label = document.createElement('span');
    label.className = 'flow__label';
    while (b.firstChild) label.appendChild(b.firstChild);
    const arrow = (side) => {
      const i = document.createElement('i');
      i.className = `icon ph ph-arrow-right flow__arrow flow__arrow--${side}`;
      i.setAttribute('aria-hidden', 'true');
      return i;
    };
    const circle = document.createElement('span');
    circle.className = 'flow__circle';
    circle.setAttribute('aria-hidden', 'true');
    b.append(arrow('l'), label, circle, arrow('r'));
    b.classList.add('flow');
  });

  // Products menu. Motion after Bencho's "Create menu" (MIT — bencho.dev/licence):
  // the pressed button sinks, and 60ms into that 160ms sink the same shape starts spreading
  // from the button's own box into the panel, so there is never a frame where nothing moves.
  const drawer = document.getElementById('company-drawer');
  if (drawer) {
    const overlay = document.querySelector('.drawer-overlay');
    const shape = drawer.querySelector('.drawer__shape');
    const panel = drawer.querySelector('.drawer__panel');
    const items = [...drawer.querySelectorAll('.drawer__item')];
    const openers = document.querySelectorAll('[data-drawer-open]');
    let opener = null;
    let beat = 0;
    let shut = 0;

    // The shape's closed state is the opener itself: its size, and fully round.
    const toButton = () => {
      const r = opener.getBoundingClientRect();
      drawer.style.setProperty('--dx', '0px');
      drawer.style.setProperty('--dy', '0px');
      drawer.style.setProperty('--w', `${r.width}px`);
      drawer.style.setProperty('--h', `${r.height}px`);
      drawer.style.setProperty('--r', `${r.height / 2}px`);
    };

    const place = () => {
      const r = opener.getBoundingClientRect();
      const panelW = Math.min(384, window.innerWidth - 32);
      drawer.style.setProperty('--panel-w', `${panelW}px`);
      drawer.style.top = `${r.top}px`;
      // Open from the button's left edge; if that would run off-screen (the phone icon sits
      // at the right), anchor the shape's right edge to the button instead.
      const right = r.left + panelW > window.innerWidth - 16;
      drawer.classList.toggle('is-right', right);
      drawer.style.left = right ? `${r.right - panelW}px` : `${r.left}px`;
    };

    const open = (btn) => {
      opener = btn;
      clearTimeout(beat);
      clearTimeout(shut);
      place();
      drawer.classList.add('no-anim');
      toButton();
      drawer.hidden = false;
      void shape.offsetWidth; // commit the button-sized frame before animating away from it
      drawer.classList.remove('no-anim');
      drawer.classList.add('is-sink');
      opener.classList.add('is-sink');
      beat = setTimeout(() => {
        drawer.classList.remove('is-sink');
        opener.classList.remove('is-sink');
        drawer.style.setProperty('--w', 'var(--panel-w)');
        drawer.style.setProperty('--h', `${panel.offsetHeight}px`);
        drawer.style.setProperty('--r', 'var(--menu-r)');
        // Drop straight down under the button, with the menu's text lined up with the button's
        // label (button pads its text 12px; panel 12px + rows 12px = 24px), but never closer
        // than 4px inside the hero's white frame (8px) to the screen edge
        const INSET = 8 + 4;
        const ALIGN = 24 - 12;
        const navBottom = document.getElementById('nav').getBoundingClientRect().bottom;
        const b = opener.getBoundingClientRect();
        const dx = drawer.classList.contains('is-right')
          ? Math.min(window.innerWidth - INSET, b.right + ALIGN) - b.right
          : Math.max(INSET, b.left - ALIGN) - b.left;
        drawer.style.setProperty('--dx', `${dx}px`);
        drawer.style.setProperty('--dy', `${navBottom + 4 - b.top}px`);
        items.forEach((el, i) => { el.style.transitionDelay = `${30 + i * 22}ms`; });
        drawer.classList.add('is-open');
        overlay.classList.add('is-open');
        openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
        setTimeout(() => drawer.querySelector('.drawer__links a').focus({ preventScroll: true }), 120);
      }, 60);
    };

    // Closing is the same single move, run down: rows out at once, shape back into the button.
    const close = (returnFocus = true) => {
      if (drawer.hidden) return;
      clearTimeout(beat);
      items.forEach((el) => { el.style.transitionDelay = '0ms'; });
      drawer.classList.remove('is-open', 'is-sink');
      overlay.classList.remove('is-open');
      openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
      toButton();
      shut = setTimeout(() => { drawer.hidden = true; }, 280);
      if (returnFocus && opener) opener.focus({ preventScroll: true });
    };

    openers.forEach((b) => b.addEventListener('click', () => {
      if (drawer.classList.contains('is-open')) close(); else open(b);
    }));
    document.querySelectorAll('[data-drawer-close]').forEach((el) => el.addEventListener('click', () => close()));
    drawer.querySelectorAll('.drawer__links a').forEach((a) => a.addEventListener('click', () => close(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
    window.addEventListener('scroll', () => { if (drawer.classList.contains('is-open')) close(false); }, { passive: true });
    window.addEventListener('resize', () => { if (drawer.classList.contains('is-open')) close(false); });
  }

  // Type an answer out quickly, like MIA writing it. Screen readers get the full text at once.
  const typeAnswer = (p) => {
    const full = p.dataset.full || (p.dataset.full = p.textContent.trim());
    clearInterval(p._typing);
    if (reduceMotion) { p.textContent = full; return; }
    p.innerHTML = '<span class="sr-only"></span><span aria-hidden="true"></span><span class="type-caret" aria-hidden="true"></span>';
    const [sr, out, caret] = p.children;
    sr.textContent = full;
    let i = 0;
    p._typing = setInterval(() => {
      i = Math.min(full.length, i + 3);
      out.textContent = full.slice(0, i);
      if (i >= full.length) {
        clearInterval(p._typing);
        setTimeout(() => caret.remove(), 700);
      }
    }, 16);
  };

  // Accordions. FAQ can close fully; any other group keeps one item open.
  document.querySelectorAll('[data-acc]').forEach((acc) => {
    const keepOne = acc.dataset.acc !== 'faq';
    const items = [...acc.querySelectorAll('.acc__item')];
    const scope = acc.closest('section');

    const open = (item) => {
      items.forEach((it) => {
        const on = it === item;
        it.classList.toggle('is-open', on);
        it.querySelector('.acc__btn').setAttribute('aria-expanded', String(on));
      });
      const typed = item && item.querySelector('[data-type]');
      if (typed) typeAnswer(typed);
      const target = item && item.querySelector('.acc__btn').dataset.target;
      if (!target) return;
      scope.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== target; });
    };

    items.forEach((item) => {
      item.querySelector('.acc__btn').addEventListener('click', () => {
        if (item.classList.contains('is-open')) {
          if (!keepOne) open(null);
        } else {
          open(item);
        }
      });
    });
  });

  // Scroll reveal, staggered among siblings
  const revealEls = document.querySelectorAll('[data-reveal]');
  revealEls.forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.setProperty('--i', String(sibs.indexOf(el)));
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  revealEls.forEach((el) => io.observe(el));

  // Pipeline steps light up 1 → 6 once it's in view
  const pipe = document.querySelector('[data-pipe]');
  if (pipe) {
    pipe.querySelectorAll('.ai-steps li').forEach((li, i) => li.style.setProperty('--i', String(i)));
    io.observe(pipe);
  }

  // Workflow stages highlight left → right as the list moves through the viewport
  const stages = document.querySelector('[data-stages]');
  if (stages && !reduceMotion) {
    const cards = [...stages.children];
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = stages.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.4));
      const active = Math.min(cards.length - 1, Math.floor(p * cards.length));
      cards.forEach((c, i) => {
        c.classList.toggle('is-active', i === active);
        c.classList.toggle('is-done', i < active);
      });
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Suite tabs follow the card in view (the last card whose top has passed 45% of the viewport);
  // the active tab's bar fills as that card is read. Clicking a tab, or any #suite-… link,
  // scrolls its card up under the sticky tab bar.
  const suiteTabs = [...document.querySelectorAll('.suite__tabs .suite__tab')].filter((t) => t.getAttribute('href').startsWith('#suite-'));
  const tabBar = document.querySelector('.suite__tabs');
  if (suiteTabs.length && document.getElementById('suite')) {
    const cards = suiteTabs.map((t) => document.querySelector(t.getAttribute('href')));
    // Progress ring round each tab's edge: a faint track and the fill that --p draws in
    const NS = 'http://www.w3.org/2000/svg';
    suiteTabs.forEach((t) => {
      const ring = document.createElementNS(NS, 'svg');
      ring.setAttribute('class', 'suite__ring');
      ring.setAttribute('aria-hidden', 'true');
      ['suite__ring-track', 'suite__ring-fill'].forEach((cls) => {
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('class', cls);
        r.setAttribute('pathLength', '1');
        ring.append(r);
      });
      t.append(ring);
    });
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.innerHeight * 0.45;
      let active = 0;
      cards.forEach((c, i) => { if (c.getBoundingClientRect().top <= line) active = i; });
      // How far the active card has been read: 0 while its top sits just under the tab bar,
      // 1 when its bottom reaches the line and the next card takes over
      const r = cards[active].getBoundingClientRect();
      const under = tabBar.getBoundingClientRect().bottom + 16;
      const p = Math.min(1, Math.max(0, (under - r.top) / (r.height - (line - under))));
      suiteTabs.forEach((t, i) => {
        t.classList.toggle('is-active', i === active);
        t.style.setProperty('--p', i === active ? p.toFixed(3) : 0);
        if (i === active) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
    };

    // main slides up by --lift while the hero hands off (main.js), so a plain anchor jump from
    // above lands short. Aim for where the card sits once that lift is complete.
    const goTo = (card) => {
      const main = document.querySelector('main');
      const nowLift = -new DOMMatrix(getComputedStyle(main).transform).m42;
      const fullLift = -parseFloat(getComputedStyle(main).marginBottom);
      const top = card.getBoundingClientRect().top + nowLift - fullLift;
      const clear = tabBar.offsetHeight + 8 + 16; // sticky bar, its 8px offset, a little air
      window.scrollBy({ top: top - clear, behavior: still ? 'auto' : 'smooth' });
    };
    document.querySelectorAll('a[href^="#suite-"]').forEach((a) => {
      const card = cards.find((c) => '#' + c.id === a.getAttribute('href'));
      if (!card) return;
      a.addEventListener('click', (e) => { e.preventDefault(); goTo(card); });
    });

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Nav stays fixed; it slides away while the suite's tab bar is pinned so the two don't stack
  const nav = document.getElementById('nav');
  const suite = document.getElementById('suite');
  if (nav) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const navH = nav.offsetHeight;
      const overSuite = !!(tabBar && suite) && tabBar.getBoundingClientRect().top < navH && suite.getBoundingClientRect().bottom > navH;
      nav.classList.toggle('nav--hidden', overSuite);
      nav.classList.toggle('nav--scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Onboarding lessons: centre card full size, neighbours at 75%, advance one slot every 5s.
  // The card leaving on the left slides out first, then jumps (unseen) to the far right.
  const lessonsWrap = document.querySelector('[data-lessons]');
  if (lessonsWrap) {
    const lessons = [...lessonsWrap.querySelectorAll('.lesson')];
    const n = lessons.length;
    const SLOT = 380; // px between card centres
    let active = 0;
    const set = (el, d, instant = false) => {
      el.classList.toggle('is-instant', instant);
      el.classList.toggle('is-active', d === 0);
      el.style.setProperty('--x', `${d * SLOT}px`);
      el.style.setProperty('--s', d === 0 ? '1' : '0.75');
    };
    const dist = (i) => {
      const d = (i - active + n) % n;
      return d === n - 1 ? -1 : d; // one card on the left, the rest to the right
    };
    lessons.forEach((el, i) => set(el, dist(i), true));
    if (!reduceMotion) {
      setInterval(() => {
        const leaving = (active - 1 + n) % n;
        active = (active + 1) % n;
        lessons.forEach((el, i) => { if (i !== leaving) set(el, dist(i)); });
        set(lessons[leaving], -2);
        setTimeout(() => set(lessons[leaving], dist(leaving), true), 450);
      }, 5000);
    }
  }

  // Time-back calculator: hours × 80% × 48 weeks; 8-hour working days
  const range = document.getElementById('calc-hours');
  if (range) {
    const out = document.getElementById('calc-hours-out');
    const year = document.getElementById('calc-year');
    const days = document.getElementById('calc-days');
    const update = () => {
      const h = Number(range.value);
      const back = Math.round(h * 0.8 * 48);
      out.textContent = `${h} h`;
      year.textContent = back.toLocaleString();
      days.textContent = String(Math.round(back / 8));
      range.style.setProperty('--fill', `${((h - range.min) / (range.max - range.min)) * 100}%`);
      range.setAttribute('aria-valuetext', `${h} hours a week`);
    };
    range.addEventListener('input', update);
    update();
  }

  // Email form (design-system page): client-side validation only until a signup endpoint exists
  const form = document.querySelector('.news');
  if (form) {
    const input = form.querySelector('input');
    const msg = form.querySelector('.news__msg');
    const setMsg = (text, kind) => {
      msg.textContent = text;
      msg.className = `news__msg ${kind ? `is-${kind}` : ''}`;
    };
    input.addEventListener('blur', () => {
      if (input.value && !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        setMsg('Enter a valid work email, like you@firm.com.', 'error');
      }
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true' && input.checkValidity()) {
        input.removeAttribute('aria-invalid');
        setMsg('');
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input.value || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        setMsg('Enter a valid work email, like you@firm.com.', 'error');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      setMsg('Thanks — you’re on the list.', 'ok');
      form.reset();
    });
  }

})();
