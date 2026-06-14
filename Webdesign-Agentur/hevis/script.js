/* ============ Hevi's Café — Interaktionen ============ */
(function () {
  "use strict";

  /* ---------- Header: solider Zustand beim Scrollen ---------- */
  var hdr = document.getElementById("hdr");
  var onScroll = function () {
    if (window.scrollY > 40) hdr.classList.add("is-solid");
    else hdr.classList.remove("is-solid");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile-Menü ---------- */
  var burger = document.getElementById("burger");
  var mobileMenu = document.getElementById("mobileMenu");
  var setMenu = function (open) {
    hdr.classList.toggle("menu-open", open);
    mobileMenu.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  };
  burger.addEventListener("click", function () {
    setMenu(!mobileMenu.classList.contains("open"));
  });

  /* ---------- Smooth-Scroll für interne Links ---------- */
  document.querySelectorAll("a[data-scroll]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      var target = href === "#top" ? document.body : document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Scroll-Reveal ---------- */
  var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    els.forEach(function (e) { e.classList.add("in"); });
  } else {
    var reveal = function () {
      var h = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function (e) {
        if (e.classList.contains("in")) return;
        if (e.getBoundingClientRect().top < h * 0.9) e.classList.add("in");
      });
    };
    var raf = 0;
    var onR = function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(reveal); };
    reveal();
    window.addEventListener("scroll", onR, { passive: true });
    window.addEventListener("resize", onR);
    setTimeout(function () { els.forEach(function (e) { e.classList.add("in"); }); }, 2200);
  }

  /* ---------- Öffnungszeiten: heutigen Tag hervorheben ---------- */
  var todayIdx = (new Date().getDay() + 6) % 7; // Mo=0
  var todayRow = document.querySelector('#hours-tbl tr[data-day="' + todayIdx + '"]');
  if (todayRow) {
    todayRow.classList.add("today");
    var firstCell = todayRow.querySelector("td");
    firstCell.textContent = firstCell.textContent + " · Heute";
  }

  /* ---------- Kontaktformular ---------- */
  var form = document.getElementById("contact-form");
  var formOk = document.getElementById("form-ok");

  var setFieldError = function (name, msg) {
    var field = form.querySelector('[data-field="' + name + '"]');
    if (!field) return;
    field.classList.toggle("err", !!msg);
    var slot = field.querySelector(".msg");
    if (slot) slot.textContent = msg || "";
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var name = (data.get("name") || "").trim();
    var email = (data.get("email") || "").trim();
    var message = (data.get("message") || "").trim();
    var ok = true;

    if (!name) { setFieldError("name", "Bitte gib deinen Namen ein."); ok = false; }
    else setFieldError("name", "");

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setFieldError("email", "Bitte gültige E-Mail eingeben."); ok = false; }
    else setFieldError("email", "");

    if (!message) { setFieldError("message", "Bitte schreib uns kurz dein Anliegen."); ok = false; }
    else setFieldError("message", "");

    if (ok) {
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet…'; }
      fetch('https://formspree.io/f/mojzpynj', {
        method: 'POST', headers: { 'Accept': 'application/json' }, body: data,
      }).then(function (r) {
        if (r.ok) { form.style.display = 'none'; formOk.style.display = 'block'; }
        else { if (btn) { btn.disabled = false; btn.textContent = 'Senden'; } setFieldError('message', 'Fehler beim Senden. Bitte versuche es erneut.'); }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Senden'; }
        setFieldError('message', 'Keine Verbindung. Bitte versuche es erneut.');
      });
    }
  });

  document.getElementById("form-reset").addEventListener("click", function () {
    form.reset();
    ["name", "email", "message"].forEach(function (n) { setFieldError(n, ""); });
    formOk.style.display = "none";
    form.style.display = "block";
  });

  /* ---------- Footer-Jahr ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
