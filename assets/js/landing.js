/* Solia landing — scroll choreography, theme toggle, ambient canvas.
   Port of the Claude Design draft's logic. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── elements + cached layout metrics ─────────────────────────────────── */
  var header = document.getElementById("siteHeader");
  var mark = document.getElementById("headerMark");
  var heroInner = document.getElementById("heroInner");
  var heroTitle = document.getElementById("heroTitle");
  var heroAgent = document.getElementById("heroAgent");
  var heroKicker = document.getElementById("heroKicker");
  var heroTag = document.getElementById("heroTag");
  var heroCue = document.getElementById("heroCue");
  var panel = document.getElementById("panel");
  var heroSvg = heroTitle ? heroTitle.querySelector("svg") : null;

  var metrics = null;
  var baseCenter = null;
  function offTop(el) { return el ? el.getBoundingClientRect().top + window.scrollY : 0; }
  function measure() {
    metrics = {
      headerH: header ? header.offsetHeight : 68,
      panelTop: offTop(panel),
      appTop: offTop(document.getElementById("schedule")),
      whyTop: offTop(document.getElementById("why")),
      founderTop: offTop(document.getElementById("founder")),
      soonTop: offTop(document.getElementById("soon"))
    };
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ── dots state ───────────────────────────────────────────────────────── */
  var dots = {};
  Array.prototype.forEach.call(document.querySelectorAll(".dots a[data-dot]"), function (a) {
    dots[a.getAttribute("data-dot")] = a;
  });
  var activeSection = "";
  function setSection(id) {
    if (id === activeSection) return;
    activeSection = id;
    Object.keys(dots).forEach(function (k) {
      dots[k].classList.toggle("active", k === id);
    });
  }

  /* ── scroll choreography (single rAF-throttled handler) ───────────────── */
  var ticking = false;
  var svgPaused = false;
  var resumeTimer = null;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      var vh = window.innerHeight || 1;
      if (!metrics) measure();

      /* the sun's turbulence/lighting filters are expensive to re-rasterise;
         idle them while the wheel is moving, resume 160ms after it stops */
      if (heroSvg && heroSvg.pauseAnimations && y < vh * 1.2 && !reduceMotion) {
        if (!svgPaused) { heroSvg.pauseAnimations(); svgPaused = true; }
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () {
          heroSvg.unpauseAnimations();
          svgPaused = false;
        }, 160);
      }

      /* header chrome */
      var on = y > vh * 0.55;
      if (header) header.classList.toggle("scrolled", on);

      if (!reduceMotion && heroTitle) {
        /* 1 · SOLIA stays centred in the shrinking gap between the header and
           the incoming panel, scaling down and fading as the gap closes */
        var headerH = metrics.headerH;
        var pTop = Math.min(vh, Math.max(headerH, metrics.panelTop - y));
        if (baseCenter == null) {
          /* measure relative to the sticky container, not the viewport —
             otherwise a measurement taken while scrolled past the hero
             (load restore, resize) records a bogus reference and the
             lockup comes back displaced */
          heroTitle.style.transform = "none";
          var r = heroTitle.getBoundingClientRect();
          var hi = heroInner ? heroInner.getBoundingClientRect().top : 0;
          baseCenter = (r.top - hi) + r.height / 2;
        }
        var gap = Math.max(0, pTop - headerH);
        var t = clamp01(1 - gap / (vh - headerH));
        var dy = (headerH + pTop) / 2 - baseCenter;
        var tf = Math.min(1, t / 0.85);
        heroTitle.style.opacity = Math.pow(1 - tf, 0.85).toFixed(3);
        heroTitle.style.transform =
          "translate3d(0," + dy.toFixed(1) + "px,0) scale(" + (1 - 0.4 * t).toFixed(4) + ")";

        /* 2 · the supporting lines ride with SOLIA (same dy, so the CSS
           margins control their gaps exactly) and leave over the first 30%
           of a screen */
        var s = clamp01(y / (vh * 0.3));
        s = s * s * (3 - 2 * s);
        var sub = Math.pow(1 - s, 1.25).toFixed(3);
        [heroAgent, heroKicker, heroTag, heroCue].forEach(function (el) {
          if (!el) return;
          var isCue = el === heroCue;
          if (isCue) el.style.animation = s > 0.01 ? "none" : "";
          el.style.opacity = sub;
          var off = isCue ? (26 * s) : (dy - 26 * s);
          el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
        });
      }

      /* 3 · dot nav section */
      var sec = "top";
      if (y + vh * 0.45 > metrics.soonTop) sec = "soon";
      else if (y + vh * 0.45 > metrics.appTop) sec = "tour";
      else if (y + vh * 0.45 > metrics.founderTop) sec = "founder";
      else if (y + vh * 0.45 > metrics.whyTop) sec = "overview";
      setSection(sec);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    baseCenter = null;
    metrics = null;
    onScroll();
  }, { passive: true });
  onScroll();

  /* ── reveal-on-scroll ─────────────────────────────────────────────────── */
  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          ro.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ── toolkit toggle: swap copy panel + phone screen together ──────────── */
  var tkTabs = Array.prototype.slice.call(document.querySelectorAll(".tk-tab"));
  tkTabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var k = btn.getAttribute("data-tk");
      tkTabs.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      Array.prototype.forEach.call(document.querySelectorAll(".tk-panel"), function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-tk") === k);
      });
      Array.prototype.forEach.call(document.querySelectorAll("#toolkits .screen"), function (sc) {
        sc.classList.toggle("is-active", sc.getAttribute("data-tk") === k);
      });
    });
  });

  /* ── waitlist (endpoint pending — flips the label for now) ────────────── */
  var form = document.getElementById("waitlistForm");
  var formBtn = document.getElementById("waitlistBtn");
  if (form && formBtn) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      formBtn.textContent = "You're on the list";
    });
  }

  /* ── ambient canvas: drifting motes + twinkling stars ─────────────────── */
  var canvas = document.getElementById("fx");
  if (!canvas || reduceMotion) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var W = 0, H = 0, motes = [], stars = [];

  function seed() {
    motes = []; stars = [];
    var mc = Math.round(Math.min(70, (W * H) / 26000));
    for (var i = 0; i < mc; i++) {
      motes.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.6 + Math.random() * 1.9, v: 0.08 + Math.random() * 0.28,
        sway: Math.random() * 6.28, amp: 0.2 + Math.random() * 0.5,
        a: 0.12 + Math.random() * 0.3
      });
    }
    var sc = Math.round(Math.min(140, (W * H) / 14000));
    for (var j = 0; j < sc; j++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H * 0.75,
        r: 0.4 + Math.random() * 1.1,
        tw: Math.random() * 6.28, twv: 0.008 + Math.random() * 0.02
      });
    }
  }
  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  /* seam star strips: little twinkling star fields floating in the space
     between sections, same look as the hero sky */
  var seams = [];
  Array.prototype.forEach.call(
    document.querySelectorAll(".band + .band:not(.closing)"),
    function (band) {
      var c = document.createElement("canvas");
      c.className = "seam-fx";
      c.setAttribute("aria-hidden", "true");
      band.appendChild(c);
      var sctx = c.getContext("2d");
      if (sctx) seams.push({ el: c, ctx: sctx, stars: [], w: 0, h: 0 });
    }
  );

  var soonFx = document.querySelector(".soon-fx");
  if (soonFx) {
    var soonCtx = soonFx.getContext("2d");
    if (soonCtx) seams.push({ el: soonFx, ctx: soonCtx, stars: [], w: 0, h: 0, dense: true });
  }

  function seedSeam(s) {
    s.stars = [];
    /* width-based with a floor so narrow phones still get a real field
       (area-based counts collapsed to ~5 stars on a 390px strip) */
    var n = Math.round(Math.min(s.dense ? 180 : 90, Math.max(16, (s.w / 22) * (s.dense ? 2.4 : 1))));
    for (var i = 0; i < n; i++) {
      var y = Math.random() * s.h;
      s.stars.push({
        x: Math.random() * s.w, y: y,
        r: 0.5 + Math.random() * 1.4,
        /* dim toward the strip's top/bottom so the field dissolves into the page */
        fade: 1 - Math.abs(y - s.h / 2) / (s.h / 2),
        tw: Math.random() * 6.28, twv: 0.016 + Math.random() * 0.032
      });
    }
  }
  function resizeSeams() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    seams.forEach(function (s) {
      s.w = s.el.clientWidth; s.h = s.el.clientHeight;
      s.el.width = Math.round(s.w * dpr);
      s.el.height = Math.round(s.h * dpr);
      s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedSeam(s);
    });
  }

  var visible = !document.hidden;
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    if (visible) requestAnimationFrame(frame);
  });

  function frame() {
    if (!visible) return;
    ctx.clearRect(0, 0, W, H);
    for (var j = 0; j < stars.length; j++) {
      var st = stars[j];
      st.tw += st.twv;
      ctx.globalAlpha = 0.5 * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st.tw)));
      ctx.fillStyle = "#FFF6E0";
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.2832); ctx.fill();
    }
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y -= m.v; m.sway += 0.01; m.x += Math.sin(m.sway) * m.amp * 0.2;
      if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; }
      ctx.globalAlpha = m.a;
      ctx.fillStyle = "#F8B44B";
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (var k = 0; k < seams.length; k++) {
      var s = seams[k];
      var r = s.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      s.ctx.clearRect(0, 0, s.w, s.h);
      for (var q = 0; q < s.stars.length; q++) {
        var ss = s.stars[q];
        ss.tw += ss.twv;
        s.ctx.globalAlpha = 0.75 * ss.fade * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ss.tw)));
        s.ctx.fillStyle = "#FFF6E0";
        s.ctx.beginPath(); s.ctx.arc(ss.x, ss.y, ss.r, 0, 6.2832); s.ctx.fill();
      }
      s.ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", function () {
    resizeCanvas();
    resizeSeams();
  }, { passive: true });
  resizeCanvas();
  resizeSeams();
  requestAnimationFrame(frame);
})();
