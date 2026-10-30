// Product pages (enterprise.html, advisor.html). sections.js already runs the nav, menu,
// buttons and FAQ; this adds the parts only these pages have.
(() => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const embedded = document.documentElement.classList.contains('is-embed');
  // Sticky feature list: the item crossing the middle of the screen lights up and its picture shows
  document.querySelectorAll('[data-pfeat]').forEach((root) => {
    const items = [...root.querySelectorAll('.pfeat__item')];
    const shots = [...root.querySelectorAll('.pfeat__shot')];
    // Phones stack the list and hide the sticky picture, so each item gets its own copy
    items.forEach((el, n) => {
      const inline = el.querySelector('.pfeat__inline');
      if (inline && shots[n]) inline.innerHTML = shots[n].innerHTML;
    });
    // Animated pictures (.fx, Harmony): play when shown, replay every 9s while it stays
    const play = (fx) => { fx.classList.remove('is-play'); void fx.offsetWidth; fx.classList.add('is-play'); };
    let replay = 0;
    const show = (i) => {
      items.forEach((el, n) => el.classList.toggle('is-active', n === i));
      shots.forEach((el, n) => el.classList.toggle('is-active', n === i));
      const fx = shots[i] && shots[i].querySelector('.fx');
      if (!fx || fx.classList.contains('is-play')) return;
      shots.forEach((el) => el.querySelector('.fx')?.classList.remove('is-play'));
      play(fx);
      clearInterval(replay);
      if (!still) replay = setInterval(() => play(fx), 9000);
    };
    // Phones: each item's own copy plays when it scrolls into view
    root.querySelectorAll('.pfeat__inline .fx').forEach((fx) => {
      new IntersectionObserver(([e]) => { if (e.isIntersecting) play(fx); else fx.classList.remove('is-play'); }, { threshold: 0.4 }).observe(fx);
    });
    // Data feed: event counts keep ticking while it plays
    if (!still) {
      setInterval(() => {
        root.querySelectorAll('.fx--feed.is-play').forEach((fx) => {
          fx.querySelectorAll('[data-fx-tick]').forEach((b) => {
            const v = +b.dataset.fxTick + 1 + Math.floor(Math.random() * 2);
            b.dataset.fxTick = v;
            b.textContent = v.toLocaleString('en-US');
          });
          const row = fx.querySelector('.fx__rows .is-new');
          row.classList.remove('is-flash'); void row.offsetWidth; row.classList.add('is-flash');
        });
      }, 2400);
    }
    // Natural scroll (Beside layout): the item whose centre is nearest the middle of the screen is the active one.
    // (An intersection band switched early: the next item's box touched it while the previous text was still on screen.)
    let cur = -1;
    let ticking = false;
    const pick = () => {
      ticking = false;
      const mid = innerHeight / 2;
      let best = 0;
      let gap = Infinity;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < gap) { gap = d; best = i; }
      });
      if (best !== cur) { cur = best; show(best); }
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('scrollend', queue);
    addEventListener('resize', queue);
    pick();
  });

  // Demo form: no backend yet, so confirm in place
  document.querySelectorAll('.pform').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      form.querySelector('.pform__msg').textContent = 'Thanks — we’ll be in touch within one business day.';
      form.reset();
    });
  });

  // Harmony hero: a looping product film in the Superhuman Mail style, built from the
  // Harmony app's own screens (Figma "Web" board). The 960×640 canvas is scaled to fit;
  // the cursor aims at real elements, and each beat toggles classes styled in product.css.
  const hh = document.querySelector('[data-hhero]');
  if (hh) {
    const stage = hh.querySelector('.hh__stage');
    const cv = hh.querySelector('.hh__canvas');
    const hx = cv.querySelector('.hx');
    const $ = (sel) => cv.querySelector(sel);
    const $$ = (sel) => [...cv.querySelectorAll(sel)];
    let scale = 1;
    // In embed mode (Home's product cards) zoom in on the app window: fill the frame's height
    // with a little air, pin it to the left and let the right side run off the edge
    const fit = () => {
      if (embedded) {
        const [wx, wy, , wh] = [70, 50, 820, 540], pad = 36;
        scale = (stage.clientHeight - pad * 2) / wh;
        hh.style.setProperty('--hh-x', pad - wx * scale + 'px');
        hh.style.setProperty('--hh-y', pad - wy * scale + 'px');
      } else scale = stage.clientWidth / 960;
      hh.style.setProperty('--hh-s', scale);
    };
    fit();
    new ResizeObserver(fit).observe(stage);

    const scene = (name) => { cv.dataset.scene = name; };
    const screen = (name) => {
      hx.dataset.screen = name;
      $$('.hx__nav [data-nav]').forEach((li) => li.classList.toggle('is-on', li.dataset.nav === name));
    };
    const chips = (sel, on) => $$(`${sel} li`).forEach((li) => li.classList.toggle('is-on', on));

    // Risk distribution: 3 critical, 6 elevated, 11 standard, 24 low (the legend's counts)
    $$('.hx__dots i').forEach((dot, n) => dot.style.setProperty('--c', n < 3 ? 'var(--danger)' : n < 9 ? 'var(--warn)' : n < 20 ? 'var(--slate-300)' : 'var(--accent)'));
    // Summary words appear one by one
    const sum = $('.hx__sumtext');
    sum.innerHTML = sum.textContent.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');

    if (still) {
      scene('a');
      screen('dash');
      $$('.hx__prio li').forEach((li) => li.classList.add('is-in'));
    } else {
      let paused = false;
      let visible = false;
      // Waits only count down while the hero is on screen and not paused
      const wait = (ms) => new Promise((done) => {
        const tick = () => {
          if (paused || !visible) { setTimeout(tick, 100); return; }
          if ((ms -= 50) <= 0) done(); else setTimeout(tick, 50);
        };
        setTimeout(tick, 50);
      });
      const aim = async (el, fx = 0.5, fy = 0.5) => {
        const r = el.getBoundingClientRect();
        const c = cv.getBoundingClientRect();
        cv.style.setProperty('--cx', `${(r.left - c.left + r.width * fx) / scale - 4}px`);
        cv.style.setProperty('--cy', `${(r.top - c.top + r.height * fy) / scale - 3}px`);
        await wait(850);
      };
      const click = async () => { cv.classList.add('is-click'); await wait(200); cv.classList.remove('is-click'); };
      const stagger = async (els, gap) => { for (const el of els) { el.classList.add('is-in'); await wait(gap); } };
      const pop = async (sel, gap) => { for (const li of $$(`${sel} li`)) { li.classList.add('is-on'); await wait(gap); } };
      const count = async (el) => {
        const to = +el.dataset.hxCount;
        for (let i = 1; i <= 12; i += 1) { el.textContent = Math.round((to * i) / 12); await wait(50); }
      };
      const type = async (el) => {
        const text = el.dataset.hxType;
        for (let i = 2; i <= text.length + 1; i += 2) { el.textContent = text.slice(0, i); await wait(50); }
      };
      const dl = $('.hx__dl > span');

      const reset = () => {
        scene('');
        cv.classList.remove('has-cursor', 'is-shift', 'has-mia', 'is-click');
        hx.classList.remove('is-menu', 'is-pick', 'is-filtered', 'is-panel', 'is-scroll', 'is-gen', 'is-saved');
        screen('dash');
        $$('.is-in, .is-lit, .w.is-on, .hx__dots i.is-on').forEach((el) => el.classList.remove('is-in', 'is-lit', 'is-on'));
        $$('[data-hx-type]').forEach((el) => { el.textContent = ''; });
        $$('[data-hx-count]').forEach((el) => { el.textContent = '0'; });
        $('[data-hx-filter]').textContent = 'Filter';
        $('[data-hx-showing]').textContent = 'Showing 1–10 of 12';
        dl.textContent = 'Download PDF';
        chips('.hh__chips--sort', false);
        chips('.hh__chips--draft', false);
      };

      const film = async () => {
        for (;;) {
          reset();
          await wait(700);

          // 1 · Dashboard: what needs a decision today
          cv.classList.add('is-shift');
          scene('a');
          await wait(1000);
          await stagger($$('.hx__prio li'), 250);
          await pop('.hh__chips--sort', 700);
          cv.classList.add('has-cursor');
          await aim($('.hx__prio .is-hot'), 0.55, 0.5);
          $('.hx__prio .is-hot').classList.add('is-lit');
          await wait(1300);

          // 2 · Review queue, filtered to high risk
          chips('.hh__chips--sort', false);
          cv.classList.remove('is-shift');
          await wait(700);
          await aim($('.hx__nav [data-nav="queue"]'), 0.4);
          await click();
          screen('queue');
          await wait(800);
          await aim($('.hx__filter'));
          await click();
          hx.classList.add('is-menu');
          await wait(500);
          await aim($('.hx__menuhigh'), 0.4);
          hx.classList.add('is-pick');
          await click();
          hx.classList.remove('is-menu', 'is-pick');
          $('[data-hx-filter]').textContent = 'Risk: High';
          hx.classList.add('is-filtered');
          $('[data-hx-showing]').textContent = 'Showing 1–7 of 7';
          await wait(2000);

          // 3 · Advisors: Mia's AI insight on the riskiest advisor
          await aim($('.hx__nav [data-nav="advisors"]'), 0.4);
          await click();
          screen('advisors');
          await wait(800);
          await aim($('.hx__arow'), 0.3);
          $('.hx__arow').classList.add('is-lit');
          await click();
          hx.classList.add('is-panel');
          cv.classList.remove('has-cursor');
          await wait(900);
          await stagger($$('.hx__grp li'), 220);
          await wait(500);
          // Scroll the panel just far enough to bring Mia's notes into view
          const ps = $('.hx__pscroll');
          ps.style.setProperty('--sy', `${-(ps.offsetHeight - $('.hx__panel').clientHeight + 4)}px`);
          hx.classList.add('is-scroll');
          cv.classList.add('has-mia', 'is-shift');
          await wait(1300);
          for (const el of $$('[data-hx-type]')) await type(el);
          await wait(1600);

          // 4 · Reports: the monthly report writes itself
          cv.classList.add('has-cursor');
          await aim($('.hx__nav [data-nav="reports"]'), 0.4);
          cv.classList.remove('has-mia');
          await click();
          hx.classList.remove('is-panel', 'is-scroll');
          screen('reports');
          cv.classList.add('is-shift');
          await wait(900);
          const steps = pop('.hh__chips--draft', 1100);
          for (const w of $$('.hx__sumtext .w')) { w.classList.add('is-on'); await wait(50); }
          await Promise.all($$('[data-hx-count]').map(count));
          await stagger($$('.hx__trail li'), 350);
          for (const dot of $$('.hx__dots i')) { dot.classList.add('is-on'); await wait(50); }
          await steps;
          hx.classList.add('is-gen');
          await aim($('.hx__dl'));
          await click();
          hx.classList.add('is-saved');
          dl.textContent = 'Saved to History';
          await wait(2400);
          cv.classList.remove('has-cursor');
          scene('out');
          await wait(900);
        }
      };

      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
      film();

      const btn = hh.querySelector('.hh__pause');
      btn.addEventListener('click', () => {
        paused = !paused;
        hh.classList.toggle('is-paused', paused);
        btn.setAttribute('aria-pressed', String(paused));
        btn.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
        btn.querySelector('.icon').className = `icon ph-fill ${paused ? 'ph-play' : 'ph-pause'}`;
      });
    }
  }

  // Advisor hero film: the same format as Harmony's, on the Advisor app's own screens
  const ah = document.querySelector('[data-ahero]');
  if (ah) {
    const stage = ah.querySelector('.hh__stage');
    const cv = ah.querySelector('.ah__canvas');
    const win = cv.querySelector('.ah__win');
    const $ = (sel) => cv.querySelector(sel);
    const $$ = (sel) => [...cv.querySelectorAll(sel)];
    let scale = 1;
    // In embed mode (Home's product cards) zoom in on the app window: fill the frame's height
    // with a little air, pin it to the left and let the right side run off the edge
    const fit = () => {
      if (embedded) {
        const [wx, wy, , wh] = [20, 20, 880, 560], pad = 36;
        scale = (stage.clientHeight - pad * 2) / wh;
        ah.style.setProperty('--hh-x', pad - wx * scale + 'px');
        ah.style.setProperty('--hh-y', pad - wy * scale + 'px');
      } else scale = stage.clientWidth / 960;
      ah.style.setProperty('--hh-s', scale);
    };
    fit();
    new ResizeObserver(fit).observe(stage);
    const crumbs = { dash: 'Dashboard', cal: 'Calendar', notes: 'AI Notes', compl: 'Compliance' };
    const screen = (name) => {
      win.dataset.screen = name;
      $$('[data-nav]').forEach((li) => li.classList.toggle('is-on', li.dataset.nav === name));
      $('[data-ah-crumb]').textContent = crumbs[name];
    };
    if (still) {
      cv.dataset.scene = 'a';
      $$('.ah__dash .ad__slot').forEach((el) => el.classList.add('is-in'));
    } else {
      let paused = false;
      let visible = false;
      const wait = (ms) => new Promise((done) => {
        const tick = () => {
          if (paused || !visible) { setTimeout(tick, 100); return; }
          if ((ms -= 50) <= 0) done(); else setTimeout(tick, 50);
        };
        setTimeout(tick, 50);
      });
      const aim = async (el, fx = 0.5, fy = 0.5) => {
        const r = el.getBoundingClientRect();
        const c = cv.getBoundingClientRect();
        cv.style.setProperty('--cx', `${(r.left - c.left + r.width * fx) / scale - 4}px`);
        cv.style.setProperty('--cy', `${(r.top - c.top + r.height * fy) / scale - 3}px`);
        await wait(850);
      };
      const click = async () => { cv.classList.add('is-click'); await wait(200); cv.classList.remove('is-click'); };
      const stagger = async (els, gap) => { for (const el of els) { el.classList.add('is-in'); await wait(gap); } };
      const type = async (el) => {
        const text = el.dataset.ahType;
        for (let i = 1; i <= text.length; i += 1) { el.textContent = text.slice(0, i); await wait(45); }
      };
      const go = async (name) => { await aim($(`[data-nav="${name}"]`), 0.4); await click(); screen(name); await wait(700); };
      const reset = () => {
        cv.dataset.scene = '';
        cv.classList.remove('has-cursor', 'is-click');
        win.classList.remove('is-panel', 'is-done', 'is-sent');
        screen('dash');
        $$('.is-in, .is-lit').forEach((el) => el.classList.remove('is-in', 'is-lit'));
        $$('[data-ah-type]').forEach((el) => { el.textContent = ''; });
      };
      const film = async () => {
        for (;;) {
          reset();
          await wait(700);
          // 1 · Dashboard: the day at a glance
          cv.dataset.scene = 'a';
          await wait(900);
          await stagger($$('.ah__dash .ad__slot'), 300);
          await wait(1200);
          // 2 · Calendar: Mia has prepared the next meeting
          cv.classList.add('has-cursor');
          await go('cal');
          const ev = $('.ah__ev--sel');
          await aim(ev, 0.4);
          ev.classList.add('is-lit');
          await click();
          win.classList.add('is-panel');
          await wait(600);
          await stagger($$('.ah__panel .ah__in'), 230);
          await wait(1600);
          // 3 · AI notes: rough notes during the meeting, a clean summary after it
          win.classList.remove('is-panel');
          await go('notes');
          for (const el of $$('[data-ah-type]')) { await type(el); await wait(250); }
          await aim($('.ah__rec .af__stop'));
          await click();
          win.classList.add('is-done');
          await wait(500);
          await stagger($$('.ah__sum .ah__in'), 150);
          await wait(1800);
          // 4 · Compliance: who is missing what, reminders in one click
          await go('compl');
          await stagger($$('.ah__compl .ah__in'), 200);
          await aim($('.ah__send'));
          await click();
          win.classList.add('is-sent');
          await wait(2400);
          cv.classList.remove('has-cursor');
          cv.dataset.scene = 'out';
          await wait(900);
        }
      };
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
      film();
      const btn = ah.querySelector('.hh__pause');
      btn.addEventListener('click', () => {
        paused = !paused;
        btn.setAttribute('aria-pressed', String(paused));
        btn.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
        btn.querySelector('.icon').className = `icon ph-fill ${paused ? 'ph-play' : 'ph-pause'}`;
      });
    }
  }

  // Impact cards: the line art only moves while the section is on screen
  document.querySelectorAll('.impact').forEach((sec) => {
    new IntersectionObserver(([e]) => sec.classList.toggle('is-live', e.isIntersecting && !still)).observe(sec);
  });
  // Before/after table: the "with" answers arrive once, the first time it scrolls in
  document.querySelectorAll('[data-pvx]').forEach((t) => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { t.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(t);
  });

  // Persona tabs (Who it's for): click or arrow keys switch the panel
  document.querySelectorAll('[data-wtabs]').forEach((box) => {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const pick = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        box.querySelector(`#${x.getAttribute('aria-controls')}`).hidden = !on;
      });
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
  });

  // Outcome tiles: numbers count up once when they scroll in
  document.querySelectorAll('.cases [data-count]').forEach((b) => {
    if (still) return;
    const to = +b.dataset.count;
    const fmt = (v) => `${b.dataset.prefix || ''}${v}${b.dataset.suffix || ''}`;
    b.textContent = fmt(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1200);
        b.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(b);
  });

  // Outcome carousel: prev/next move one card; dots follow the scroll position
  document.querySelectorAll('[data-cases]').forEach((root) => {
    const track = root.querySelector('.cases__track');
    const cards = [...track.children];
    const dots = [...root.querySelectorAll('.cases__dots i')];
    const prev = root.querySelector('[data-cases-prev]');
    const next = root.querySelector('[data-cases-next]');
    // The card whose centre is nearest the track's centre
    const current = () => {
      const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
      let best = 0;
      let gap = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < gap) { gap = d; best = i; }
      });
      return best;
    };
    const sync = () => {
      const i = current();
      dots.forEach((d, n) => d.classList.toggle('is-on', n === i));
      cards.forEach((c, n) => c.classList.toggle('is-on', n === i));
      prev.disabled = i === 0;
      next.disabled = i === cards.length - 1;
    };
    // Animate scrollLeft ourselves (smooth scrollBy is unreliable on snap tracks); snap is paused while it runs
    const go = (d) => {
      const c = cards[Math.max(0, Math.min(cards.length - 1, current() + d))];
      const from = track.scrollLeft;
      const to = from + c.getBoundingClientRect().left + c.offsetWidth / 2 - (track.getBoundingClientRect().left + track.clientWidth / 2);
      if (still) { track.scrollLeft = to; sync(); return; }
      track.style.scrollSnapType = 'none';
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 600);
        track.scrollLeft = from + (to - from) * (1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(step); else { track.style.scrollSnapType = ''; sync(); }
      };
      requestAnimationFrame(step);
    };
    // Autoplay: every 5.5s move to the next card, wrapping to the first; only on screen, paused on hover/focus
    let timer = 0;
    let onScreen = false;
    let held = false;
    const tick = () => {
      if (!onScreen || held) return;
      if (current() === cards.length - 1) go(-(cards.length - 1)); else go(1);
    };
    let stopped = false;
    const every = +root.dataset.casesInterval || 5500;
    const restart = () => { clearInterval(timer); if (!still && !stopped) timer = setInterval(tick, every); };
    // Pause button (WCAG 2.2.2): stops the slideshow until pressed again
    const pause = root.querySelector('[data-cases-pause]');
    if (still) pause.hidden = true;
    pause.addEventListener('click', () => {
      stopped = !stopped;
      pause.setAttribute('aria-pressed', String(stopped));
      pause.setAttribute('aria-label', stopped ? 'Play slideshow' : 'Pause slideshow');
      pause.querySelector('.icon').className = `icon ph-fill ${stopped ? 'ph-play' : 'ph-pause'}`;
      restart();
    });
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.25 }).observe(track);
    root.addEventListener('pointerenter', () => { held = true; });
    root.addEventListener('pointerleave', () => { held = false; restart(); });
    root.addEventListener('focusin', () => { held = true; });
    root.addEventListener('focusout', () => { held = false; restart(); });
    restart();
    prev.addEventListener('click', () => { go(-1); restart(); });
    next.addEventListener('click', () => { go(1); restart(); });
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    track.addEventListener('scrollend', sync);
    sync();
  });
})();

/* More in Harmony cards: run each looping scene only while it is on screen */
document.querySelectorAll('[data-mcard]').forEach(card => {
  new IntersectionObserver(([e]) => card.classList.toggle('is-play', e.isIntersecting), { threshold: 0.3 }).observe(card);
});
