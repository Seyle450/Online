/* ===== Café Niki — Vanilla JS ===== */
(function () {
  'use strict';

  /* Header scroll state */
  var hdr = document.querySelector('header');
  function onScroll() {
    hdr.classList.toggle('scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('nav');
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = open ? iconClose() : iconMenu();
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = iconMenu();
    });
  });

  function iconMenu() {
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg>';
  }
  function iconClose() {
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  }

  /* Scroll-Reveal */
  var revEls = Array.from(document.querySelectorAll('.reveal'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    revEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    revEls.forEach(function (el) {
      var d = el.dataset.delay;
      if (d) el.style.transitionDelay = d + 's';
    });
    function check() {
      var trigger = window.innerHeight * 0.92;
      revEls.forEach(function (el) {
        if (el.classList.contains('in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < trigger && r.bottom > 0) el.classList.add('in');
      });
    }
    check();
    var raf = 0;
    window.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); }, { passive: true });
    window.addEventListener('resize', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); });
  }

  /* Guest picker (Booking form) */
  var guestPick = document.querySelector('.guest-pick');
  if (guestPick) {
    guestPick.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        guestPick.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  /* Booking form submit */
  var bookForm = document.getElementById('booking-form');
  if (bookForm) {
    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = bookForm.querySelector('[name="name"]').value.trim();
      var email = bookForm.querySelector('[name="email"]').value.trim();
      var date = bookForm.querySelector('[name="date"]').value;
      var time = bookForm.querySelector('[name="time"]').value;
      var guests = (guestPick.querySelector('.active') || {}).textContent || '2';
      var msgEl = document.getElementById('booking-msg');

      if (!name || !email || !date || !time) {
        msgEl.className = 'f-msg err';
        msgEl.textContent = 'Bitte fülle alle Felder aus, damit wir deinen Tisch vorbereiten können.';
        msgEl.style.display = 'block';
        return;
      }
      var btn = bookForm.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet…'; }
      var fd = new FormData();
      fd.append('name', name); fd.append('email', email);
      fd.append('date', date); fd.append('time', time); fd.append('guests', guests);
      fetch('https://formspree.io/f/maqzlabz', {
        method: 'POST', headers: { 'Accept': 'application/json' }, body: fd,
      }).then(function (r) {
        if (btn) { btn.disabled = false; btn.textContent = 'Reservieren'; }
        if (r.ok) {
          msgEl.className = 'f-msg ok';
          msgEl.textContent = 'Danke, ' + name + '. Deine Anfrage für ' + guests + (guests === '1' ? ' Person' : ' Personen') + ' ist eingegangen — wir bestätigen sie in Kürze per E-Mail.';
        } else {
          msgEl.className = 'f-msg err';
          msgEl.textContent = 'Fehler beim Senden. Bitte versuche es erneut.';
        }
        msgEl.style.display = 'block';
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Reservieren'; }
        msgEl.className = 'f-msg err';
        msgEl.textContent = 'Keine Verbindung. Bitte versuche es erneut.';
        msgEl.style.display = 'block';
      });
    });
  }

  /* Footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
