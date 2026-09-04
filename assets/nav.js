/* ============================================================
   BL.co — nav.js (Global Navigation Component)
   Single source of truth. All nav HTML, behavior, and variants
   owned here. No page layout, no content spacing, no hero
   positioning — just the nav bar.

   Usage: <script src="assets/nav.js"></script>
   Config via body attrs:
     data-page="home"              → active link
     data-nav-variant="default"    → style variant
   ============================================================ */
(function () {
  'use strict';

  /* ── Variant support ─────────────────────────────────────── */
  var variant = document.body.getAttribute('data-nav-variant') || 'default';
  var activePage = document.body.getAttribute('data-page') || '';

  /* ── OG image (auto-inject if missing) ───────────────────── */
  if (!document.querySelector('meta[property="og:image"]')) {
    var ogMeta = document.createElement('meta');
    ogMeta.setAttribute('property', 'og:image');
    ogMeta.setAttribute('content', '/assets/bl-co-logo.jpg');
    document.head.appendChild(ogMeta);
  }

  /* ── Nav HTML (the one source of truth) ──────────────────── */
  var NAV_HTML =
    '<nav class="nav nav--' + variant + '" id="siteNav">' +
      '<div class="nav-inner">' +
        '<a href="index.html" class="logo">BL<span class="dot">.</span>co</a>' +
        '<div class="nav-links">' +
          '<a class="nav-link" data-page="home" href="index.html">Home</a>' +
          '<a class="nav-link" data-page="brands" href="brands.html">Companies</a>' +
          '<a class="nav-link" data-page="projects" href="projects.html">Projects</a>' +
          '<a class="nav-link" data-page="journal" href="journal.html">Journal</a>' +
          '<a class="nav-link" data-page="now" href="now.html">Now</a>' +
          '<a class="nav-link" data-page="about" href="about.html">About</a>' +
          '<a class="nav-link" data-page="contact" href="contact.html">Contact</a>' +
        '</div>' +
        '<div class="nav-right">' +
          '<a href="partner.html" class="btn btn-ghost nav-cta magnetic">Partner With Us</a>' +
          '<button class="nav-burger" id="burgerBtn" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '</div>' +
      '</div>' +
    '</nav>';

  var MOBILE_HTML =
    '<div class="mobile-menu" id="mobileMenu">' +
      '<a data-page="home" href="index.html">Home</a>' +
      '<a data-page="brands" href="brands.html">Companies</a>' +
      '<a data-page="projects" href="projects.html">Projects</a>' +
      '<a data-page="journal" href="journal.html">Journal</a>' +
      '<a data-page="now" href="now.html">Now</a>' +
      '<a data-page="about" href="about.html">About</a>' +
      '<a data-page="contact" href="contact.html">Contact</a>' +
      '<a href="partner.html" class="btn btn-primary">Partner With Us</a>' +
    '</div>';

  /* ── Mount ───────────────────────────────────────────────── */
  var mount = document.getElementById('nav-root');
  if (mount) {
    mount.insertAdjacentHTML('afterend', NAV_HTML + MOBILE_HTML);
    mount.remove();
  } else {
    // Fallback: if no #nav-root, prepend after skip-link or body start
    var skip = document.querySelector('.skip-link');
    if (skip) {
      skip.insertAdjacentHTML('afterend', NAV_HTML + MOBILE_HTML);
    } else {
      document.body.insertAdjacentHTML('afterbegin', NAV_HTML + MOBILE_HTML);
    }
  }

  /* ── Active link ─────────────────────────────────────────── */
  if (activePage) {
    document.querySelectorAll('.nav-link[data-page], .mobile-menu a[data-page]').forEach(function (a) {
      if (a.getAttribute('data-page') === activePage) a.classList.add('is-active');
    });
  }

  /* ── Scroll state (scoped to #siteNav only) ──────────────── */
  var nav = document.getElementById('siteNav');
  if (nav) {
    // Variants that skip scroll background change
    var skipScroll = (variant === 'overlay');
    if (!skipScroll) {
      function onNavScroll() { nav.classList.toggle('scrolled', window.scrollY > 16); }
      window.addEventListener('scroll', onNavScroll, { passive: true });
      onNavScroll();
    }
  }

  /* ── Mobile menu (scoped to #burgerBtn + #mobileMenu) ──── */
  var burger = document.getElementById('burgerBtn');
  var mmenu  = document.getElementById('mobileMenu');
  if (burger && mmenu) {
    function closeMenu() {
      burger.classList.remove('open');
      mmenu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    burger.addEventListener('click', function () {
      var isOpen = mmenu.classList.toggle('open');
      burger.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    mmenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mmenu.classList.contains('open')) closeMenu();
    });
  }
})();