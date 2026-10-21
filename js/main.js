/* Invitation content: binds config, builds sections, scroll reveals, countdown, butterflies. */
(() => {
  const W = window.WEDDING;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), W);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ---------- 1. bind config text */
  $$("[data-bind]").forEach((n) => {
    const v = get(n.dataset.bind);
    if (v != null) n.textContent = v;
  });
  document.title = `${W.bride.short} & ${W.groom.short} — Wedding Invitation`;

  const guest = new URLSearchParams(location.search).get("to");
  if (guest && guest.trim()) $("#guestName").textContent = guest.trim().slice(0, 50);

  /* ---------- 2. split headings into letters (revealed in random order, blurred → sharp, like the video) */
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  $$("[data-letters]").forEach((node) => {
    const text = node.textContent;
    node.textContent = "";
    node.setAttribute("aria-label", text.trim());
    const spans = [];
    for (const ch of text) {
      if (ch === " ") { node.append(" "); continue; }
      const s = el("span", "ltr", ch);
      s.setAttribute("aria-hidden", "true");
      node.append(s);
      spans.push(s);
    }
    const order = shuffle(spans.map((_, i) => i));
    node._letters = spans.map((s, i) => {
      const o = spans.length > 1 ? order[i] / (spans.length - 1) : 0;
      s.style.setProperty("--ld", (o * 0.85).toFixed(2) + "s");
      return { el: s, order: o, t: -1 };
    });
  });

  /* ---------- 3. after the opening: the area for the new images fades in over the scene */
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (v) => v * v * (3 - 2 * v);
  const card = $("#card"), after = $("#after"), introEl = $("#home");
  function addStop(parent, t) {
    const s = el("i", "snap");
    s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--t", t.toFixed(3));
    parent.append(s);
  }
  // the opening plays in even steps about half a screen apart; the last stop is the full title
  [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.85, 1].forEach((p) => addStop(introEl, p * 4));
  // hand-off: one swipe after the title dissolves the first image in, in place, and lands on it fully shown
  const HAND = 0.8;                                   // screens of scroll the dissolve spans
  addStop(card, HAND);
  let unit = innerHeight, cardTop = 0, introTop = 0, stageFly = null, raf = 0;
  const probe = el("div");
  probe.style.cssText = "position:absolute;left:0;top:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  function measure() {
    unit = probe.offsetHeight || innerHeight;
    cardTop = card.getBoundingClientRect().top + scrollY;
    introTop = introEl.getBoundingClientRect().top + scrollY;
    frame();
  }
  function frame() {
    raf = 0;
    const y = scrollY;
    const k = clamp01((y - cardTop) / (unit * HAND));
    const veil = smooth(k);
    after.style.opacity = veil.toFixed(3);
    // hold the image still at the top of the screen while it dissolves in (it would otherwise rise from below)
    after.style.transform = k < 1 ? `translateY(${(-(1 - k) * unit * HAND).toFixed(1)}px) scale(${(1 + 0.03 * (1 - veil)).toFixed(4)})` : "";
    if (stageFly) {
      const pi = clamp01((y - introTop) / Math.max(1, cardTop - introTop));
      stageFly.show(clamp01((pi - 0.5) / 0.1) * (1 - veil));
    }
  }
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  addEventListener("resize", measure);
  addEventListener("load", measure);

  /* ---------- 4. golden butterflies: a pair over the card, and a pair over the opening scene */
  function flock(box, n, prefix) {
    const wing = (id) => `
      <g class="wing">
        <path d="M0 -3C-8 -27 -36 -33 -37 -14C-38 -3 -19 1 0 0Z" fill="url(#${id})" stroke="#7a5a22" stroke-width=".7"/>
        <path d="M0 2C-15 3 -31 13 -25 25C-19 33 -6 22 0 6Z" fill="url(#${id})" stroke="#7a5a22" stroke-width=".7"/>
        <path d="M-4 -4C-14 -14 -24 -19 -31 -15M-3 3C-11 8 -18 14 -21 22" stroke="#7a5a22" stroke-width=".5" fill="none" opacity=".6"/>
        <circle cx="-26" cy="-17" r="2.2" fill="#fff4d6" opacity=".7"/>
      </g>`;
    const flies = Array.from({ length: n }, (_, i) => {
      const id = `${prefix}${i}`;
      const b = el("div", "bfly");
      b.style.setProperty("--flap", `${0.24 + i * 0.07}s`);
      b.innerHTML = `<svg viewBox="-40 -36 80 66" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f4dea4"/><stop offset=".5" stop-color="#cfa955"/><stop offset="1" stop-color="#8e6b2b"/>
        </linearGradient></defs>
        ${wing(id)}
        <g transform="scale(-1 1)">${wing(id)}</g>
        <ellipse cx="0" cy="3" rx="1.9" ry="11" fill="#5b4220"/>
        <path d="M0 -7C-2 -15 -6 -20 -9 -23M0 -7C2 -15 6 -20 9 -23" stroke="#5b4220" stroke-width=".8" fill="none"/>
      </svg>`;
      box.append(b);
      return { b, s: Math.random() * 100, k: 0.55 + i * 0.25, size: 0.62 + i * 0.12, px: 0, py: 0, ang: 0 };
    });
    let run = false, raf = 0, shown = -1;
    const t0 = performance.now();
    function step(now) {
      const t = (now - t0) / 1000;
      const w = box.clientWidth, h = box.clientHeight;
      flies.forEach((f) => {
        const tt = t * f.k * 0.35 + f.s;
        const x = w * (0.5 + 0.42 * Math.sin(tt * 0.9) * Math.cos(tt * 0.37 + f.s));
        const y = h * (0.5 + 0.38 * Math.sin(tt * 0.61 + f.s * 2) + 0.04 * Math.sin(tt * 5.3));
        const dx = x - f.px, dy = y - f.py;
        if (dx * dx + dy * dy > 0.01) {
          const a = Math.atan2(dy, dx) * 180 / Math.PI + 90;
          const diff = ((a - f.ang + 540) % 360) - 180;
          f.ang += diff * 0.08;
        }
        f.px = x; f.py = y;
        f.b.style.transform = `translate(${x - 23}px, ${y - 18}px) rotate(${f.ang.toFixed(1)}deg) scale(${f.size})`;
      });
      if (run) raf = requestAnimationFrame(step);
    }
    const go = (on) => {
      if (on && !run) { run = true; raf = requestAnimationFrame(step); }
      else if (!on && run) { run = false; cancelAnimationFrame(raf); }
    };
    return {
      go,
      show(v) {                                  // fade the flock in/out and only animate while it can be seen
        if (v === shown) return;
        shown = v;
        box.style.opacity = v.toFixed(3);
        go(v > 0.001);
      },
    };
  }

  if (!reduce) stageFly = flock($("#stageFlutter"), 2, "bws");


  // "Aditi weds Arjun": reveal its lines one after another when it scrolls into view
  const weds = $("#weds");
  $$(".weds__text p", weds).forEach((p, i) => p.style.setProperty("--d", `${i * 0.18}s`));
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { weds.classList.add("in"); io.disconnect(); } }, { threshold: 0.35 }).observe(weds);


  // Sangeet: fireworks bursting in the night sky, kept clear of the title / date / Location text
  (() => {
    const fig = $("#sangeet"), cv = $("#fireworks");
    if (!fig || !cv || reduce) return;
    const ctx = cv.getContext("2d");
    const COLORS = [[255, 214, 120], [255, 182, 92], [255, 140, 170], [255, 240, 210], [180, 210, 255], [255, 120, 90]];
    let w = 0, h = 0, dpr = 1, run = false, raf = 0, last = 0, nextAt = 0;
    const rockets = [], sparks = [];
    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // burst spots (fractions of the sky band): the sides, and the open sky below the text
    // open sky only: the left corner above the gate, and the right side above the arcade
    const SPOTS = [[0.09, 0.1], [0.13, 0.31], [0.86, 0.17], [0.8, 0.36], [0.68, 0.5], [0.88, 0.5], [0.76, 0.6], [0.93, 0.28]];
    function launch() {
      const [fx, fy] = SPOTS[(Math.random() * SPOTS.length) | 0];
      const tx = (fx + (Math.random() - 0.5) * 0.08) * w, ty = (fy + (Math.random() - 0.5) * 0.06) * h;
      // launched from below the roofline, so each rocket appears from behind the palace as it climbs
      rockets.push({ x: tx + (Math.random() - 0.5) * w * 0.06, y: h * 1.0, tx, ty, t: 0, dur: 1.1 + Math.random() * 0.4, c: COLORS[(Math.random() * COLORS.length) | 0] });
    }
    function burst(r) {
      const n = 70 + ((Math.random() * 30) | 0), sp = (0.17 + Math.random() * 0.08) * w;
      const ring = Math.random() < 0.35, c2 = COLORS[(Math.random() * COLORS.length) | 0];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
        const v = sp * (ring ? 1 : 0.35 + Math.random() * 0.75);
        sparks.push({ x: r.tx, y: r.ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.55 + Math.random() * 0.35, c: Math.random() < 0.3 ? c2 : r.c, px: r.tx, py: r.ty });
      }
      sparks.push({ x: r.tx, y: r.ty, vx: 0, vy: 0, life: 1, decay: 3.2, c: [255, 250, 235], flash: true });
    }
    function step(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (now > nextAt) { launch(); if (Math.random() < 0.45) launch(); nextAt = now + 480 + Math.random() * 650; }
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.t += dt / r.dur;
        const k = Math.min(1, r.t), e = 1 - Math.pow(1 - k, 2);
        const x = r.x + (r.tx - r.x) * e, y = r.y + (r.ty - r.y) * e;
        const [cr, cg, cb] = r.c;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.8)`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (r.tx - r.x) * 0.04, y + h * 0.05); ctx.stroke();
        if (k >= 1) { burst(r); rockets.splice(i, 1); }
      }
      const g = h * 0.22;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= s.decay * dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        const [cr, cg, cb] = s.c;
        if (s.flash) {
          const rad = w * 0.16 * (1.2 - s.life);
          const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
          gr.addColorStop(0, `rgba(${cr},${cg},${cb},${0.55 * s.life})`); gr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        s.px = s.x; s.py = s.y;
        s.vx *= 1 - 1.6 * dt; s.vy = s.vy * (1 - 1.6 * dt) + g * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const a = Math.min(1, s.life * 1.4);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`; ctx.lineWidth = 2.8 * s.life + 0.8;
        ctx.beginPath(); ctx.moveTo(s.px - s.vx * 0.09, s.py - s.vy * 0.09); ctx.lineTo(s.x, s.y); ctx.stroke();
        if (Math.random() < 0.08) { ctx.fillStyle = `rgba(255,250,230,${a})`; ctx.fillRect(s.x, s.y, 1.4, 1.4); }   // twinkle
      }
      ctx.globalCompositeOperation = "source-over";
      if (run) raf = requestAnimationFrame(step);
    }
    addEventListener("resize", size);
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !run) { size(); run = true; last = 0; nextAt = 0; raf = requestAnimationFrame(step); }
      else if (!en.isIntersecting && run) { run = false; cancelAnimationFrame(raf); rockets.length = sparks.length = 0; ctx.clearRect(0, 0, w, h); }
    }).observe(fig);
  })();


  // RSVP: the car drives in with the page scroll and comes to a gentle stop exactly at the bottom of the page.
  // Positions are measured once (and on resize/load); each scroll frame only reads scrollY and sets one transform.
  (() => {
    const fig = $("#rsvp"), car = $("#rsvpCar");
    if (!fig || !car) return;
    let y0 = 0, y1 = 1, carW = 0, ticking = false;
    function measureCar() {
      const vh = innerHeight, figTop = fig.getBoundingClientRect().top + scrollY;
      y1 = document.documentElement.scrollHeight - vh;                 // scroll position at the very bottom
      y0 = Math.min(y1 - 1, figTop - vh + fig.offsetHeight * 0.66);    // starts as the carpet comes into view
      carW = car.offsetWidth;
      drive();
    }
    function drive() {
      ticking = false;
      const p = clamp01((scrollY - y0) / (y1 - y0));
      const e = 1 - Math.pow(1 - p, 2.2);
      const x = (1 - e) * 1.1 * carW;
      const bob = Math.sin(p * 38) * (1 - e) * 2;
      car.style.transform = `translate3d(${x.toFixed(1)}px, ${bob.toFixed(1)}px, 0)`;
    }
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(drive); } }, { passive: true });
    addEventListener("resize", measureCar);
    addEventListener("load", measureCar);
    car.addEventListener("load", measureCar);
    $$("#after img").forEach((i) => i.addEventListener("load", measureCar));
    if (window.ResizeObserver) new ResizeObserver(measureCar).observe(document.body);   // any later layout change
    measureCar();
  })();


  // Wedding: flickering havan fire — tongues of flame, a breathing glow and rising embers
  (() => {
    const fig = $("#weddingFig"), cv = $("#havan");
    if (!fig || !cv || reduce) return;
    const ctx = cv.getContext("2d");
    let w = 0, h = 0, run = false, raf = 0, last = 0;
    const BX = 0.483, BY = 0.833;                 // fire base inside the canvas
    const parts = [];
    function size() {
      const d = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function spawn(ember) {
      parts.push(ember
        ? { x: BX * w + (Math.random() - 0.5) * w * 0.25, y: BY * h - h * 0.15, vx: (Math.random() - 0.5) * w * 0.25, vy: -h * (0.35 + Math.random() * 0.3), life: 1, decay: 0.5 + Math.random() * 0.4, r: 0.8 + Math.random() * 0.8, ember: true }
        : { x: BX * w + (Math.random() - 0.5) * w * 0.22, y: BY * h, vx: (Math.random() - 0.5) * w * 0.12, vy: -h * (0.5 + Math.random() * 0.35), life: 1, decay: 1.6 + Math.random() * 1.0, r: w * (0.07 + Math.random() * 0.06) });
    }
    function step(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const t = now / 1000;
      for (let i = 0; i < 4; i++) spawn(false);
      if (Math.random() < 0.12) spawn(true);
      ctx.clearRect(0, 0, w, h);
      // breathing glow
      const g = 0.5 + 0.18 * Math.sin(t * 7.1) + 0.12 * Math.sin(t * 12.7);
      const gr = ctx.createRadialGradient(BX * w, BY * h - h * 0.18, 0, BX * w, BY * h - h * 0.18, w * 0.55);
      gr.addColorStop(0, `rgba(255,170,60,${0.35 * g})`); gr.addColorStop(1, "rgba(255,120,30,0)");
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= p.decay * dt;
        if (p.life <= 0 || p.y < 0) { parts.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(t * 9 + p.y * 0.3) * w * 0.08) * dt; p.y += p.vy * dt;
        if (p.ember) {
          ctx.fillStyle = `rgba(255,${180 + 60 * p.life | 0},120,${p.life})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        // flame tongue: white-yellow core at birth → orange → deep red as it rises and fades
        const k = p.life, r = p.r * (0.45 + 0.55 * k);
        const col = k > 0.75 ? [255, 214, 120] : k > 0.45 ? [255, 150, 45] : [225, 70, 25];
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(0.62, 1.55);            // tall, narrow tongues
        const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        fg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${0.42 * k})`); fg.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      if (run) raf = requestAnimationFrame(step);
    }
    addEventListener("resize", size);
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !run) { size(); run = true; last = 0; raf = requestAnimationFrame(step); }
      else if (!en.isIntersecting && run) { run = false; cancelAnimationFrame(raf); parts.length = 0; }
    }).observe(fig);
  })();


  // Haldi: marigold petals drifting down through the courtyard, and the diyas flickering
  (() => {
    const fig = $("#haldiFig"), cv = $("#haldiFx");
    if (!fig || !cv || reduce) return;
    const ctx = cv.getContext("2d");
    const DIYAS = [[167, 1137, 1], [584, 1107, 1], [57, 1223, 0.7], [23, 1237, 0.7]].map(([x, y, s]) => [x / 910, y / 1729, s]);
    const COLS = ["#f7a21b", "#f6c21c", "#ef7d12", "#ffd84a", "#fff3d6", "#e8580f"];
    let w = 0, h = 0, run = false, raf = 0, last = 0;
    const petals = [];
    function size() {
      const d = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    const petal = (y) => ({ x: Math.random() * w, y: y ?? -20, s: w * (0.016 + Math.random() * 0.014), vy: h * (0.035 + Math.random() * 0.03),
      sway: 0.6 + Math.random() * 1.2, ph: Math.random() * 6.3, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 3, flip: Math.random() * 6.3,
      c: COLS[(Math.random() * COLS.length) | 0] });
    function step(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      // diya flames: a warm halo that breathes and a little dancing tongue on top of each painted flame
      ctx.globalCompositeOperation = "lighter";
      DIYAS.forEach(([fx, fy, s], i) => {
        const x = fx * w, y = fy * h, f = 0.75 + 0.2 * Math.sin(t * 9 + i * 2) + 0.1 * Math.sin(t * 23 + i);
        const R = w * 0.06 * s * f;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, "rgba(255,190,90,0.55)"); g.addColorStop(1, "rgba(255,140,40,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.3); ctx.fill();
        const fh = w * 0.026 * s * f, fw = w * 0.008 * s, lean = Math.sin(t * 6 + i) * fw * 0.6;
        const fg = ctx.createLinearGradient(x, y + fh * 0.3, x, y - fh);
        fg.addColorStop(0, "rgba(255,245,200,0.9)"); fg.addColorStop(0.5, "rgba(255,180,60,0.75)"); fg.addColorStop(1, "rgba(255,90,20,0)");
        ctx.fillStyle = fg; ctx.beginPath();
        ctx.moveTo(x - fw, y + fh * 0.25);
        ctx.quadraticCurveTo(x - fw * 1.1, y - fh * 0.35, x + lean, y - fh);
        ctx.quadraticCurveTo(x + fw * 1.1, y - fh * 0.35, x + fw, y + fh * 0.25);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      // petals
      while (petals.length < 34) petals.push(petal(petals.length < 34 && last === now && !petals.started ? Math.random() * h : undefined));
      petals.started = true;
      for (const p of petals) {
        p.y += p.vy * dt; p.ph += p.sway * dt; p.rot += p.vr * dt; p.flip += 2.2 * dt;
        p.x += Math.sin(p.ph) * w * 0.02 * dt * 3;
        if (p.y > h + 20) Object.assign(p, petal());
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.flip)));
        ctx.fillStyle = p.c; ctx.globalAlpha = 0.92;
        ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.62, 0, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 0.35; ctx.fillStyle = "#b8460a";
        ctx.beginPath(); ctx.ellipse(-p.s * 0.35, 0, p.s * 0.35, p.s * 0.18, 0, 0, 6.3); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (run) raf = requestAnimationFrame(step);
    }
    addEventListener("resize", size);
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !run) { size(); run = true; last = 0; raf = requestAnimationFrame(step); }
      else if (!en.isIntersecting && run) { run = false; cancelAnimationFrame(raf); }
    }).observe(fig);
  })();

  measure();

  /* ---------- 5. one stop per swipe: the finger moves the page directly; a flick glides to the next stop only */
  (() => {
    const root = document.documentElement;
    const maxY = () => root.scrollHeight - innerHeight;
    const stops = () => $$(".snap").map((s) => s.getBoundingClientRect().top + scrollY).sort((a, b) => a - b);
    let anim = 0;
    const stopGlide = () => { if (anim) { cancelAnimationFrame(anim); anim = 0; } };
    function glide(to) {
      stopGlide();
      const from = scrollY, dist = to - from;
      if (Math.abs(dist) < 1) return;
      const inHand = Math.min(from, to) >= cardTop - 2 && Math.max(from, to) <= handEnd() + 2;
      const dur = reduce ? 1 : inHand ? 1300 : Math.min(950, 380 + Math.abs(dist) * 0.45);   // the dissolve plays slowly
      const t0 = performance.now();
      const ease = inHand ? (k) => k * k * (3 - 2 * k) : (k) => 1 - Math.pow(1 - k, 3);   // dissolve: gentle in and out
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        scrollTo(0, from + dist * ease(k));
        anim = k < 1 ? requestAnimationFrame(step) : 0;
      };
      anim = requestAnimationFrame(step);
    }
    function nextStop(pos, dir) {                      // the first stop beyond pos in the direction of travel
      const s = stops();
      if (!s.length) return pos;
      if (dir > 0) return s.find((y) => y > pos + 2) ?? s[s.length - 1];
      for (let i = s.length - 1; i >= 0; i--) if (s[i] < pos - 2) return s[i];
      return s[0];
    }
    const nearestStop = (pos) => stops().reduce((b, y) => (Math.abs(y - pos) < Math.abs(b - pos) ? y : b), 0);

    // touch
    let dragging = false, sy0 = 0, fy0 = 0, samples = [], native = false;
    const handEnd = () => cardTop + unit * HAND;
    // in the images: normal scrolling — except a backward swipe near the top, which pages back into the opening
    const free = (pos, dir) => pos >= handEnd() - 2 && !(dir < 0 && pos <= handEnd() + unit * 0.5);
    // never rest half-way through the dissolve: settle on whichever end is nearer once scrolling stops
    let settleT = 0;
    addEventListener("scroll", () => {
      clearTimeout(settleT);
      settleT = setTimeout(() => {
        const y = scrollY, a = cardTop, b = handEnd();
        if (!dragging && !anim && y > a + 2 && y < b - 2) glide(y - a < b - y ? a : b);
      }, 140);
    }, { passive: true });
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { dragging = false; return; }
      stopGlide();
      dragging = true;
      native = false;
      sy0 = scrollY;
      fy0 = e.touches[0].clientY;
      samples = [[performance.now(), fy0]];
    }, { passive: true });
    document.addEventListener("touchmove", (e) => {
      if (!dragging || e.touches.length !== 1) return;    // two fingers: leave pinch-zoom alone
      const y = e.touches[0].clientY;
      if (native || free(sy0, fy0 - y)) { native = true; return; }
      e.preventDefault();
      samples.push([performance.now(), y]);
      if (samples.length > 8) samples.shift();
      scrollTo(0, Math.max(0, Math.min(maxY(), sy0 + (fy0 - y))));
    }, { passive: false });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      if (native) return;
      const now = performance.now();
      const recent = samples.filter(([t]) => now - t < 120);
      let v = 0;                                           // px per ms, + = forward (finger moving up)
      if (recent.length >= 2) {
        const [ta, ya] = recent[0], [tb, yb] = recent[recent.length - 1];
        v = (ya - yb) / Math.max(1, tb - ta);
      }
      if (v < -0.25 && sy0 > handEnd() + 2) { glide(handEnd()); return; } // back from inside the images → top of the first image
      if (Math.abs(v) > 0.25) {                                          // flick → one stop on from where it started
        const s = stops();
        if (!s.length) return;
        let i0 = 0;
        s.forEach((y, i) => { if (Math.abs(y - sy0) < Math.abs(s[i0] - sy0)) i0 = i; });
        const i = Math.max(0, Math.min(s.length - 1, i0 + Math.sign(v)));
        glide(s[i]);
      } else if (scrollY !== sy0) glide(nearestStop(scrollY));           // slow drag → settle on the nearest
    };
    document.addEventListener("touchend", release, { passive: true });
    document.addEventListener("touchcancel", release, { passive: true });

    // mouse wheel / trackpad: one stop per gesture (the rest of a trackpad's inertia is swallowed)
    let lastWheel = 0, acc = 0, used = false;
    addEventListener("wheel", (e) => {
      if (e.ctrlKey || free(scrollY, e.deltaY)) return;   // pinch-zoom, or scrolling the images
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 200) { acc = 0; used = false; }
      lastWheel = now;
      if (used || anim) return;
      acc += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      if (Math.abs(acc) >= 40) {
        used = true;
        glide(nextStop(scrollY, Math.sign(acc)));
      }
    }, { passive: false });

    // keyboard
    addEventListener("keydown", (e) => {
      const map = { ArrowDown: 1, PageDown: 1, " ": e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 };
      const dir = map[e.key];
      if (!dir || free(scrollY, dir) || e.target.closest("input, textarea, select, button, a")) return;
      e.preventDefault();
      glide(nextStop(scrollY, dir));
    });
  })();

})();
