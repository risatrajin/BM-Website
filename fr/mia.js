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
    const ask = 'Prépare ma rencontre de 10 h avec Maria Chen. Sors sa dernière révision, signale ce qui manque à son KYC et rédige l’ABF à partir de l’appel d’aujourd’hui.';

    const play = async (alive) => {
      while (alive()) {
        feed.innerHTML = '';
        head.textContent = 'Nouvelle tâche';
        const row = el('li', 'is-enter is-on', '<span class="mav" style="--c:var(--blue-500)">M</span><div><b><span>Nouvelle tâche</span><time>now</time></b><small>Saisie en cours…</small></div>');
        threads.querySelectorAll('li').forEach((li) => li.classList.remove('is-on'));
        threads.prepend(row);
        const rowName = row.querySelector('b span'), rowNote = row.querySelector('small');

        await wait(600); feed.append(el('p', 'mtime', '7 h 08'));
        await wait(300); let p = pending('Réflexion'); feed.append(p);
        await wait(1500); p.remove();
        feed.append(el('p', 'mmsg mmsg--mia', 'Bonjour Sarah, enchantée. Par quoi voulez-vous que je commence à vous alléger — une rencontre client, des formulaires ou des renouvellements ?'));
        rowNote.textContent = 'Par quoi voulez-vous que je commence ?';

        await wait(1200);
        composer.classList.add('is-typing');
        for (let i = 1; i <= ask.length && alive(); i += 2) { composer.textContent = ask.slice(0, i); await wait(22); }
        composer.textContent = 'Écrire à Mia'; composer.classList.remove('is-typing');
        feed.append(el('p', 'mmsg mmsg--me', ask));

        await wait(500);
        feed.append(el('p', 'mnote', 'Renommé en Préparation de rencontre'));
        head.textContent = 'Préparation de rencontre'; rowName.textContent = 'Préparation de rencontre'; rowNote.textContent = 'En cours…';
        await wait(400); p = pending('Lecture du dossier de Maria'); feed.append(p);
        await wait(2200); p.remove();
        feed.append(el('div', 'mmsg mmsg--mia', `C’est fait. Le dossier de Maria est prêt pour votre rencontre de 10 h :<ul>${check('Last review pulled (March)')}${check('KYC: employer and 1 beneficiary missing')}${check('FNA drafted — 2 fields to check')}</ul>`));
        rowNote.textContent = 'ABF rédigée, 2 champs à vérifier.';

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
      { name: 'Notes de rencontre', c: '--blue-500', desc: '<b>Parlez à votre client. Obtenez les notes.</b> Mia enregistre avec consentement, transcrit et résume chaque rencontre, puis la classe au dossier du bon client pour une révision de deux minutes.',
        feed: [['me', 'Résume mon appel avec Maria et classe-le au dossier.'], ['doc', '<small>Résumé de la rencontre · Maria Chen</small>Nouvelle maison, souhaite une assurance prêt hypothécaire. Deux personnes à charge, budget d’environ 150 $ par mois. Faire un suivi vendredi.<div class="mmsg__btns"><span>Approuver</span><span>Modifier</span></div>'], ['mia', 'Classé au dossier client de Maria. Voulez-vous que je rédige le courriel de suivi ?']] },
      { name: 'KYC et ABF', c: '--green-500', desc: '<b>Des formulaires qui se remplissent tout seuls.</b> Tout ce que le client a dit devient le KYC et l’ABF — prérempli, vérifié pour repérer les lacunes et envoyé pour signature électronique.',
        feed: [['me', 'Commence le KYC de Tom à partir de la rencontre d’aujourd’hui.'], ['mia', 'KYC et ABF préremplis à partir de l’appel. 2 champs requièrent votre attention : employeur et revenu annuel.'], ['doc', '<small>KYC · Tom Park</small>18 champs sur 20 remplis<div class="mmsg__btns"><span>Réviser</span><span>Envoyer pour signature électronique</span></div>']] },
      { name: 'Convenance', c: '--blue-700', desc: '<b>Chaque recommandation, justifiée.</b> Chaque produit que vous recommandez est comparé au profil du client, et la justification est rédigée pour vous.',
        feed: [['me', 'Une assurance vie temporaire convient-elle à Tom ?'], ['doc', '<small>Justification de la convenance</small>Répond à l’objectif (protéger les personnes à charge), respecte le budget de 150 $ et convient à une faible tolérance au risque.<div class="mmsg__btns"><span>Approuver</span><span>Modifier</span></div>']] },
      { name: 'Renouvellements', c: '--amber-500', desc: '<b>Rien ne passe entre les mailles.</b> Mia surveille les renouvellements, les mises à jour de KYC et les documents qui expirent, et prépare le travail avant l’échéance.',
        feed: [['mia', '4 renouvellements à faire ce mois-ci. J’ai préparé les documents pour chacun.'], ['doc', '<small>À échéance ce mois-ci</small>Ana Ruiz · 12 juin<br />Tom Park · 18 juin<br />2 de plus<div class="mmsg__btns"><span>Ouvrir</span><span>Me le rappeler</span></div>'], ['me', 'Envoie l’avis de renouvellement à Ana.']] },
      { name: 'Suivis clients', c: '--blue-300', desc: '<b>Des suivis à votre image.</b> Après chaque rencontre, Mia rédige le mot de remerciement et les prochaines étapes, et attend votre accord.',
        feed: [['me', 'Rédige les mots de remerciement pour les rencontres d’aujourd’hui.'], ['doc', '<small>À : Maria Chen</small>Bonjour Maria, merci de m’avoir consacré du temps aujourd’hui. Comme promis, voici les deux options dont nous avons parlé…<div class="mmsg__btns"><span>Envoyer le courriel</span><span>Supprimer</span></div>'], ['mia', '5 brouillons prêts. Je n’envoie rien sans votre accord.']] },
      { name: 'Préparation d’audit', c: '--slate-700', desc: '<b>La preuve en un clic.</b> Chaque rencontre, formulaire, vérification et approbation est horodaté et conservé — exportable en un seul fichier quand l’organisme de réglementation le demande.',
        feed: [['me', 'Mon portefeuille clients est-il prêt pour l’audit ?'], ['mia', 'Checked 48 client files. 47 are complete; 1 is missing a signed KYC.'], ['doc', '<small>Exportation de la piste d’audit</small>48 dossiers · 312 événements · PDF<div class="mmsg__btns"><span>Télécharger</span><span>Corriger la lacune</span></div>']] },
      { name: 'Demandez à Mia', c: '--blue-500', desc: '<b>Demandez au lieu de chercher.</b> Posez n’importe quelle question sur un client, une police ou une échéance. Mia répond en citant la source et propose de faire la prochaine étape.',
        feed: [['me', 'Qu’est-ce que Tom a dit au sujet de son budget ?'], ['mia', 'Environ 150 $ par mois, avec de la souplesse si ça couvre ses deux enfants. Source : rencontre du 12 mars.'], ['me', 'Merci. Ajoute ça à son ABF.']] },
      { name: 'Résumé du matin', c: '--blue-400', desc: '<b>Commencez la journée prêt.</b> Chaque matin, Mia dresse la liste de vos rencontres, des KYC ouverts et des renouvellements à faire, avec la préparation déjà faite.',
        feed: [['doc', '<small>Bonjour Sarah</small>4 rencontres aujourd’hui<br />2 mises à jour de KYC ouvertes<br />1 renouvellement vendredi<div class="mmsg__btns"><span>Ouvrir aujourd’hui</span></div>'], ['me', 'Déplace ma rencontre de 15 h à demain.'], ['mia', 'C’est fait. Ana a reçu la nouvelle heure.']] },
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
        if (who !== 'me') { const p = pending('Réflexion'); feed.append(p); await wait(700); p.remove(); if (me !== token) return; }
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
