/* Goldbiss Original — Interaktionen */
(function () {
  "use strict";
  var hdr = document.getElementById("hdr");
  var onScroll = function () { hdr.classList.toggle("is-solid", window.scrollY > 40); };
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");
  var setMenu = function (o) { hdr.classList.toggle("menu-open", o); menu.classList.toggle("open", o); burger.setAttribute("aria-expanded", o ? "true" : "false"); };
  burger.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });

  document.querySelectorAll("a[data-scroll]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      var t = href === "#top" ? document.body : document.querySelector(href);
      if (!t) return; e.preventDefault(); setMenu(false);
      t.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.forEach(function (e) { e.classList.add("in"); });
  } else {
    var raf = 0;
    var reveal = function () {
      var h = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function (e) { if (!e.classList.contains("in") && e.getBoundingClientRect().top < h * 0.9) e.classList.add("in"); });
    };
    var onR = function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(reveal); };
    reveal(); window.addEventListener("scroll", onR, { passive: true }); window.addEventListener("resize", onR);
    setTimeout(function () { els.forEach(function (e) { e.classList.add("in"); }); }, 2200);
  }

  var ti = (new Date().getDay() + 6) % 7;
  var row = document.querySelector('#hours-tbl tr[data-day="' + ti + '"]');
  if (row) { row.classList.add("today"); var c = row.querySelector("td"); c.textContent += " · Heute"; }

  var form = document.getElementById("contact-form");
  var ok = document.getElementById("form-ok");
  var setErr = function (n, m) { var f = form.querySelector('[data-field="' + n + '"]'); if (!f) return; f.classList.toggle("err", !!m); var s = f.querySelector(".msg"); if (s) s.textContent = m || ""; };
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form), valid = true;
    var name = (d.get("name") || "").trim(), email = (d.get("email") || "").trim(), msg = (d.get("message") || "").trim();
    if (!name) { setErr("name", "Bitte gib deinen Namen ein."); valid = false; } else setErr("name", "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr("email", "Bitte gültige E-Mail eingeben."); valid = false; } else setErr("email", "");
    if (!msg) { setErr("message", "Bitte schreib uns kurz dein Anliegen."); valid = false; } else setErr("message", "");
    if (valid) { form.style.display = "none"; ok.style.display = "block"; }
  });
  document.getElementById("form-reset").addEventListener("click", function () {
    form.reset(); ["name", "email", "message"].forEach(function (n) { setErr(n, ""); });
    ok.style.display = "none"; form.style.display = "block";
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
