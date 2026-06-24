/* =========================================================
   Grundschule am Halmerweg – SPA-Navigation
   Hash-Routing, Dropdown-Menüs, Mobile-Menü
   ========================================================= */
(function () {
  'use strict';

  var sections = Array.prototype.slice.call(document.querySelectorAll('.section'));
  var validIds = sections.map(function (s) { return s.id; });
  var DEFAULT = 'start';

  var header = document.querySelector('.site-header');
  var burger = document.querySelector('.burger');
  var mobileNav = document.getElementById('mobileNav');

  /* ---- Animation setup ---- */
  var root = document.documentElement;
  // animate only if GSAP is present AND motion is allowed (head script set .anim-on)
  var ANIM = !!window.gsap && root.classList.contains('anim-on');
  // failsafe: GSAP missing but elements were pre-hidden -> reveal them
  if (root.classList.contains('anim-on') && !window.gsap) root.classList.remove('anim-on');

  function animateSection(section) {
    if (!section) return;
    var els = section.querySelectorAll('[data-reveal]');
    if (!ANIM) {
      for (var i = 0; i < els.length; i++) { els[i].style.opacity = ''; els[i].style.transform = ''; els[i].style.visibility = ''; }
      return;
    }
    window.__animOK = true; // disarm failsafe as soon as we start animating
    if (!els.length) return;
    gsap.killTweensOf(els);
    gsap.fromTo(els,
      { autoAlpha: 0, y: 22 },
      {
        autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.05, overwrite: true,
        onComplete: function () {
          for (var i = 0; i < els.length; i++) {
            els[i].removeAttribute('data-reveal'); // animate once; keep visible afterwards
            els[i].style.transform = '';
          }
        }
      }
    );
  }

  /* ---- Routing ---- */
  function currentId() {
    var id = (location.hash || '').replace('#', '');
    return validIds.indexOf(id) !== -1 ? id : DEFAULT;
  }

  function setActiveNav(id) {
    // reset
    document.querySelectorAll('[data-link]').forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); });
    document.querySelectorAll('.nav-item .nav-link').forEach(function (b) { b.classList.remove('active'); });

    // highlight all links pointing to this id
    var match = document.querySelectorAll('[data-link][href="#' + id + '"]');
    match.forEach(function (a) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); });

    // highlight parent dropdown button, if the active link sits inside a dropdown
    document.querySelectorAll('.nav-item[data-dropdown]').forEach(function (item) {
      var inside = item.querySelector('.dropdown a[href="#' + id + '"]');
      if (inside) {
        var btn = item.querySelector('.nav-link');
        if (btn) btn.classList.add('active');
      }
    });
  }

  function showSection(id, doScroll, moveFocus) {
    var active = null;
    sections.forEach(function (s) {
      var on = s.id === id;
      s.classList.toggle('is-active', on);
      if (on) active = s;
    });
    setActiveNav(id);
    document.title = labelFor(id);
    if (doScroll) window.scrollTo({ top: 0, behavior: 'auto' });
    animateSection(active);
    // Screenreader-Fokus auf den neuen Bereich legen (nur bei echter Navigation)
    if (moveFocus && active) {
      try { active.focus({ preventScroll: true }); } catch (e) { active.focus(); }
    }
  }

  function labelFor(id) {
    var base = 'Grundschule am Halmerweg';
    var el = document.querySelector('#' + id + ' h1');
    if (id === DEFAULT || !el) return base + ' – Bremen';
    return el.textContent.trim() + ' · ' + base;
  }

  function route(doScroll, moveFocus) {
    var id = currentId();
    showSection(id, doScroll, moveFocus);
    closeMobile();
    closeAllDropdowns();
  }

  window.addEventListener('hashchange', function () { route(true, true); });

  /* ---- Dropdowns (desktop: hover + click for keyboard/touch) ---- */
  var dropdownItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item[data-dropdown]'));

  function closeAllDropdowns(except) {
    dropdownItems.forEach(function (item) {
      if (item !== except) {
        item.classList.remove('open');
        var btn = item.querySelector('.nav-link');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  dropdownItems.forEach(function (item) {
    var btn = item.querySelector('.nav-link');
    var closeTimer = null;

    item.addEventListener('mouseenter', function () {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      open(item);
    });
    item.addEventListener('mouseleave', function () {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { close(item); closeTimer = null; }, 220);
    });

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      var isOpen = item.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) open(item);
    });

    function open(it) {
      closeAllDropdowns(it);
      it.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close(it) {
      it.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // click outside closes dropdowns
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item[data-dropdown]')) closeAllDropdowns();
  });
  // Esc closes menus
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAllDropdowns(); closeMobile(); }
  });

  /* ---- Mobile menu ---- */
  function closeMobile() {
    if (!mobileNav) return;
    mobileNav.classList.remove('open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var willOpen = !mobileNav.classList.contains('open');
      mobileNav.classList.toggle('open', willOpen);
      burger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  }

  /* ---- Skip-Link: Fokus auf Inhalt, ohne den Hash-Router auszulösen ---- */
  var skip = document.querySelector('.skip-link');
  var main = document.getElementById('main');
  if (skip && main) {
    skip.addEventListener('click', function (e) {
      e.preventDefault();
      main.focus();
      main.scrollIntoView({ block: 'start' });
    });
  }

  /* ---- Kontaktformular: öffnet das E-Mail-Programm (kein Backend nötig) ---- */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('cf-name');
      var email = document.getElementById('cf-email');
      var msg = document.getElementById('cf-msg');
      var hint = document.getElementById('cf-hint');
      hint.className = 'form-hint';
      if (!name.value.trim() || !msg.value.trim() || !email.value.trim() || !email.checkValidity()) {
        hint.textContent = 'Bitte alle Felder ausfüllen und eine gültige E-Mail angeben.';
        hint.classList.add('err');
        var bad = !name.value.trim() ? name : (!email.value.trim() || !email.checkValidity()) ? email : msg;
        bad.focus();
        return;
      }
      var subject = 'Nachricht über die Website – ' + name.value.trim();
      var body = msg.value.trim() + '\n\n— ' + name.value.trim() + '\n' + email.value.trim();
      window.location.href = 'mailto:051@schulverwaltung.bremen.de?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      hint.textContent = 'Ihr E-Mail-Programm wurde geöffnet – bitte die Nachricht dort absenden.';
      hint.classList.add('ok');
      form.reset();
    });
  }

  /* ---- Footer year ---- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Failsafe: falls Animation nie startet, Inhalt sicher zeigen ---- */
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (window.__animOK) return;
      root.classList.remove('anim-on');
      var hidden = document.querySelectorAll('[data-reveal]');
      for (var i = 0; i < hidden.length; i++) {
        hidden[i].style.opacity = '1';
        hidden[i].style.transform = 'none';
        hidden[i].style.visibility = 'visible';
      }
    }, 1500);
  });

  /* ---- Sektionen für Screenreader auszeichnen ---- */
  sections.forEach(function (s) {
    var h = s.querySelector('h1');
    s.setAttribute('tabindex', '-1');
    s.setAttribute('role', 'region');
    if (h) s.setAttribute('aria-label', h.textContent.trim());
  });

  /* ---- Initial render ---- */
  route(false, false);
})();
