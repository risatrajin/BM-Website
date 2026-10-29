// Mia page: hero thread, mascot eyes, card replays, job tabs, pricing toggle, closing draw.
// Timings follow x.ai/bot (pop-in 0.28s, typing dots, "Thinking" shimmer) — styles in mia.css.
(() => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, still ? 0 : ms));
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const bot = '<svg class="mbot" viewBox="0 0 622.145 662.796" aria-hidden="true"><use href="#mbot"/></svg>';
  const pending = (label) => el('div', 'mpending', `${bot}<span class="mdots"><i></i><i></i><i></i></span><span class="mshimmer">${label}</span>`);
  const check = (t) => `<li><i class="icon ph-bold ph-check-circle"></i>${t}</li>`;

  // Run a looping script only while its box is on screen
  const whileVisible = (box, run) => {
    let on = false, running = false;
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !running) { running = true; run(() => on).finally(() => { running = false; }); }
    }, { threshold: 0.25 }).observe(box);
  };

  // ---------- Hero: a new thread where Mia prepares a client meeting ----------
  const app = document.querySelector('[data-mia-app]');
  if (app) {
    const feed = app.querySelector('[data-mia-feed]');
    const threads = app.querySelector('[data-mia-threads]');
    const head = app.querySelector('[data-mia-head]');
    const composer = app.querySelector('[data-mia-composer]');
    const ask = 'Prep my 10:00 with Maria Chen. Pull her last review, flag what’s missing on her KYC and draft the FNA from today’s call.';

    const play = async (alive) => {
      while (alive()) {
        feed.innerHTML = '';
        head.textContent = 'New task';
        const row = el('li', 'is-enter is-on', '<span class="mav" style="--c:var(--blue-500)">M</span><div><b><span>New task</span><time>now</time></b><small>Typing…</small></div>');
        threads.querySelectorAll('li').forEach((li) => li.classList.remove('is-on'));
        threads.prepend(row);
        const rowName = row.querySelector('b span'), rowNote = row.querySelector('small');

        await wait(600); feed.append(el('p', 'mtime', '7:08 AM'));
        await wait(300); let p = pending('Thinking'); feed.append(p);
        await wait(1500); p.remove();
        feed.append(el('p', 'mmsg mmsg--mia', 'Hi Sarah, good to meet you. What should I take off your plate first — a client meeting, forms or renewals?'));
        rowNote.textContent = 'What should I take off your plate first?';

        await wait(1200);
        composer.classList.add('is-typing');
        for (let i = 1; i <= ask.length && alive(); i += 2) { composer.textContent = ask.slice(0, i); await wait(22); }
        composer.textContent = 'Message Mia'; composer.classList.remove('is-typing');
        feed.append(el('p', 'mmsg mmsg--me', ask));

        await wait(500);
        feed.append(el('p', 'mnote', 'Renamed to Meeting prep'));
        head.textContent = 'Meeting prep'; rowName.textContent = 'Meeting prep'; rowNote.textContent = 'Working…';
        await wait(400); p = pending('Reading Maria’s file'); feed.append(p);
        await wait(2200); p.remove();
        feed.append(el('div', 'mmsg mmsg--mia', `Done. Maria’s file is ready for your 10:00:<ul>${check('Last review pulled (March)')}${check('KYC: employer and 1 beneficiary missing')}${check('FNA drafted — 2 fields to check')}</ul>`));
        rowNote.textContent = 'FNA drafted, 2 fields to check.';

        await wait(5000);
        row.remove();
        threads.firstElementChild?.classList.add('is-on');
        if (still) return;
      }
    };
    whileVisible(app, play);
  }

  // ---------- Mascot eyes follow the pointer ----------
  const lookers = [...document.querySelectorAll('[data-mia-look], .mbot--inline')];
  if (lookers.length && !still) {
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    let raf = 0, px = 0, py = 0;
    window.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        lookers.forEach((svg) => {
          const r = svg.getBoundingClientRect();
          const nx = clamp((px - (r.left + r.width / 2)) / 400), ny = clamp((py - (r.top + r.height * 0.6)) / 300);
          svg.style.setProperty('--lx', `${(nx * 30).toFixed(1)}px`);
          svg.style.setProperty('--ly', `${(ny * 22).toFixed(1)}px`);
          // Past either side the eyes swap to the notched shape (vars inherit into the <use> clone)
          const look = nx < -0.35 ? 'l' : nx > 0.35 ? 'r' : 'c';
          ['l', 'c', 'r'].forEach((k) => svg.style.setProperty(`--look-${k}`, k === look ? 1 : 0));
        });
      });
    }, { passive: true });
  }

  // ---------- Cards that replay each time they scroll in ----------
  document.querySelectorAll('[data-mia-teach], [data-mia-memory]').forEach((card) => {
    card.querySelectorAll('.mbars i').forEach((b, i) => b.style.setProperty('--i', i));
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { card.classList.remove('is-play'); void card.offsetWidth; card.classList.add('is-play'); }
    }, { threshold: 0.4 }).observe(card);
  });

  const relay = document.querySelector('[data-mia-relay]');
  if (relay) {
    const words = [...relay.children];
    let i = 0;
    words[0].classList.add('is-on');
    if (!still) setInterval(() => { words[i].classList.remove('is-on'); i = (i + 1) % words.length; words[i].classList.add('is-on'); }, 1800);
  }

  // ---------- Give Mia a job ----------
  const jobs = document.querySelector('[data-mia-jobs]');
  if (jobs) {
    const JOBS = [
      { name: 'Meeting notes', c: '--blue-500', desc: '<b>Talk to your client. Get the notes.</b> Mia records with consent, transcribes and summarises every meeting, then files it to the right client for your two-minute review.',
        feed: [['me', 'Summarise my call with Maria and file it.'], ['doc', '<small>Meeting summary · Maria Chen</small>New home, wants mortgage protection. Two dependants, budget about $150 a month. Follow up Friday.<div class="mmsg__btns"><span>Approve</span><span>Edit</span></div>'], ['mia', 'Filed to Maria’s client record. Want me to draft the follow-up email?']] },
      { name: 'KYC & FNA', c: '--green-500', desc: '<b>Forms that fill themselves.</b> Everything the client said becomes the KYC and FNA — pre-filled, checked for gaps and sent for e-signature.',
        feed: [['me', 'Start Tom’s KYC from today’s meeting.'], ['mia', 'KYC and FNA pre-filled from the call. 2 fields need you: employer and annual income.'], ['doc', '<small>KYC · Tom Park</small>18 of 20 fields complete<div class="mmsg__btns"><span>Review</span><span>Send for e-sign</span></div>']] },
      { name: 'Suitability', c: '--blue-700', desc: '<b>Every recommendation, justified.</b> Each product you recommend is checked against the client’s profile, and the reasoning is written down for you.',
        feed: [['me', 'Is term life a fit for Tom?'], ['doc', '<small>Suitability rationale</small>Matches the goal (protect dependants), fits the $150 budget and suits a low risk tolerance.<div class="mmsg__btns"><span>Approve</span><span>Edit</span></div>']] },
      { name: 'Renewals', c: '--amber-500', desc: '<b>Nothing slips through.</b> Mia watches renewals, KYC refreshes and expiring documents, and prepares the work before it’s due.',
        feed: [['mia', '4 renewals due this month. I’ve prepared the paperwork for each.'], ['doc', '<small>Due this month</small>Ana Ruiz · Jun 12<br />Tom Park · Jun 18<br />2 more<div class="mmsg__btns"><span>Open</span><span>Remind me</span></div>'], ['me', 'Send Ana the renewal notice.']] },
      { name: 'Client follow-ups', c: '--blue-300', desc: '<b>Follow-ups in your voice.</b> After every meeting Mia drafts the thank-you note and next steps, and holds them for your ok.',
        feed: [['me', 'Draft thank-you notes for today’s meetings.'], ['doc', '<small>To: Maria Chen</small>Hi Maria, thanks for your time today. As promised, here are the two options we discussed…<div class="mmsg__btns"><span>Send email</span><span>Discard</span></div>'], ['mia', '5 drafts ready. Sending none until you say so.']] },
      { name: 'Audit prep', c: '--slate-700', desc: '<b>Proof in a click.</b> Every meeting, form, check and approval is time-stamped and kept — exportable as one file when the regulator asks.',
        feed: [['me', 'Is my book audit-ready?'], ['mia', 'Checked 48 client files. 47 are complete; 1 is missing a signed KYC.'], ['doc', '<small>Audit trail export</small>48 files · 312 events · PDF<div class="mmsg__btns"><span>Download</span><span>Fix the gap</span></div>']] },
      { name: 'Ask Mia', c: '--blue-500', desc: '<b>Ask, don’t search.</b> Ask anything about any client, policy or deadline. Mia answers with the source and offers to do the next step.',
        feed: [['me', 'What did Tom say about his budget?'], ['mia', 'About $150 a month, flexible if it covers both kids. Source: meeting on 12 March.'], ['me', 'Thanks. Add that to his FNA.']] },
      { name: 'Morning brief', c: '--blue-400', desc: '<b>Start the day ready.</b> Each morning Mia lists your meetings, open KYC and renewals due, with the prep already done.',
        feed: [['doc', '<small>Good morning, Sarah</small>4 meetings today<br />2 KYC refreshes open<br />1 renewal due Friday<div class="mmsg__btns"><span>Open today</span></div>'], ['me', 'Move my 3pm to tomorrow.'], ['mia', 'Done. Ana has the new time.']] },
    ];
    const tabs = [...jobs.querySelectorAll('[data-job]')];
    const desc = jobs.querySelector('[data-job-desc]');
    const name = jobs.querySelector('[data-job-name]');
    const av = jobs.querySelector('[data-job-av]');
    const feed = jobs.querySelector('[data-job-feed]');
    let token = 0;

    const show = async (n) => {
      const job = JOBS[n], me = ++token;
      tabs.forEach((t, i) => {
        t.setAttribute('aria-selected', String(i === n));
        t.querySelector('.mav')?.remove();
        if (i === n) t.prepend(el('span', 'mav mav--xs', job.name[0]));
        if (i === n) t.firstChild.style.setProperty('--c', `var(${job.c})`);
      });
      desc.innerHTML = job.desc;
      name.textContent = job.name;
      av.textContent = job.name[0];
      av.style.setProperty('--c', `var(${job.c})`);
      feed.innerHTML = '';
      for (const [who, html] of job.feed) {
        if (me !== token) return;
        if (who !== 'me') { const p = pending('Thinking'); feed.append(p); await wait(700); p.remove(); if (me !== token) return; }
        feed.append(el('div', `mmsg mmsg--${who === 'me' ? 'me' : who === 'doc' ? 'doc' : 'mia'}`, html));
        await wait(450);
      }
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    jobs.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const j = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[j].focus(); show(j);
    });
    let started = false;
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; show(0); } }, { threshold: 0.3 }).observe(jobs);
  }

  // ---------- Pricing: Individual / Teams ----------
  const price = document.querySelector('[data-mia-price]');
  if (price) {
    const btns = [...price.querySelectorAll('[data-plan]')];
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      price.querySelectorAll('[data-plans]').forEach((l) => { l.hidden = l.dataset.plans !== b.dataset.plan; });
    }));
  }

  // ---------- Closing outline draws in ----------
  const draw = document.querySelector('[data-mia-draw]');
  if (draw) new IntersectionObserver(([e]) => { if (e.isIntersecting) draw.classList.add('is-in'); }, { threshold: 0.3 }).observe(draw);
})();
