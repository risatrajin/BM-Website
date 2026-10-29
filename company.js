// Company pages (about, team, partners, brand). product.js handles the forms.
(() => {
  // About hero: photos spread over a sphere that turns slowly; drag to spin it.
  // Photos on the far side fade and blur behind the headline, the near side sits in front.
  document.querySelectorAll('[data-globe]').forEach((stage) => {
    const photos = [...stage.querySelectorAll('.cglobe__photo')];
    const n = photos.length;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Even spread over the sphere (Fibonacci lattice)
    const pts = photos.map((_, i) => {
      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(1 - y * y);
      const a = i * Math.PI * (3 - Math.sqrt(5));
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    });
    let rx = -0.25, ry = 0, vx = 0, vy = still ? 0 : 0.0018;
    let drag = null, visible = true, raf = 0;

    const render = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      const ry0 = Math.min(h * 0.4, w * 0.6), rx0 = Math.min(w * 0.42, ry0 * 1.6);
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      photos.forEach((el, i) => {
        const [x0, y0, z0] = pts[i];
        const x1 = x0 * cy + z0 * sy, z1 = -x0 * sy + z0 * cy;      // turn around the vertical axis
        const y2 = y0 * cx - z1 * sx, z2 = y0 * sx + z1 * cx;        // then tilt
        const depth = (z2 + 1) / 2;                                   // 0 far … 1 near
        const s = 0.7 + 0.32 * depth;
        el.style.transform = `translate3d(${x1 * rx0}px, ${y2 * ry0}px, 0) scale(${s})`;
        el.style.opacity = (0.22 + 0.78 * Math.min(1, depth * 1.5)).toFixed(3);
        el.style.filter = depth < 0.5 ? `blur(${((0.5 - depth) * 11).toFixed(2)}px)` : 'none';
        el.style.zIndex = Math.round(depth * 1000);
      });
    };
    const loop = () => {
      if (!drag) {
        ry += vy; rx += vx;
        vx *= 0.94;
        if (!still) vy += (0.0018 * Math.sign(vy || 1) - vy) * 0.02;  // ease back to the idle spin
        else vy *= 0.94;
      }
      rx = Math.max(-0.9, Math.min(0.9, rx));
      render();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, dt = Math.max(16, e.timeStamp - drag.t);
      ry += dx * 0.005; rx -= dy * 0.003;
      vy = (dx * 0.005) / (dt / 16); vx = (-dy * 0.003) / (dt / 16);
      drag = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    });
    const end = () => { drag = null; stage.classList.remove('is-dragging'); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(stage);
    window.addEventListener('resize', render);
    render();
  });


  // Stats: count up from zero the first time they scroll into view
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 1200);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  }

  // Filter tabs: show only the items whose data-cat matches
  document.querySelectorAll('[data-filter]').forEach((bar) => {
    const list = document.getElementById(bar.dataset.filter);
    const buttons = [...bar.querySelectorAll('button')];
    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const cat = b.dataset.cat;
      list.querySelectorAll('[data-cat]').forEach((item) => {
        item.hidden = cat !== 'all' && item.dataset.cat !== cat;
      });
    }));
  });
})();
