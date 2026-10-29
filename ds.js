// Design system page: reads the live CSS variables so every value shown here is the one the site uses.
(() => {
  const root = getComputedStyle(document.documentElement);
  const read = (name) => root.getPropertyValue(name).trim();

  // Resolve any CSS colour (hex, rgb, rgba, named) to rgba numbers via a probe element
  const probe = document.createElement('i');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const toRGBA = (value) => {
    probe.style.color = '';
    probe.style.color = value;
    const m = getComputedStyle(probe).color.match(/[\d.]+/g);
    return m ? m.map(Number) : null;
  };

  const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  const luminance = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  // Blend a translucent colour onto a background before measuring contrast
  const over = ([r, g, b, a = 1], [br, bg, bb]) => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];

  const contrast = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  const WHITE = [255, 255, 255];
  const INK = toRGBA('var(--ink)') || [11, 27, 43];

  // Colour swatches: value, hex and contrast against white and ink
  document.querySelectorAll('[data-swatch]').forEach((card) => {
    const name = card.dataset.swatch;
    const raw = read(name);
    const rgba = toRGBA(raw);
    card.querySelector('.ds-swatch__chip').style.setProperty('--c', `var(${name})`);
    const value = card.querySelector('.ds-swatch__value');
    if (!rgba) { value.textContent = raw; return; }
    const solid = rgba.length === 4 && rgba[3] < 1 ? over(rgba, WHITE) : rgba;
    value.textContent = rgba.length === 4 && rgba[3] < 1 ? `${raw}  ·  ≈ ${hex(solid)} on white` : `${hex(rgba)}  ·  rgb(${rgba.slice(0, 3).join(', ')})`;
    const box = card.querySelector('.ds-contrast');
    if (!box) return;
    [['on white', contrast(solid, WHITE)], ['on ink', contrast(solid, INK)]].forEach(([label, c]) => {
      const s = document.createElement('span');
      s.textContent = `${c.toFixed(2)}:1 ${label}`;
      if (c >= 4.5) s.classList.add('is-pass');
      s.title = c >= 4.5 ? 'Passes WCAG AA for body text' : c >= 3 ? 'AA for large text only' : 'Decorative / non-text only';
      box.appendChild(s);
    });
  });

  // Type specimens: show the size/line-height/tracking the browser actually resolved
  document.querySelectorAll('[data-type-sample]').forEach((row) => {
    const el = row.querySelector('.ds-type__sample > *');
    const cs = getComputedStyle(el);
    row.querySelector('[data-resolved]').textContent =
      `${Math.round(parseFloat(cs.fontSize))}px / ${cs.lineHeight === 'normal' ? 'normal' : Math.round(parseFloat(cs.lineHeight)) + 'px'} · ${cs.fontWeight} · ${cs.letterSpacing === 'normal' ? '0' : Math.round(parseFloat(cs.letterSpacing)) + 'px'}`;
  });

  // Fill in values for any element tagged with data-var
  document.querySelectorAll('[data-var]').forEach((el) => { el.textContent = read(el.dataset.var) || '—'; });

  // Every custom property declared on :root across the site's stylesheets
  const table = document.querySelector('[data-all-vars] tbody');
  if (table) {
    const vars = new Map();
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.selectorText !== ':root') continue;
        for (const prop of rule.style) {
          if (prop.startsWith('--')) vars.set(prop, sheet.href ? sheet.href.split('/').pop() : 'inline');
        }
      }
    }
    [...vars.entries()].sort().forEach(([name, file]) => {
      const raw = read(name);
      const rgba = toRGBA(raw);
      const looksColour = rgba && !/^[\d.]+(px|rem|vw|vh|em|%)?$/.test(raw) && !/cubic-bezier|clamp|calc|"/.test(raw);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><code>${name}</code></td><td>${looksColour ? `<span class="ds-dot" style="background:${raw}"></span>` : ''}<span></span></td><td>${file}</td>`;
      tr.children[1].lastChild.textContent = raw;
      table.appendChild(tr);
    });
    document.querySelector('[data-var-count]').textContent = vars.size;
  }

  // Highlight the current section in the index
  const links = [...document.querySelectorAll('.ds-index a')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.ds-section[id]').forEach((s) => io.observe(s));

  // Mia mascot: eyes follow the pointer; past either side they swap to the notched shape
  document.querySelectorAll('[data-mascot] .mm').forEach((svg) => {
    const MAX_X = 30, MAX_Y = 22, SIDE = 0.35; // viewBox units; SIDE = share of range before the shape swaps
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let idle;
    const aim = (nx, ny) => {
      const k = svg.getBoundingClientRect().width / 622;
      svg.style.setProperty('--ex', `${nx * MAX_X * k}px`);
      svg.style.setProperty('--ey', `${ny * MAX_Y * k}px`);
      svg.dataset.look = nx < -SIDE ? 'left' : nx > SIDE ? 'right' : 'center';
    };
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const glance = () => {
      if (still) return;
      const spots = [[-1, 0.1], [0, 0], [1, -0.2], [0, 0.4], [-0.6, -0.5], [0, 0]];
      let i = 0;
      idle = setInterval(() => { aim(...spots[i]); i = (i + 1) % spots.length; }, 1400);
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      clearInterval(idle);
      const r = svg.getBoundingClientRect();
      aim(clamp((e.clientX - (r.left + r.width / 2)) / 400), clamp((e.clientY - (r.top + r.height * 0.6)) / 300));
      idle = setTimeout(glance, 4000);
    }, { passive: true });
    glance();
  });
})();
