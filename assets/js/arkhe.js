/* ═══════════════════════════════════════════════════════════════════════════
   ARKHÉ — runtime
   UNE seule boucle requestAnimationFrame pilotée par gsap.ticker.
   Repli sans JS : tout le contenu est dans le HTML.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const doc = document;
  const html = doc.documentElement;
  html.classList.remove("no-js");

  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ── Mouvement réduit (persistant) ─────────────────────────────────────────
  const motionKey = "arkhe:reduced-motion";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let reduced = store.get(motionKey, prefersReduced ? "1" : "0") === "1";

  function applyMotion() {
    doc.body.classList.toggle("reduced-motion", reduced);
    const btn = doc.getElementById("motion-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", reduced ? "true" : "false");
      const lab = doc.getElementById("motion-label");
      if (lab) lab.textContent = reduced ? "Mouvement normal" : "Mouvement réduit";
    }
    if (reduced && window.__arkheLenis) { window.__arkheLenis.destroy(); window.__arkheLenis = null; }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  const motionBtn = doc.getElementById("motion-toggle");
  if (motionBtn) motionBtn.addEventListener("click", () => {
    reduced = !reduced; store.set(motionKey, reduced ? "1" : "0"); applyMotion();
    if (!reduced) initLenis();
  });

  // ── Tiroir ────────────────────────────────────────────────────────────────
  const drawer = doc.getElementById("drawer");
  const menuBtn = doc.querySelector(".btn-menu");
  let lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = doc.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    doc.body.style.overflow = "hidden";
    const f = drawer.querySelector(".btn-close");
    if (f) f.focus();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    doc.body.style.overflow = "";
    setTimeout(() => { drawer.hidden = true; }, 420);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (menuBtn) menuBtn.addEventListener("click", () => {
    drawer && drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
  });
  if (drawer) {
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer || e.target.closest("[data-close-drawer]")) closeDrawer();
    });
    doc.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
      if (e.key === "Tab" && drawer.classList.contains("is-open")) {
        const items = drawer.querySelectorAll("a,button");
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  // ── En-tête : masquage au défilement + barre de progression ───────────────
  const header = doc.getElementById("site-header");
  const progressBar = doc.getElementById("header-progress-bar");
  let lastY = 0;

  function onScrollHeader() {
    const y = window.scrollY || 0;
    if (header) {
      header.classList.toggle("is-solid", y > 24);
      if (!drawer || !drawer.classList.contains("is-open")) {
        header.classList.toggle("is-hidden", y > 420 && y > lastY + 4);
      }
    }
    lastY = y;
    if (progressBar) {
      const h = doc.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + "%";
    }
  }

  // ── Lenis ─────────────────────────────────────────────────────────────────
  function initLenis() {
    if (reduced || !window.Lenis) return;
    const lenis = new window.Lenis({ duration: 1.15, smoothWheel: true,
      touchMultiplier: 1.6, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    window.__arkheLenis = lenis;
    lenis.on("scroll", () => { if (window.ScrollTrigger) ScrollTrigger.update(); onScrollHeader(); });
    return lenis;
  }

  // ── Révélations au défilement (repli si GSAP absent) ──────────────────────
  function initReveals() {
    const items = doc.querySelectorAll("[data-reveal], .reveal");
    if (!items.length) return;
    if (!window.gsap || !window.ScrollTrigger || reduced) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    items.forEach((el) => {
      window.gsap.to(el, {
        opacity: 1, y: 0, duration: 1.05, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
      el.style.opacity = "0";
    });
  }

  // ── Titres en lignes (SplitText) ──────────────────────────────────────────
  function initSplitTitles() {
    if (!window.gsap || !window.SplitText || reduced) return;
    const heads = doc.querySelectorAll(".hero-title, .section-title, .salle-title");
    heads.forEach((h) => {
      try {
        const split = new window.SplitText(h, { type: "lines", mask: "lines", linesClass: "split-line" });
        window.gsap.from(split.lines, {
          yPercent: 118, duration: 1.25, ease: "expo.out", stagger: 0.09, delay: 0.12
        });
      } catch (e) { /* le texte reste visible */ }
    });
  }

  // ── Compteurs animés ──────────────────────────────────────────────────────
  function initCounters() {
    const els = doc.querySelectorAll(".stat-value[data-target]");
    if (!els.length) return;
    const run = (el) => {
      const target = parseFloat(el.getAttribute("data-target")) || 0;
      const dec = (el.getAttribute("data-target").split(".")[1] || "").length;
      if (!window.gsap || reduced) { el.textContent = target.toFixed(dec).replace(".", ","); return; }
      const o = { v: 0 };
      window.gsap.to(o, { v: target, duration: 2.2, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate() { el.textContent = o.v.toFixed(dec).replace(".", ","); } });
    };
    if (window.ScrollTrigger) {
      els.forEach((el) => window.ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => run(el) }));
    } else els.forEach(run);
  }

  // ── Comparateur avant/après ───────────────────────────────────────────────
  function initComparators() {
    doc.querySelectorAll("[data-comparateur]").forEach((cmp) => {
      const handle = doc.createElement("span");
      handle.className = "cmp-handle";
      cmp.appendChild(handle);
      const set = (v) => {
        const p = Math.max(0, Math.min(100, v));
        cmp.style.setProperty("--split", p + "%");
        handle.style.left = p + "%";
      };
      set(50);
      let dragging = false;
      const fromEvent = (e) => {
        const r = cmp.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        set((x / r.width) * 100);
      };
      cmp.addEventListener("pointerdown", (e) => { dragging = true; cmp.setPointerCapture(e.pointerId); fromEvent(e); });
      cmp.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
      cmp.addEventListener("pointerup", () => { dragging = false; });
      cmp.addEventListener("pointercancel", () => { dragging = false; });
      cmp.tabIndex = 0;
      cmp.addEventListener("keydown", (e) => {
        const cur = parseFloat(getComputedStyle(cmp).getPropertyValue("--split")) || 50;
        if (e.key === "ArrowLeft") { set(cur - 4); e.preventDefault(); }
        if (e.key === "ArrowRight") { set(cur + 4); e.preventDefault(); }
      });
    });
  }

  // ── Accordéon « question honnête » (accessibilité) ────────────────────────
  function initDetails() {
    doc.querySelectorAll("details").forEach((d) => {
      d.addEventListener("toggle", () => {
        if (d.open) {
          d.querySelectorAll("details[open]").forEach((o) => { if (o !== d) o.open = false; });
        }
      });
    });
  }

  // ── Lecteur audio global ──────────────────────────────────────────────────
  const AudioCtl = (function () {
    let audio = null, hud = null, seek = null, titleEl = null, subEl = null, playBtn = null;
    let chapters = [], current = -1;

    function ensure() {
      if (audio) return audio;
      audio = new Audio();
      audio.preload = "none";
      hud = doc.getElementById("audio-hud");
      seek = doc.getElementById("hud-seek");
      titleEl = doc.getElementById("hud-title");
      subEl = doc.getElementById("hud-sub");
      playBtn = doc.getElementById("hud-play");
      if (playBtn) playBtn.addEventListener("click", toggle);
      if (seek) seek.addEventListener("input", () => { if (audio) audio.currentTime = (seek.value / 100) * audio.duration; });
      const close = doc.getElementById("hud-close");
      if (close) close.addEventListener("click", stop);
      audio.addEventListener("timeupdate", () => {
        if (audio.duration && seek) seek.value = (audio.currentTime / audio.duration) * 100;
      });
      audio.addEventListener("ended", stop);
      return audio;
    }
    function play(src, title, sub, chaps) {
      const a = ensure();
      chapters = chaps || [];
      a.src = src;
      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = sub || "";
      a.play().catch(() => {});
      if (hud) hud.hidden = false;
      if (playBtn) playBtn.textContent = "Pause";
      current = -1;
    }
    function toggle() {
      const a = ensure();
      if (!a.src) return;
      if (a.paused) { a.play(); if (playBtn) playBtn.textContent = "Pause"; }
      else { a.pause(); if (playBtn) playBtn.textContent = "Lecture"; }
    }
    function stop() {
      const a = ensure();
      a.pause(); a.removeAttribute("src");
      if (hud) hud.hidden = true;
      if (playBtn) playBtn.textContent = "Lecture";
    }
    return { play, toggle, stop };
  })();
  window.arkheAudio = AudioCtl;

  // Boutons[data-audio]
  const boutonsAudio = Array.from(doc.querySelectorAll("[data-audio]"));
  boutonsAudio.forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const src = b.getAttribute("data-audio");
      // Recliquer sur le bouton qui joue déjà : on met en pause.
      const dejaEnCours = b.getAttribute("data-playing") === "1";
      boutonsAudio.forEach((x) => x.setAttribute("data-playing", "0"));
      if (dejaEnCours) {
        AudioCtl.toggle();
        return;
      }
      AudioCtl.play(src, b.getAttribute("data-audio-title") || "Narration",
        b.getAttribute("data-audio-sub") || "");
      b.setAttribute("data-playing", "1");
    });
  });

  // ── Interactions « phare » (canvas) ───────────────────────────────────────
  const Interactions = {
    /* Simulateur de constantes : « si c'était un tout petit peu différent » */
    constantes: function (root) {
      root.innerHTML = `
        <div class="simu">
          <div class="simu-controls">
            <label class="simu-ctl">
              <span>Force nucléaire forte</span>
              <input type="range" id="simu-force" min="0" max="100" value="50" aria-describedby="simu-force-desc">
            </label>
            <p class="simu-hint" id="simu-force-desc">Valeur observée : elle maintient la matière
              stable. À gauche, les atomes se disloquent ; à droite, le noyau s'effondre.</p>
            <label class="simu-ctl">
              <span>Constante cosmologique</span>
              <input type="range" id="simu-cosmo" min="0" max="100" value="50">
            </label>
            <p class="simu-hint">Valeur observée : minuscule. Un peu plus grande et les galaxies
              ne se forment pas ; un peu plus petite, l'univers s'effondre très vite.</p>
          </div>
          <div class="simu-view">
            <canvas id="simu-canvas" width="900" height="560" role="img"
              aria-label="Simulation d'un univers dont les constantes varient selon le réglage choisi"></canvas>
            <p class="simu-readout" id="simu-readout" aria-live="polite">Réglage médian : la matière
              se comporte comme dans notre univers.</p>
          </div>
        </div>`;
      const cv = root.querySelector("#simu-canvas");
      const ctx = cv.getContext("2d");
      const readout = root.querySelector("#simu-readout");
      const fForce = root.querySelector("#simu-force");
      const fCosmo = root.querySelector("#simu-cosmo");
      let stars = [], t = 0;

      function seed() {
        stars = [];
        for (let i = 0; i < 260; i++) {
          stars.push({ x: Math.random() * cv.width, y: Math.random() * cv.height,
            r: Math.random() * 1.6 + 0.35, ph: Math.random() * 6.28, sp: 0.4 + Math.random() });
        }
      }
      seed();

      function draw() {
        t += 0.008;
        const force = fForce.value / 100;      // 0..1
        const cosmo = fCosmo.value / 100;
        ctx.clearRect(0, 0, cv.width, cv.height);
        const g = ctx.createRadialGradient(cv.width/2, cv.height/2, 10, cv.width/2, cv.height/2, cv.width*0.72);
        const collapsed = force < 0.28 || cosmo > 0.76;
        const dispersed = force > 0.76 || cosmo < 0.22;
        if (collapsed) g.addColorStop(0, "#5a1c0a"); else if (dispersed) g.addColorStop(0, "#05070d");
        else g.addColorStop(0, "#141a3a");
        g.addColorStop(1, "#05070d");
        ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);

        const cx = cv.width / 2, cy = cv.height / 2;
        stars.forEach((s) => {
          let dx = s.x - cx, dy = s.y - cy, d = Math.hypot(dx, dy) || 1;
          let rr = s.r, a = 0.75;
          if (collapsed) { rr *= (1 - Math.min(1, d / (cv.width*0.28))); }
          else if (dispersed) { dx *= 1.5; dy *= 1.5; a = 0.35; }
          else {
            const pull = 34 / (d * 0.06);
            s.x -= (dx / d) * pull * 0.05 * s.sp;
            s.y -= (dy / d) * pull * 0.05 * s.sp;
            rr *= 1 + Math.sin(t * s.sp + s.ph) * 0.22;
          }
          ctx.beginPath();
          ctx.arc(s.x, s.y, Math.max(0.25, rr), 0, 6.283);
          ctx.fillStyle = "rgba(230,196,106," + a + ")";
          ctx.fill();
        });

        if (collapsed) {
          const p = 1 - force / 0.28;
          const rad = 40 + 90 * p;
          const gg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
          gg.addColorStop(0, "rgba(255,220,150,.95)"); gg.addColorStop(1, "rgba(162,72,43,0)");
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
        }
        if (readout) {
          let msg = "";
          if (collapsed) msg = "Les structures s'effondrent sur elles-mêmes : ni étoiles stables, ni matière ordinaire.";
          else if (dispersed) msg = "La matière se disperse trop vite : aucune galaxie, aucune étoile ne se forme.";
          else msg = "Réglage médian : la matière se comporte comme dans notre univers observable.";
          if (readout.textContent !== msg) readout.textContent = msg;
        }
      }
      function loop() { if (root.isConnected && !doc.body.classList.contains("reduced-motion")) { draw(); requestAnimationFrame(loop); } }
      if (!doc.body.classList.contains("reduced-motion")) loop();
      else { fForce.addEventListener("input", draw); fCosmo.addEventListener("input", draw); draw(); }
      fForce.addEventListener("input", draw);
      fCosmo.addEventListener("input", draw);
      root.querySelector(".simu-controls").addEventListener("input", draw);
    },

    /* Voyage d'échelle — « puissances de dix » */
    echelles: function (root) {
      const data = root.getAttribute("data-echelles");
      let steps = [];
      try { steps = JSON.parse(data || "[]"); } catch (e) { steps = []; }
      if (!steps.length) return;
      root.innerHTML = `
        <div class="ech">
          <canvas id="ech-canvas" width="1000" height="600" role="img"
            aria-label="Voyage visuel de l'univers observable jusqu'à l'échelle du proton"></canvas>
          <div class="ech-ctrl">
            <input type="range" id="ech-range" min="0" max="${steps.length - 1}" value="0"
              aria-label="Niveau d'échelle">
            <p class="ech-readout" id="ech-readout" aria-live="polite"></p>
          </div>
          <ol class="ech-list" id="ech-list"></ol>
        </div>`;
      const cv = root.querySelector("#ech-canvas"), ctx = cv.getContext("2d");
      const range = root.querySelector("#ech-range");
      const readout = root.querySelector("#ech-readout");
      const list = root.querySelector("#ech-list");
      list.innerHTML = steps.map((s, i) =>
        `<li class="ech-item" data-i="${i}"><b>${s.label}</b><span>${s.note}</span></li>`).join("");
      let idx = 0;

      function draw() {
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);
        const s = steps[idx];
        const g = ctx.createRadialGradient(W/2, H/2, 8, W/2, H/2, W*0.62);
        g.addColorStop(0, s.c1 || "#141a3a"); g.addColorStop(1, "#04060c");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // étoiles rondes et douces, sans aigrettes
        for (let i = 0; i < 220; i++) {
          const x = Math.random() * W, y = Math.random() * H;
          const r = Math.random() * 1.7 + 0.3;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283);
          ctx.fillStyle = "rgba(232,217,181," + (0.25 + Math.random() * 0.6) + ")"; ctx.fill();
        }
        // objet central qui change d'échelle
        const k = 1 + (steps.length - idx) * 0.06;
        ctx.save(); ctx.translate(W/2, H/2);
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, 150*k + i*26, 150*k + i*26, 0, 0, 6.283);
          ctx.strokeStyle = "rgba(212,175,55," + (0.24 - i*0.04) + ")";
          ctx.lineWidth = 1.4; ctx.stroke();
        }
        const core = ctx.createRadialGradient(0,0,2,0,0,54*k);
        core.addColorStop(0, "rgba(255,241,205,.95)");
        core.addColorStop(0.4, "rgba(230,196,106,.55)");
        core.addColorStop(1, "rgba(30,42,90,0)");
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0,0,54*k,0,6.283); ctx.fill();
        ctx.restore();
        if (readout) readout.innerHTML = `<b>${s.label}</b> — ${s.note}`;
        list.querySelectorAll(".ech-item").forEach((li, i) => li.classList.toggle("is-on", i === idx));
      }
      range.addEventListener("input", () => { idx = parseInt(range.value, 10); draw(); });
      list.addEventListener("click", (e) => {
        const li = e.target.closest(".ech-item"); if (!li) return;
        idx = parseInt(li.dataset.i, 10); range.value = idx; draw();
      });
      draw();
    },

    /* Frise des prophéties — écart annonce/accomplissement */
    frise: function (root) {
      const data = root.getAttribute("data-frise");
      let items = [];
      try { items = JSON.parse(data || "[]"); } catch (e) { items = []; }
      if (!items.length) { root.innerHTML = "<p class='muted'>Frise indisponible.</p>"; return; }
      root.innerHTML = `
        <div class="frise-wrap">
          <canvas id="fr-canvas" width="1200" height="420" role="img"
            aria-label="Frise reliant chaque annonce prophétique à son accomplissement"></canvas>
          <p class="frise-readout" id="fr-readout" aria-live="polite">Survolez un arc pour le détail.</p>
          <ul class="frise-list" id="fr-list"></ul>
        </div>`;
      const cv = root.querySelector("#fr-canvas"), ctx = cv.getContext("2d");
      const list = root.querySelector("#fr-list"), readout = root.querySelector("#fr-readout");
      list.innerHTML = items.map((it, i) =>
        `<li class="fr-item" data-i="${i}"><b>${it.titre}</b><span>${it.ecart}</span></li>`).join("");
      const hover = { i: -1 };

      function draw() {
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, "rgba(30,58,138,.35)"); g.addColorStop(1, "rgba(212,175,55,.25)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const n = items.length;
        const top = 40, bot = H - 50, gap = (bot - top) / Math.max(1, n - 1);
        items.forEach((it, i) => {
          const y = top + i * gap;
          const x1 = it.x1 * W, x2 = it.x2 * W;
          const active = hover.i === i;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.bezierCurveTo(x1 + (x2-x1)*0.35, y - 46, x2 - (x2-x1)*0.35, y + 46, x2, y);
          ctx.strokeStyle = active ? "#E6C46A" : "rgba(212,175,55,.45)";
          ctx.lineWidth = active ? 3.4 : 1.8;
          ctx.stroke();
          ctx.beginPath(); ctx.arc(x1, y, active ? 8 : 5, 0, 6.283);
          ctx.fillStyle = "#3FA7A0"; ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y, active ? 8 : 5, 0, 6.283);
          ctx.fillStyle = "#D4AF37"; ctx.fill();
        });
      }
      function show(i) {
        hover.i = i; draw();
        if (i < 0) { readout.textContent = "Survolez un arc pour le détail."; return; }
        const it = items[i];
        readout.innerHTML = `<b>${it.titre}</b> — ${it.detail}`;
        list.querySelectorAll(".fr-item").forEach((li, k) => li.classList.toggle("is-on", k === i));
      }
      cv.addEventListener("pointermove", (e) => {
        const r = cv.getBoundingClientRect();
        const y = (e.clientY - r.top) * (cv.height / r.height);
        const n = items.length, top = 40, bot = cv.height - 50, gap = (bot-top)/Math.max(1,n-1);
        let best = -1, bd = 1e9;
        items.forEach((it, i) => { const d = Math.abs(top + i*gap - y); if (d < bd) { bd = d; best = i; } });
        show(bd < 26 ? best : -1);
      });
      cv.addEventListener("pointerleave", () => show(-1));
      list.addEventListener("mouseover", (e) => {
        const li = e.target.closest(".fr-item"); if (li) show(parseInt(li.dataset.i, 10));
      });
      list.addEventListener("mouseleave", () => show(-1));
      draw();
    }
  };

  function initInteractions() {
    doc.querySelectorAll("[data-interaction]").forEach((root) => {
      const id = root.getAttribute("data-interaction");
      const fn = Interactions[id];
      if (fn) { try { fn(root); } catch (e) { console.warn("interaction", id, e); } }
    });
  }

  // ── Recherche plein texte ─────────────────────────────────────────────────
  function initRecherche() {
    const input = doc.getElementById("recherche-input");
    const out = doc.getElementById("recherche-resultats");
    if (!input || !out) return;
    let index = [];
    fetch("assets/js/search-index.json").then(r => r.json()).then(d => { index = d; })
      .catch(() => { out.innerHTML = "<p class='muted'>Index indisponible hors ligne.</p>"; });

    function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    function search(q) {
      const nq = norm(q.trim());
      if (nq.length < 2) return [];
      const toks = nq.split(/\s+/).filter(t => t.length > 1);
      if (!toks.length) return [];
      return index.map(docu => {
        const nt = norm(docu.title + " " + docu.desc + " " + docu.text);
        let score = 0;
        toks.forEach(t => { const c = nt.split(t).length - 1; score += c > 0 ? Math.min(c, 12) : -8; });
        if (nt.includes(nq)) score += 25;
        return { u: docu.url, t: docu.title, d: docu.desc, s: score };
      }).filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 40);
    }
    function render(q) {
      const res = search(q);
      if (!res.length) {
        out.innerHTML = `<p class="muted">${res.length === 0 ? "Aucun résultat pour « " + q + " »." : ""}</p>`;
        return;
      }
      out.innerHTML = `<p class="muted">${res.length} résultat(s) pour « ${q} »</p><ul class="resultats">` +
        res.map(r => `<li><a href="${r.u}"><b>${r.t}</b><span>${r.d}</span></a></li>`).join("") + "</ul>";
    }
    let timer = null;
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => render(input.value), 180); });
    input.addEventListener("search", () => render(input.value));
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  function initQuiz() {
    const quiz = doc.getElementById("quiz");
    if (!quiz) return;
    let qs = [];
    try { qs = JSON.parse(quiz.getAttribute("data-questions") || "[]"); } catch (e) { return; }
    let i = 0, score = 0;
    const body = quiz.querySelector(".quiz-body");

    function render() {
      if (i >= qs.length) {
        body.innerHTML = `<p class="quiz-result">Score : <b>${score} / ${qs.length}</b></p>
          <button class="btn btn-ghost" type="button" id="quiz-reset">Recommencer</button>`;
        const b = body.querySelector("#quiz-reset");
        if (b) b.addEventListener("click", () => { i = 0; score = 0; render(); });
        return;
      }
      const q = qs[i];
      body.innerHTML = `<p class="quiz-q"><b>Question ${i+1}/${qs.length}</b> — ${q.q}</p>
        <ul class="quiz-choices">${q.a.map((a, k) =>
          `<li><button type="button" class="quiz-btn" data-k="${k}">${a}</button></li>`).join("")}</ul>
        <p class="quiz-feedback" aria-live="polite"></p>`;
      body.querySelectorAll(".quiz-btn").forEach((b) => {
        b.addEventListener("click", () => {
          const k = parseInt(b.dataset.k, 10);
          const fb = body.querySelector(".quiz-feedback");
          if (k === q.ok) { score++; fb.textContent = "Exact."; b.classList.add("is-ok"); }
          else { fb.textContent = "Réponse inexacte : " + q.e; b.classList.add("is-ko"); }
          setTimeout(() => { i++; render(); }, 1500);
        });
      });
    }
    render();
  }


  // ── Atlas des merveilles ──────────────────────────────────────────────────
  function initAtlas() {
    const grid = doc.getElementById("atlas-grid");
    if (!grid) return;
    const search = doc.getElementById("atlas-search");
    const filters = doc.getElementById("atlas-filters");
    const count = doc.getElementById("atlas-count");
    let fiches = [];
    let active = "Toutes";

    fetch("assets/js/atlas-index.json").then(r => r.json()).then(d => { fiches = d; setup(); })
      .catch(() => { grid.innerHTML = "<p class='muted'>Atlas indisponible hors ligne.</p>"; });

    function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

    function setup() {
      // onglets de filtre par galerie
      const gal = [];
      fiches.forEach(f => { if (gal.indexOf(f.galerie) < 0) gal.push(f.galerie); });
      const btns = ["Toutes"].concat(gal).map(g => {
        const n = g === "Toutes" ? fiches.length : fiches.filter(f => f.galerie === g).length;
        return `<button type="button" class="filter-btn${g === active ? " is-active" : ""}" data-g="${escAttr(g)}">${escAttr(g)} <span>${n}</span></button>`;
      }).join("");
      filters.innerHTML = btns;
      filters.querySelectorAll(".filter-btn").forEach(b => {
        b.addEventListener("click", () => {
          active = b.dataset.g;
          filters.querySelectorAll(".filter-btn").forEach(x => x.classList.toggle("is-active", x === b));
          render();
        });
      });
      render();
    }

    function escAttr(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

    function render() {
      const q = search ? norm(search.value.trim()) : "";
      const toks = q ? q.split(/\s+/).filter(t => t.length > 1) : [];
      const list = fiches.filter(f => {
        if (active !== "Toutes" && f.galerie !== active) return false;
        if (!toks.length) return true;
        const hay = norm(f.titre + " " + f.latin + " " + f.merveille + " " + f.mecanisme + " " +
                         f.sources + " " + f.chiffres.map(c => c.valeur + " " + c.unite).join(" "));
        return toks.every(t => hay.indexOf(t) >= 0);
      });
      count.textContent = list.length + " merveille" + (list.length > 1 ? "s" : "") +
        (toks.length ? " pour « " + search.value.trim() + " »" : "");
      if (!list.length) {
        grid.innerHTML = "<p class='muted'>Aucune merveille ne correspond à ce critère.</p>";
        return;
      }
      grid.innerHTML = list.map(f => `
        <article class="atlas-card reveal" data-reveal>
          <span class="atlas-galerie">${escAttr(f.galerie_num)} · ${escAttr(f.galerie)}</span>
          <h3 class="atlas-titre">${escAttr(f.titre)}</h3>
          ${f.latin ? `<p class="atlas-latin"><i>${escAttr(f.latin)}</i></p>` : ""}
          <p class="atlas-merveille">${escAttr(f.merveille)}</p>
          ${f.chiffres && f.chiffres.length ? `<ul class="atlas-chiffres">` +
            f.chiffres.map(c => `<li><b>${escAttr(c.valeur)}</b> ${escAttr(c.unite)}</li>`).join("") + "</ul>" : ""}
          <a class="atlas-link" href="cabinet/galerie-${escAttr(f.galerie_slug)}.html#${escAttr(f.slug)}">Lire la fiche →</a>
        </article>`).join("");
      if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        grid.querySelectorAll(".atlas-card").forEach((el) => {
          window.gsap.from(el, { opacity: 0, y: 18, duration: .5, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top bottom-=60" } });
        });
        window.ScrollTrigger.refresh();
      }
    }

    if (search) {
      let timer = null;
      search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 180); });
    }
  }


  // ── three.js : WebGPU/TSL en priorité, repli WebGL2 ────────────────────
  // Chargé en import dynamique : three.module.js est un module ES et ne peut
  // pas être chargé via <script defer>. Aucun appel réseau : le fichier est
  // servi par le site lui-même.
  function initThree() {
    const canvas = doc.querySelector("canvas[data-three], #three-canvas, .three-canvas");
    if (!canvas || !canvas.dataset.scene) return;
    const base = canvas.dataset.base || "assets/vendor/three/";
    (async () => {
      try {
        let THREE, renderer;
        if (navigator.gpu) {
          THREE = await import(base + "three.webgpu.js");
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
            await renderer.init();
          }
        }
        if (!renderer) {
          THREE = await import(base + "three.module.js");
          renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.z = 3.2;
        const geo = new THREE.IcosahedronGeometry(1, 24);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xd4af37, roughness: 0.35, metalness: 0.75,
          emissive: 0x1e3a8a, emissiveIntensity: 0.28,
        });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        scene.add(new THREE.AmbientLight(0x8899ff, 0.35));
        const key = new THREE.DirectionalLight(0xffffff, 2.1);
        key.position.set(2.5, 3, 4);
        scene.add(key);

        const resize = () => {
          const r = canvas.getBoundingClientRect();
          const w = Math.max(1, r.width), h = Math.max(1, r.height);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        const loop = () => {
          mesh.rotation.y += 0.0035;
          mesh.rotation.x += 0.0018;
          renderer.render(scene, camera);
          requestAnimationFrame(loop);
        };
        loop();
        canvas.classList.add("is-ready");
      } catch (e) {
        console.warn("three.js indisponible — repli visuel CSS.", e);
        canvas.classList.add("is-fallback");
      }
    })();
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    applyMotion();
    onScrollHeader();
    initLenis();
    initReveals();
    initSplitTitles();
    initCounters();
    initComparators();
    initDetails();
    initInteractions();
    initRecherche();
    initQuiz();
    initAtlas();
    initThree();

    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger, window.SplitText);
      window.ScrollTrigger.refresh();
      // Parallaxe légère sur les images de fond
      doc.querySelectorAll(".hero-media img, .salle-hero-media img").forEach((img) => {
        window.gsap.to(img, { yPercent: 12, ease: "none",
          scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    }

    // boucle unique
    const tick = (time) => {
      if (window.__arkheLenis) window.__arkheLenis.raf(time);
      if (window.ScrollTrigger) window.ScrollTrigger.update();
      onScrollHeader();
    };
    if (window.gsap) { window.gsap.ticker.add(tick); window.gsap.ticker.lagSmoothing(0); }
    else { const loop = (t) => { if (window.__arkheLenis) window.__arkheLenis.raf(t); requestAnimationFrame(loop); };
           requestAnimationFrame(loop); }

    window.addEventListener("resize", () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, { passive: true });
    doc.body.classList.add("is-ready");
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
