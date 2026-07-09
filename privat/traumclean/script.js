/* ===== TraumClean — App ===== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Dialog-Helfer: aria-hidden + inert + Scroll-Lock ---- */
  var DIALOGS = ['#mobileNav', '#conceptModal'];
  function updateScrollLock() {
    var open = document.body.classList.contains('nav-open')
      || DIALOGS.some(function (s) { var el = $(s); return el && el.getAttribute('aria-hidden') === 'false'; });
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /* ---- Mobile Navigation ---- */
  function openNav() {
    document.body.classList.add('nav-open');
    $('#navToggle').setAttribute('aria-expanded', 'true');
    var mn = $('#mobileNav'); mn.setAttribute('aria-hidden', 'false'); try { mn.inert = false; } catch (e) {}
    $('#scrim').hidden = false; updateScrollLock();
  }
  function closeNav() {
    document.body.classList.remove('nav-open');
    $('#navToggle').setAttribute('aria-expanded', 'false');
    var mn = $('#mobileNav'); mn.setAttribute('aria-hidden', 'true'); try { mn.inert = true; } catch (e) {}
    $('#scrim').hidden = true; updateScrollLock();
  }

  /* ---- Konzept-Hinweis (nach 15 s, einmal pro Sitzung) ---- */
  function openConcept() {
    $('#conceptBackdrop').hidden = false;
    var m = $('#conceptModal'); m.setAttribute('aria-hidden', 'false'); try { m.inert = false; } catch (e) {}
    $('#conceptClose').focus(); updateScrollLock();
  }
  function closeConcept() {
    if ($('#conceptModal').getAttribute('aria-hidden') !== 'false') return;
    $('#conceptBackdrop').hidden = true;
    var m = $('#conceptModal'); m.setAttribute('aria-hidden', 'true'); try { m.inert = true; } catch (e) {}
    updateScrollLock();
  }
  function initConcept() {
    var seen = false;
    try { seen = sessionStorage.getItem('tc_concept_seen') === '1'; } catch (e) {}
    if (seen) return;
    setTimeout(function attempt() {
      var busy = document.body.classList.contains('nav-open');
      if (busy) { setTimeout(attempt, 8000); return; }
      try { sessionStorage.setItem('tc_concept_seen', '1'); } catch (e) {}
      openConcept();
    }, 15000);
  }

  /* ---- Reveal beim Scrollen ---- */
  function initReveal() {
    var els = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---- Aktiver Navigationspunkt ---- */
  function initScrollSpy() {
    var links = {}; $$('.nav-desktop .nav-link').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var secs = $$('main section[id]');
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          if (links[en.target.id]) links[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { obs.observe(s); });
  }

  /* ---- Google Maps erst nach Einwilligung (DSGVO-Zwei-Klick) ---- */
  function initMap() {
    var btn = $('#mapLoadBtn'); if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.className = 'map-frame';
      f.title = 'Karte: TraumClean, Hauptstraße 44, 27729 Hambergen';
      f.src = this.getAttribute('data-map-src');
      f.setAttribute('loading', 'lazy');
      f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      f.setAttribute('allowfullscreen', '');
      var c = $('#mapConsent'); c.parentNode.replaceChild(f, c);
    });
  }

  /* ---- Kontaktformular (Demo — sendet nicht) ---- */
  function initForm() {
    $('#contactForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!this.checkValidity()) { this.reportValidity(); return; }
      $('#formSuccess').hidden = false;
      this.querySelector('button[type="submit"]').disabled = true;
      this.reset();
    });
  }

  /* ---- Init ---- */
  function init() {
    $('#year').textContent = new Date().getFullYear();

    $('#navToggle').addEventListener('click', function () {
      document.body.classList.contains('nav-open') ? closeNav() : openNav();
    });
    $$('#mobileNav a').forEach(function (a) { a.addEventListener('click', closeNav); });
    $('#scrim').addEventListener('click', closeNav);
    $('#conceptClose').addEventListener('click', closeConcept);
    $('#conceptBackdrop').addEventListener('click', closeConcept);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeNav(); closeConcept(); } });

    // geschlossene Dialoge initial aus der Tab-Reihenfolge nehmen
    DIALOGS.forEach(function (s) { var el = $(s); if (el && el.getAttribute('aria-hidden') !== 'false') { try { el.inert = true; } catch (e) {} } });

    var header = $('#siteHeader');
    window.addEventListener('scroll', function () { header.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

    initReveal();
    initScrollSpy();
    initMap();
    initForm();
    initConcept();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
