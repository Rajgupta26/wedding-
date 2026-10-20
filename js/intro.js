/* Scroll-driven intro: curtains part → mandap builds up → title writes itself in → ambient loop. */
(() => {
  const FR = window.INTRO_FRAMES;            // [[file, sourceFrame], ...]
  const SRC = FR.map((f) => f[1]);
  const LAST_SRC = SRC[SRC.length - 1];
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;   // phones/tablets: lighter effects

  const intro = $("#home"), stage = $("#stage"), frameEl = $("#frame");
  const canvas = $("#introCanvas"), ctx = canvas.getContext("2d");
  const video = $("#introLoop"), cover = $("#introCover"), next = $("#introNext"), haze = $("#introHaze");
  const veil = $("#introVeil");
  const sub = $(".t-sub"), name1 = $(".t-name--1"), amp = $(".t-amp"), name2 = $(".t-name--2");

  /* ---------- timeline, as a fraction p of the pinned scroll distance
     The video runs 0→5.5s for the reveal; the slow opening drift is compressed a little for scrolling. */
  const KEYS = [[0, 0], [0.12, 54], [0.7, LAST_SRC]];      // p → source video frame
  const BLEND = [0.7, 0.76];                                 // last reveal frame → first loop frame
  const SUB = [0.735, 0.84];                                 // "The Wedding of"
  const NAMES = [0.79, 0.965];                               // names + ampersand
  const AUTOPLAY = [[0, 0], [1.8, 0.12], [5.5, 0.7], [5.9, 0.76], [7.3, 0.965], [7.9, 1]]; // seconds → p (video pacing)

  let target = 0, smooth = 0, dirty = true, auto = null, rafId = 0;
  const kick = () => { if (!rafId) rafId = requestAnimationFrame(loop); };
  const invalidate = () => { dirty = true; kick(); };
  const cardEl = $("#card");
  video.muted = true;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerpKeys = (keys, x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [x1, y1] = keys[i], [x0, y0] = keys[i - 1];
      if (x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
    }
    return keys[keys.length - 1][1];
  };

  /* ---------- image loading (coarse frames first, so scrubbing works almost immediately) */
  const imgs = new Array(FR.length);
  let endImg = null, loaded = 0;
  const total = FR.length + 1;
  const bar = $("#loaderBar");
  const order = [];
  [8, 4, 2, 1].forEach((stride) => {
    for (let i = 0; i < FR.length; i += stride) if (!order.includes(i)) order.push(i);
  });
  if (!order.includes(FR.length - 1)) order.splice(1, 0, FR.length - 1);
  const essential = new Set(order.filter((i) => i % 4 === 0).concat([FR.length - 1]));
  let essentialLeft = essential.size + 1;

  // Each frame is decoded once into an ImageBitmap and kept: drawing it is then a plain copy.
  // (A plain <img> that isn't on the page gets re-decoded on every canvas draw — that was the phone lag.)
  const toBitmap = (im) => (window.createImageBitmap ? createImageBitmap(im).catch(() => im) : im);
  function loadImg(src) {
    const im = new Image();
    im.decoding = "async";
    im.src = src;
    return (im.decode ? im.decode() : new Promise((r, j) => { im.onload = r; im.onerror = j; }))
      .then(() => toBitmap(im), () => (im.complete && im.naturalWidth ? toBitmap(im) : null));
  }
  function progressed(isEssential) {
    loaded++;
    if (isEssential) essentialLeft--;
    bar.style.transform = `scaleX(${Math.min(1, (essential.size + 1 - essentialLeft) / (essential.size + 1))})`;
    lastKey = "";
    invalidate();
    if (essentialLeft <= 0) ready();
  }
  // phones get a lighter frame set (540x1000): ~40% less to download and to keep decoded in memory
  const BASE = touch ? "assets/intro-m/" : "assets/intro/";
  if (touch) { canvas.width = 540; canvas.height = 1000; }
  loadImg(BASE + "end.webp").then((im) => { endImg = im; progressed(true); });
  order.forEach((i) => loadImg(BASE + FR[i][0]).then((im) => { imgs[i] = im; progressed(essential.has(i)); }));

  let isReady = false;
  function ready() {
    if (isReady) return;
    isReady = true;
    const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
    fonts.then(() => {
      fitNames();
      document.body.classList.remove("is-loading");
      $("#loader").classList.add("done");
      video.preload = "auto";
      video.load();
      measure();
    });
  }
  setTimeout(ready, 15000); // never trap the guest behind the loader

  /* ---------- drawing */
  const toIndex = (s) => {   // source frame (float) → fractional index into FR
    let lo = 0, hi = SRC.length - 1;
    if (s <= SRC[0]) return 0;
    if (s >= SRC[hi]) return hi;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; SRC[m] <= s ? (lo = m) : (hi = m); }
    return lo + (s - SRC[lo]) / (SRC[hi] - SRC[lo]);
  };
  const below = (k) => { for (let i = k; i >= 0; i--) if (imgs[i]) return i; return -1; };
  const above = (k) => { for (let i = k; i < imgs.length; i++) if (imgs[i]) return i; return -1; };

  let lastKey = "";
  function draw(fpos, endW) {
    const key = fpos.toFixed(3) + "|" + endW.toFixed(3);
    if (key === lastKey) return;
    const k = Math.floor(fpos);
    let a = below(k), b = above(Math.min(k + 1, imgs.length - 1));
    if (a < 0 && b < 0) return;
    if (a < 0) a = b;
    if (b < 0) b = a;
    lastKey = key;
    ctx.globalAlpha = 1;
    ctx.drawImage(imgs[a], 0, 0, canvas.width, canvas.height);
    if (b !== a) {
      ctx.globalAlpha = clamp((fpos - a) / (b - a));
      ctx.drawImage(imgs[b], 0, 0, canvas.width, canvas.height);
    }
    if (endW > 0 && endImg) {
      ctx.globalAlpha = endW;
      ctx.drawImage(endImg, 0, 0, canvas.width, canvas.height);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- title letters */
  const lettersOf = (n) => n._letters || [];
  const subL = lettersOf(sub), nameL = [...lettersOf(name1), ...lettersOf(amp), ...lettersOf(name2)];
  // the ampersand lands in the middle of the names, as in the video
  lettersOf(amp).forEach((l) => (l.order = 0.5));

  function letters(list, p, [a, b]) {
    const span = b - a, each = span * 0.42;
    for (const l of list) {
      const t = clamp((p - (a + (span - each) * l.order)) / each);
      if (t === l.t) continue;
      l.t = t;
      const e = t * t * (3 - 2 * t);
      l.el.style.opacity = e.toFixed(3);
      if (!touch) l.el.style.filter = e >= 1 ? "none" : `blur(${((1 - e) * blurMax).toFixed(2)}px)`;
    }
  }

  function fitNames() {
    [name1, name2].forEach((n) => {
      n.style.fontSize = "";
      const max = frameEl.clientWidth * 0.84;
      if (n.scrollWidth > max) n.style.fontSize = `${(22 * max / n.scrollWidth).toFixed(2)}cqw`;
    });
  }

  /* ---------- loop video hand-off */
  let videoOn = false;
  function setVideo(on) {
    if (on === videoOn) return;
    videoOn = on;
    if (on) {
      try { video.currentTime = 0; } catch { /* not ready yet */ }
      const pr = video.play();
      if (pr && pr.catch) pr.catch(() => {});
      video.classList.add("on");
    } else {
      video.classList.remove("on");
      video.pause();
    }
  }

  /* ---------- scroll → progress */
  let range = 1, stageH = 1, introTop = 0, cardTop = 1, blurMax = 8, covered = false;
  function measure() {
    stageH = stage.offsetHeight;
    introTop = intro.getBoundingClientRect().top + scrollY;
    cardTop = cardEl.getBoundingClientRect().top + scrollY;
    range = Math.max(1, cardTop - stageH - introTop);       // the reveal finishes just as the card starts to come in
    blurMax = frameEl.clientWidth * 0.022;
    fitNames();
    lastKey = "";
    covered = false;
    invalidate();
  }

  const readScroll = () => {
    target = clamp((scrollY - introTop) / range);
    invalidate();
  };

  function render(p) {
    const out = clamp(1 - (cardTop - scrollY) / stageH);   // 0 → 1 while the card dissolves in over the scene
    if (out >= 1 && covered) return;                       // hidden behind the card: nothing to update
    covered = out >= 1;

    // frames
    const src = lerpKeys(KEYS, Math.min(p, BLEND[0]));
    const endW = clamp((p - BLEND[0]) / (BLEND[1] - BLEND[0]));
    if (endW < 1 || !videoOn) draw(toIndex(src), endW);

    // ambient loop takes over once the reveal is complete and the stage is on screen
    setVideo(p >= BLEND[1] && out < 1);

    // title
    letters(subL, p, SUB);
    letters(nameL, p, NAMES);
    haze.style.opacity = clamp((p - NAMES[0]) / (NAMES[1] - NAMES[0])).toFixed(3);

    // cover message fades as the curtains start moving
    const c = 1 - clamp(p / 0.04);
    cover.style.opacity = c.toFixed(3);
    cover.style.visibility = c <= 0 ? "hidden" : "visible";
    cover.style.transform = `translateY(${((1 - c) * 24).toFixed(1)}px)`;

    next.classList.toggle("show", p > 0.975 && out < 0.15);

    // the invitation card dissolves in over the scene, which drifts gently closer
    const o = out * out * (3 - 2 * out);
    frameEl.style.setProperty("--out-scale", (1 + o * 0.05).toFixed(4));
    veil.style.opacity = o.toFixed(3);
  }

  function loop() {
    rafId = 0;
    if (auto) {
      const t = (performance.now() - auto.t0) / 1000;
      const p = lerpKeys(AUTOPLAY, auto.from + t);
      window.scrollTo(0, introTop + p * range);
      target = smooth = p;
      if (auto.from + t >= AUTOPLAY[AUTOPLAY.length - 1][0]) auto = null;
      render(smooth);
    } else {
      const d = target - smooth;
      if (Math.abs(d) > 0.0002 || dirty) {
        smooth = reduce || touch || Math.abs(d) < 0.0002 ? target : smooth + d * 0.2;   // touch scrolling is already smooth
        render(smooth);
      }
    }
    dirty = false;
    if (auto || Math.abs(target - smooth) > 0.0002) kick();
  }

  /* ---------- "Open Invitation": plays the reveal at the video's own pace */
  function startAuto() {
    const p = target;
    let from = 0;                                   // resume from the current point on the video timeline
    for (let i = 1; i < AUTOPLAY.length; i++) {
      const [t0, p0] = AUTOPLAY[i - 1], [t1, p1] = AUTOPLAY[i];
      if (p <= p1) { from = t0 + (t1 - t0) * ((p - p0) / Math.max(1e-6, p1 - p0)); break; }
      from = t1;
    }
    auto = { t0: performance.now(), from };
    kick();
  }
  const cancelAuto = () => { auto = null; };
  $("#openBtn").addEventListener("click", startAuto);
  ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) =>
    addEventListener(ev, (e) => { if (auto && !(ev === "mousedown" && e.target.closest("#openBtn"))) cancelAuto(); }, { passive: true })
  );

  addEventListener("scroll", () => { if (!auto) readScroll(); }, { passive: true });
  addEventListener("resize", () => { measure(); readScroll(); });
  if (document.fonts) document.fonts.ready.then(fitNames);

  measure();
  readScroll();
  smooth = target;
  kick();
})();
