(() => {
  const hero = document.getElementById('hero');
  const video = document.getElementById('heroVideo');
  const fade = document.getElementById('heroFade');
  const frame = hero.querySelector('.hero__frame');
  const shade = hero.querySelector('.hero__shade');
  const content = document.getElementById('heroContent');
  const nav = document.getElementById('nav');
  const logos = content.querySelector('.logos');
  const handoff = document.querySelector('main > .section');
  const page = document.querySelector('main');

  // Source video is 1920x1080. Focus point = white-hot glow just above the standing man's head.
  // Zooming here pushes the head off the bottom of the screen, leaving only smooth light,
  // which has no detail to pixelate even at high scale.
  const SRC_W = 1920;
  const SRC_H = 1080;
  const FOCUS_X = 940 / SRC_W;
  const FOCUS_Y = 210 / SRC_H;
  const POS_X = 0.5; // object-position in styles.css
  const POS_Y = 0.2;
  const MAX_SCALE = 14;
  const RISE_END = 0.35; // scroll progress where the video has finished dimming
  const LIFT = 0.6; // keep in sync with --lift in sections.css
  const ZOOM_START = 0; // zoom begins on the first scroll tick

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const smooth = (t) => t * t * (3 - 2 * t);

  let origin = { x: 0, y: 0 };
  let copyTop = 0; // resting top of the copy block, measured without scroll transform

  // Map the focus point through object-fit: cover so the zoom stays locked on the glow at any viewport size.
  function setOrigin() {
    const w = video.clientWidth;
    const h = video.clientHeight;
    const s = Math.max(w / SRC_W, h / SRC_H);
    const ox = (w - SRC_W * s) * POS_X + FOCUS_X * SRC_W * s;
    const oy = (h - SRC_H * s) * POS_Y + FOCUS_Y * SRC_H * s;
    video.style.transformOrigin = `${ox}px ${oy}px`;
    origin = { x: ox, y: oy, w, h };

    const prev = content.style.transform;
    content.style.transform = 'none';
    copyTop = content.querySelector('.hero__title').getBoundingClientRect().top - hero.querySelector('.hero__stage').getBoundingClientRect().top;
    content.style.transform = prev;
  }

  let ticking = false;

  function render() {
    ticking = false;
    const total = hero.offsetHeight - window.innerHeight;
    const p = clamp(-hero.getBoundingClientRect().top / total);

    // Zoom runs the whole way (q). While the copy rises (p < RISE_END) the video stays dim so white text
    // reads; the brightening into the light only starts once the copy has gone.
    const q = range(p, ZOOM_START, 1);
    const dim = range(p, 0, RISE_END);
    // Hero washes to white while the next section starts rising, so the trust row reads on white
    const white = smooth(range(p, 0.08, 0.28));

    if (reduceMotion) {
      fade.style.opacity = String(white);
    } else {
      // Exponential scale reads as constant-speed travel into the light
      const z = smooth(range(q, 0, 0.85));
      // Glide the focus point to screen centre while zooming so the head slides out the bottom
      const dx = (origin.w / 2 - origin.x) * z;
      const dy = (origin.h / 2 - origin.y) * z;
      video.style.transform = `translate(${dx}px, ${dy}px) scale(${Math.exp(Math.log(MAX_SCALE) * z)})`;
      // Dim during the rise, brighten back up as we fly in; blur only once the head has left
      const bright = 1 - 0.45 * dim + 0.6 * range(p, RISE_END, 0.6);
      video.style.filter = `brightness(${bright}) blur(${range(q, 0.45, 0.8) * 10}px)`;

      fade.style.opacity = String(white);
    }

    // Square off the frame as it turns white so no rounded edge is left showing
    frame.style.borderRadius = `calc(var(--hero-r) * ${1 - white})`;

    shade.style.opacity = String(1 - range(p, RISE_END, 0.6));

    // Copy moves up 1:1 with the scroll and fades out as it nears the nav, whatever the screen height
    const shift = p * total;
    content.style.transform = `translateY(${-shift}px)`;
    content.style.opacity = String(Math.min(smooth(range(copyTop - shift, 20, 200)), 1 - white));

    // Logo strip leaves first, before the rising section reaches it
    if (logos) logos.style.opacity = String(1 - range(p, 0, 0.1));

    // Edge of the rising section: crisp-ish over the dark video, long melt once it brightens
    if (handoff) handoff.style.setProperty('--blend', white.toFixed(3));

    // Once the hero has washed white, lift the page an extra LIFT of the viewport so no empty white
    // stretch scrolls by before the next section. main's margin-bottom and scroll-margin offset this (sections.css).
    if (page) page.style.transform = `translateY(${-range(p, 0.2, 0.6) * LIFT * window.innerHeight}px)`;


    // Stop decoding once fully covered by the white layer
    if (white >= 1 && !video.paused) video.pause();
    else if (white < 1 && video.paused) video.play().catch(() => {});
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { setOrigin(); onScroll(); });

  setOrigin();
  render();
  // Web fonts change the copy's height, so re-measure once they're in
  document.fonts?.ready.then(() => { setOrigin(); onScroll(); });
})();
