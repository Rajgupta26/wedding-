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

  /* ---------- 3. build dynamic sections */
  const [, y, mo, d] = W.date.match(/^(\d{4})-(\d{2})-(\d{2})/) || [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (y) {
    const wd = new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay();
    const big = $("#bigDate");
    big.append(el("span", null, days[wd]), el("b", null, d), el("span", null, `${months[+mo - 1]} ${y}`));
  }

  const evList = $("#eventList");
  W.events.forEach((ev, i) => {
    const card = el("article", "event");
    card.dataset.step = "";
    card.append(
      el("h3", null, ev.title),
      el("p", "sub", ev.subtitle),
      el("p", "row", ev.date || W.dateLabel),
      el("p", "row time", `${ev.time} ${W.timezoneLabel || ""}`.trim()),
      el("p", "row venue", ev.venue),
      el("p", "row addr", ev.address)
    );
    if (ev.map) {
      const a = el("a", "btn btn--small");
      a.href = ev.map;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>';
      a.append("Open Map");
      card.append(a);
    }
    evList.append(card);
  });

  const tl = $("#timeline");
  W.story.forEach((s) => {
    const li = el("li");
    li.dataset.reveal = "";
    li.append(el("span", "yr", s.year), el("h3", null, s.title), el("p", null, s.text));
    tl.append(li);
  });

  /* ---------- 4. countdown */
  const target = new Date(W.date).getTime();
  const cd = {};
  $$("[data-cd]").forEach((b) => (cd[b.dataset.cd] = b));
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    if (s === 0) {
      const box = $("#countdown");
      box.classList.add("ended");
      box.textContent = "The celebration has begun — thank you for being part of our day.";
      return false;
    }
    const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    for (const k in v) {
      const txt = k === "d" ? String(v[k]).padStart(2, "0") : pad(v[k]);
      if (cd[k].textContent !== txt) {
        cd[k].textContent = txt;
        if (!reduce) {
          cd[k].classList.remove("tick");
          void cd[k].offsetWidth;
          cd[k].classList.add("tick");
        }
      }
    }
    return true;
  }
  if (tick()) {
    const iv = setInterval(() => { if (!tick()) clearInterval(iv); }, 1000);
  }

  /* ---------- 5. add to calendar (.ics) */
  $("#calBtn").addEventListener("click", () => {
    const start = new Date(W.date);
    const end = new Date(start.getTime() + 6 * 3600e3);
    const fmt = (dt) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const ev = W.events[W.events.length - 1] || {};
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedding Invitation//EN", "BEGIN:VEVENT",
      `UID:${fmt(start)}-wedding@invitation`, `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(`Wedding of ${W.bride.short} & ${W.groom.short}`)}`,
      `LOCATION:${esc([ev.venue, ev.address].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${esc(W.events.map((e) => `${e.title}: ${e.date || W.dateLabel}, ${e.time} — ${e.venue}`).join("\n"))}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = el("a");
    a.href = url;
    a.download = `${W.bride.short}-${W.groom.short}-wedding.ics`.toLowerCase();
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  /* ---------- 6. pinned pages + card: each page holds still in the card, fades in, (steps,) then dissolves.
     Per frame this only reads scrollY and cached offsets, and only writes transform/opacity — cheap on phones. */
  const FADE = 0.15, HOLD = 0.5, XFADE = 0.18;   // lengths in screens of scrolling
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (v) => v * v * (3 - 2 * v);
  function addStop(parent, t) {                                 // t = screens from the top of parent
    const s = el("i", "snap");
    s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--t", t.toFixed(3));
    parent.append(s);
  }
  // the opening plays in steps: closed curtains, curtains open, mandap complete, full title
  // (its reveal spans 4 screens; intro.js maps that to progress 0 → 1)
  [0, 0.4, 0.72, 1].forEach((p) => addStop($("#home"), p * 4));
  document.documentElement.style.setProperty("--ov", FADE);      // CSS overlap between consecutive pages
  const scenes = $$(".sec").map((sec, idx, all) => {
    const pin = el("div", "sec__pin"), inner = el("div", "sec__inner");
    inner.append(...sec.childNodes);
    pin.append(inner);
    sec.append(pin);
    $$("[data-reveal]", inner).forEach((n, i) => n.style.setProperty("--d", `${(i % 4) * 0.1}s`));
    const steps = $$("[data-step]", inner);
    let dots = [];
    if (steps.length > 1) {
      const wrap = el("div", "step-dots");
      dots = steps.map(() => el("i"));
      wrap.append(...dots);
      steps[0].parentNode.after(wrap);
    }
    const n = Math.max(1, steps.length);
    const last = idx === all.length - 1;
    // the first page appears while the card dissolves in over the opening scene (screens 0.3–0.65 of the hand-off)
    const in0 = idx === 0 ? 0.3 : 0, inl = idx === 0 ? 0.35 : FADE;
    const R = in0 + inl + n * HOLD + (n - 1) * XFADE + (last ? 0 : FADE);
    sec.style.setProperty("--len", (R + 1).toFixed(3));
    // a stop where the page — or each event card — is fully shown and resting
    for (let i = 0; i < n; i++) addStop(sec, in0 + inl + i * (HOLD + XFADE) + HOLD / 2);
    return {
      idx, sec, pin, inner, steps, dots, n, last, R, in0, inl, fit: 1, shown: false, key: "", vis: 0, best: 0, ty: 0, docTop: 0,
      reveals: $$("[data-reveal], [data-letters], [data-draw]", inner),
    };
  });

  const card = $("#card");
  const fitEl = $("#cardFit");
  const flTL = $("#flTL"), flBR = $("#flBR");
  const cardLayers = [$(".card__bg"), $(".card__flowers"), $("#flutter")];
  const introEl = $("#home");
  let introTop = 0, lastVeil = -1, stageFly = null;
  // one "screen" of scrolling = 100lvh, which stays put while mobile toolbars slide in and out
  const probe = el("div");
  probe.style.cssText = "position:absolute;left:0;top:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  const probeS = probe.cloneNode();                      // 100svh: the screen height with the address bar showing
  probeS.style.height = "100vh";
  probeS.style.height = "100svh";
  document.body.append(probeS);
  let unit = innerHeight, cardTop = 0, cardH = 1;

  function measure() {
    unit = probe.offsetHeight || innerHeight;
    cardTop = card.getBoundingClientRect().top + scrollY;
    introTop = introEl.getBoundingClientRect().top + scrollY;
    cardH = card.offsetHeight;
    scenes.forEach((sc) => {
      sc.docTop = sc.sec.getBoundingClientRect().top + scrollY;
      sc.fit = Math.min(1, ((probeS.offsetHeight || innerHeight) * 0.7) / Math.max(1, sc.inner.offsetHeight));   // clear of the corner flowers
      sc.key = "";
    });
    roomKey = "";
    frame();
  }

  function look(node, vis, dir, fit) {
    // vis 0..1; dir: +1 = still arriving (sits a little low), -1 = leaving (drifts a little up)
    const y = (1 - vis) * 26 * dir;
    node.style.opacity = vis.toFixed(3);
    node.style.transform = `translateY(${y.toFixed(1)}px)` + (fit !== undefined ? ` scale(${fit.toFixed(4)})` : "");
    node.classList.toggle("off", vis <= 0.001);
    return y;
  }

  // Where a page actually has ink: each text line, plus solid boxes (medallions, cards, buttons).
  function inkRects(root) {
    const out = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest(".off") ? 1 : 2),
    });
    const range = document.createRange();
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      range.selectNodeContents(n);
      out.push(...range.getClientRects());
    }
    $$(".medallion, .event:not(.off), .countdown > div, .btn, .divider", root).forEach((e) => out.push(e.getBoundingClientRect()));
    return out;
  }
  // How far each corner flower must move so none of that ink sits under it — measured once per page / event card.
  const push = { tl: 0, br: 0 };
  let roomKey = "";
  function flowerRoom(sc) {
    const host = flBR.parentElement.getBoundingClientRect();
    const br = { left: host.left + flBR.offsetLeft + flBR.offsetWidth * 0.12, top: host.top + flBR.offsetTop + flBR.offsetHeight * 0.1 };
    const tl = { right: host.left + flTL.offsetLeft + flTL.offsetWidth * 0.88, bottom: host.top + flTL.offsetTop + flTL.offsetHeight * 0.9 };
    let pTL = 0, pBR = 0;
    for (const r of inkRects(sc.inner)) {
      if (!r.width || !r.height) continue;
      const top = r.top - sc.ty, bottom = r.bottom - sc.ty;   // where it will rest once the fade settles
      if (r.right > br.left && bottom > br.top) pBR = Math.max(pBR, bottom - br.top + 14);
      if (r.left < tl.right && top < tl.bottom) pTL = Math.max(pTL, tl.bottom - top + 14);
    }
    push.tl = Math.min(pTL, flTL.offsetHeight * 0.7);
    push.br = Math.min(pBR, flBR.offsetHeight * 0.7);
  }

  let raf = 0;
  function frame() {
    raf = 0;
    const y = scrollY, vh = innerHeight;
    let lead = null;

    scenes.forEach((sc) => {
      const t = (y - sc.docTop) / unit;                             // screens since this page pinned
      if (t < -1.2 || t > sc.R + 1.2) {                             // far away: keep hidden, skip work
        if (sc.key !== "off") { look(sc.inner, 0, 1, sc.fit); sc.key = "off"; }
        sc.vis = 0;
        return;
      }
      if (!sc.shown && t > sc.in0 - 0.25) {
        sc.shown = true;
        sc.reveals.forEach((r) => r.classList.add("in"));
      }
      const enter = clamp01((t - sc.in0) / sc.inl);
      const exit = sc.last ? 1 : clamp01((sc.R - t) / FADE);
      const vis = smooth(Math.min(enter, exit));
      sc.vis = vis;
      if (vis > 0.05 && (!lead || vis > lead.vis)) lead = sc;
      const dir = enter < 1 ? 1 : exit < 1 ? -1 : 0;
      const key = vis.toFixed(3) + dir + sc.fit + (sc.steps.length > 1 ? t.toFixed(3) : "");
      if (key === sc.key) return;
      sc.key = key;
      sc.ty = look(sc.inner, vis, dir, sc.fit);
      if (sc.steps.length > 1) {
        const s = t - sc.in0 - sc.inl;
        let best = 0, bestV = -1;
        sc.steps.forEach((st, i) => {
          const start = i * (HOLD + XFADE);
          const vin = i === 0 ? 1 : clamp01((s - (start - XFADE)) / XFADE);
          const vout = i === sc.n - 1 ? 1 : clamp01(1 - (s - (start + HOLD)) / XFADE);
          const v = smooth(Math.min(vin, vout));
          look(st, v, vin < 1 ? 1 : vout < 1 ? -1 : 0);
          if (v > bestV) { bestV = v; best = i; }
        });
        sc.best = best;
        sc.dots.forEach((d, i) => d.classList.toggle("on", i === best));
      }
    });

    // the card: hidden until it fills the screen (the intro's veil shows its background meanwhile),
    // a slow zoom while you read, and the pearl flowers blooming in once it is in place
    const top = cardTop - y;
    const tc = -top / unit;                                           // screens since the card reached the top
    const veil = smooth(clamp01(tc / 0.6));
    if (veil !== lastVeil) { lastVeil = veil; cardLayers.forEach((l) => (l.style.opacity = veil.toFixed(3))); }
    const prog = clamp01(-top / Math.max(1, cardH - vh));
    fitEl.style.setProperty("--zoom", (1 + prog * 0.07).toFixed(4));
    const ease = 1 - Math.pow(1 - clamp01((tc - 0.25) / 0.45), 3);
    // the opening scene's own butterflies: in once the mandap is revealed, out as the card takes over
    if (stageFly) {
      const pi = clamp01((y - introTop) / Math.max(1, cardTop - introTop));
      stageFly.show(clamp01((pi - 0.5) / 0.1) * (1 - veil));
    }
    const bloom = (0.6 + 0.4 * ease).toFixed(4);
    flTL.style.scale = flBR.style.scale = bloom;
    flTL.style.opacity = flBR.style.opacity = ease.toFixed(3);
    if (lead) {
      const k = lead.idx + ":" + lead.best;
      if (k !== roomKey) { roomKey = k; flowerRoom(lead); }
    }
    const drift = Math.sin(prog * Math.PI * 6) * 5;
    flTL.style.translate = `${(-drift).toFixed(1)}px ${(-prog * 14 - push.tl).toFixed(1)}px`;
    flBR.style.translate = `${drift.toFixed(1)}px ${(prog * 14 + push.br).toFixed(1)}px`;
  }

  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  addEventListener("resize", measure);
  addEventListener("load", measure);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();

  /* ---------- 7. golden butterflies: a pair over the card, and a pair over the opening scene */
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

  if (!reduce) {
    const cardFly = flock($("#flutter"), 2, "bwg");
    new IntersectionObserver(([en]) => cardFly.go(en.isIntersecting)).observe(card);
    stageFly = flock($("#stageFlutter"), 2, "bws");
    frame();
  }

})();
