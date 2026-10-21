/* Terms & Agreements page behaviour (2026-10-21): header + reading progress,
   back-to-top, the contents dropdown on small screens, and a scrollspy that
   marks the section you are reading. The page works without it. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var header = document.getElementById("txHeader");
  var progress = document.getElementById("txProgress");
  var topButton = document.getElementById("txTop");
  var toc = document.getElementById("txToc");
  var toggle = document.getElementById("txTocToggle");
  var toggleLabel = toggle ? toggle.textContent : "";

  /* ── contents dropdown (small screens) ──────────────────────────────── */
  function setOpen(open) {
    if (!toc || !toggle) return;
    toc.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }
  if (toggle) toggle.addEventListener("click", function () { setOpen(!toc.classList.contains("open")); });
  if (toc) toc.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") setOpen(false); });

  /* ── scrollspy ──────────────────────────────────────────────────────── */
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll('.tx-toc a[href^="#"]'), function (a) {
    links[a.getAttribute("href").slice(1)] = a;
  });
  var docItems = Array.prototype.slice.call(document.querySelectorAll(".tx-toc-doc"));
  var docs = Array.prototype.slice.call(document.querySelectorAll(".tx-doc"));
  var headings = Array.prototype.slice.call(document.querySelectorAll(".tx-doc h3[id]"));
  var activeSection = null;
  var activeDoc = null;

  function lineY() {
    // the reading line: about a third of the way down the screen, and never
    // above the header (plus the contents bar on small screens)
    var bar = toc && getComputedStyle(toc).position === "sticky" && window.innerWidth <= 960 ? toc.offsetHeight : 0;
    return Math.max((header ? header.offsetHeight : 0) + bar + 32, window.innerHeight * 0.3);
  }

  function spy() {
    var y = lineY();
    var doc = null, section = null;
    for (var i = 0; i < docs.length; i++) { if (docs[i].getBoundingClientRect().top - y <= 0) doc = docs[i]; }
    for (var j = 0; j < headings.length; j++) { if (headings[j].getBoundingClientRect().top - y <= 0) section = headings[j]; }
    if (section && doc && !doc.contains(section)) section = null;

    var docId = doc ? doc.id : null;
    if (docId !== activeDoc) {
      activeDoc = docId;
      docItems.forEach(function (item) { item.classList.toggle("is-active", item.getAttribute("data-doc") === docId); });
      if (toggle) {
        var current = docId && links[docId];
        toggle.textContent = current ? toggleLabel + " · " + current.textContent.replace(/^\d+/, "").trim() : toggleLabel;
      }
    }
    var sectionId = section ? section.id : null;
    if (sectionId !== activeSection) {
      if (activeSection && links[activeSection]) links[activeSection].removeAttribute("aria-current");
      activeSection = sectionId;
      var link = sectionId && links[sectionId];
      if (link) {
        link.setAttribute("aria-current", "true");
        // keep the highlighted entry in view inside the sticky sidebar
        if (toc && window.innerWidth > 960) {
          var box = toc.getBoundingClientRect(), at = link.getBoundingClientRect();
          if (at.top < box.top + 40 || at.bottom > box.bottom - 40) toc.scrollTop += at.top - box.top - box.height / 3;
        }
      }
    }
  }

  /* ── header, progress, back to top ──────────────────────────────────── */
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle("scrolled", y > 8);
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    if (topButton) topButton.classList.toggle("show", y > 900);
    spy();
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
