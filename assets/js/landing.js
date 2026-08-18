/* Solia landing — scroll choreography, theme toggle, ambient canvas.
   Port of the Claude Design draft's logic. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── elements + cached layout metrics ─────────────────────────────────── */
  var header = document.getElementById("siteHeader");
  var mark = document.getElementById("headerMark");
  var heroTitle = document.getElementById("heroTitle");
  var heroKicker = document.getElementById("heroKicker");
  var heroTag = document.getElementById("heroTag");
  var heroCue = document.getElementById("heroCue");
  var panel = document.getElementById("panel");
  var tour = document.getElementById("tour");
  var railFill = document.getElementById("railFill");
  var steps = Array.prototype.slice.call(document.querySelectorAll(".tour-step"));
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
  var STEP_COUNT = steps.length || 1;
  var heroSvg = heroTitle ? heroTitle.querySelector("svg") : null;

  var metrics = null;
  var baseCenter = null;
  function offTop(el) { return el ? el.getBoundingClientRect().top + window.scrollY : 0; }
  function measure() {
    metrics = {
      headerH: header ? header.offsetHeight : 68,
      panelTop: offTop(panel),
      tourTop: offTop(tour),
      tourH: tour ? tour.offsetHeight : 1,
      whyTop: offTop(document.getElementById("why")),
      whatTop: offTop(document.getElementById("what")),
      founderTop: offTop(document.getElementById("founder")),
      soonTop: offTop(document.getElementById("soon"))
    };
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ── tour + dots state ────────────────────────────────────────────────── */
  var activeStep = -1;
  function setStep(i) {
    if (i === activeStep) return;
    activeStep = i;
    steps.forEach(function (el) {
      var j = parseInt(el.getAttribute("data-step"), 10);
      el.classList.toggle("is-active", j === i);
      el.classList.toggle("is-before", j < i);
    });
    screens.forEach(function (el) {
      el.classList.toggle("is-active", parseInt(el.getAttribute("data-step"), 10) === i);
    });
    if (railFill) {
      railFill.style.top = (i * (100 / STEP_COUNT)).toFixed(2) + "%";
      railFill.style.height = (100 / STEP_COUNT).toFixed(2) + "%";
    }
  }
  setStep(0);

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
          heroTitle.style.transform = "none";
          var r = heroTitle.getBoundingClientRect();
          baseCenter = r.top + r.height / 2;
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
        [heroKicker, heroTag, heroCue].forEach(function (el, i) {
          if (!el) return;
          if (i === 2) el.style.animation = s > 0.01 ? "none" : "";
          el.style.opacity = sub;
          var off = i === 2 ? (26 * s) : (dy - 26 * s);
          el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
        });
      }

      /* 3 · tour step from progress through the pinned section */
      if (tour) {
        var travel = Math.max(1, metrics.tourH - vh);
        var p = Math.min(0.9999, Math.max(0, (y - metrics.tourTop) / travel));
        setStep(Math.min(STEP_COUNT - 1, Math.floor(p * STEP_COUNT)));
      }

      /* 4 · dot nav section */
      var sec = "top";
      if (y + vh * 0.45 > metrics.soonTop) sec = "soon";
      else if (y + vh * 0.45 > metrics.tourTop) sec = "tour";
      else if (y + vh * 0.45 > metrics.founderTop) sec = "founder";
      else if (y + vh * 0.45 > metrics.whatTop) sec = "what";
      else if (y + vh * 0.45 > metrics.whyTop) sec = "why";
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
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
  requestAnimationFrame(frame);
})();
