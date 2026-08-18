/* Solia landing — scroll choreography + ambient canvas FX. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var heroInner = document.getElementById("heroInner");
  var heroStage = document.getElementById("hero");
  var header = document.querySelector("header.landing-header");

  /* ── scroll choreography ────────────────────────────────────────────────
     Over the hero stage, the giant wordmark scales down and fades while the
     page body slides over the fixed space backdrop. */
  var ticking = false;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t * t * (3 - 2 * t); } /* smoothstep */

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      var vh = window.innerHeight || 1;

      if (header) header.classList.toggle("scrolled", y > vh * 0.55);
      if (reduceMotion) return;

      var travel = Math.max(1, (heroStage ? heroStage.offsetHeight : vh * 1.7) - vh);
      var p = ease(clamp01(y / travel));

      if (heroInner) {
        var tp = clamp01(p / 0.8);
        heroInner.style.opacity = (1 - tp).toFixed(3);
        heroInner.style.transform =
          "translate3d(0," + (-60 * tp).toFixed(1) + "px,0) scale(" + (1 - 0.12 * tp).toFixed(4) + ")";
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── reveal-on-scroll ─────────────────────────────────────────────────── */
  var reveals = document.querySelectorAll(".reveal");
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

  /* ── dot navigation active state ──────────────────────────────────────── */
  var dotFor = {
    hero: "top", what: "what", plan: "plan", coach: "coach",
    train: "train", climb: "climb", connect: "connect", soon: "soon"
  };
  var dots = {};
  document.querySelectorAll(".dots a[data-dot]").forEach(function (a) {
    dots[a.getAttribute("data-dot")] = a;
  });
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var key = dotFor[e.target.id];
        if (!key || !dots[key]) return;
        Object.keys(dots).forEach(function (k) { dots[k].classList.remove("active"); });
        dots[key].classList.add("active");
      });
    }, { rootMargin: "-42% 0px -42% 0px" });
    Object.keys(dotFor).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) so.observe(el);
    });
  }

  /* ── ambient canvas: drifting light motes (+ stars in dark mode) ──────── */
  var canvas = document.getElementById("fx");
  if (!canvas || reduceMotion) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var W = 0, H = 0, DPR = 1, motes = [], stars = [];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    var moteCount = Math.round(Math.min(70, (W * H) / 26000));
    motes = [];
    for (var i = 0; i < moteCount; i++) {
      motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.9,
        v: 0.08 + Math.random() * 0.28,     /* upward drift */
        sway: Math.random() * Math.PI * 2,
        swayAmp: 0.2 + Math.random() * 0.5,
        a: 0.12 + Math.random() * 0.3
      });
    }
    stars = [];
    var starCount = Math.round(Math.min(140, (W * H) / 14000));
    for (var j = 0; j < starCount; j++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.75,        /* keep the horizon clear */
        r: 0.4 + Math.random() * 1.1,
        tw: Math.random() * Math.PI * 2,
        twv: 0.008 + Math.random() * 0.02
      });
    }
  }

  var visible = !document.hidden;
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    if (visible) requestAnimationFrame(frame);
  });

  function frame() {
    if (!visible) return;
    ctx.clearRect(0, 0, W, H);

    {
      for (var j = 0; j < stars.length; j++) {
        var s = stars[j];
        s.tw += s.twv;
        var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.tw));
        ctx.globalAlpha = 0.5 * tw;
        ctx.fillStyle = "#FFF6E0";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
    }

    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y -= m.v;
      m.sway += 0.01;
      m.x += Math.sin(m.sway) * m.swayAmp * 0.2;
      if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; }
      ctx.globalAlpha = m.a;
      ctx.fillStyle = "#F8B44B";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
