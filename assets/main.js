/* ============================================================
   BL.co — main.js  (Performance-Optimised Build)
   Single rAF loop · Passive listeners · No duplicated systems
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover     = window.matchMedia('(pointer:fine)').matches;
  if (reduceMotion) document.documentElement.classList.add('reduced-motion');

  var progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);
  var lastScrollY = -1;
  window.addEventListener('scroll', function () {
    lastScrollY = window.scrollY;
  }, { passive: true });

  /* ── Footer year ───────────────────────────────────────── */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });


  /* ── Nav behavior now handled by assets/nav.js ─────────── */



  /* ── Scroll reveal (IntersectionObserver) ───────────────── */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -64px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ── Lenis smooth scroll ────────────────────────────────── */
  var lenis = null;
  if (window.Lenis && !reduceMotion && canHover) {
    try {
      lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
      // Lenis will be ticked inside the unified rAF loop below
      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        window.gsap.ticker.lagSmoothing(0);
      }
    } catch (e) { lenis = null; }
  }

  /* ── Process timeline ───────────────────────────────────── */
  var track = document.getElementById('processTrack');
  if (track) {
    var fill      = document.getElementById('processFill');
    var indicator = document.getElementById('processIndicator');
    var steps     = Array.prototype.slice.call(track.querySelectorAll('.proc-step'));
    if (window.gsap && window.ScrollTrigger && !reduceMotion) {
      gsap.registerPlugin(ScrollTrigger);
      var tl = gsap.timeline({ scrollTrigger: { trigger: track, start: 'top 78%', end: 'bottom 65%', scrub: 0.6 } });
      var seg = 100 / steps.length;
      steps.forEach(function (step, i) {
        var target = seg * (i + 1);
        tl.to(fill,      { width: target + '%', ease: 'none' }, '<');
        tl.to(indicator, { left:  target + '%', ease: 'none' }, '<');
        tl.call(function () { step.classList.add('active'); }, null, '<+=0.7');
      });
    } else if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            steps.forEach(function (s, i) { setTimeout(function () { s.classList.add('active'); }, i * 160); });
            if (fill) fill.style.width = '100%';
            if (indicator) indicator.style.left = '100%';
            io2.unobserve(entry.target);
          }
        });
      }, { threshold: 0.35 });
      io2.observe(track);
    }
  }

  /* ── Portfolio filter ───────────────────────────────────── */
  var filterBar = document.querySelector('.filter-bar');
  if (filterBar) {
    var chips = Array.prototype.slice.call(filterBar.querySelectorAll('.filter-chip'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-cat]'));
    function applyFilter(f) {
      chips.forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-filter') === f); });
      cards.forEach(function (card) {
        var cats = (card.getAttribute('data-cat') || '').split(' ');
        card.style.display = (f === 'all' || cats.indexOf(f) !== -1) ? '' : 'none';
      });
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () { applyFilter(chip.getAttribute('data-filter')); });
    });
    var hashMatch = window.location.hash.match(/filter=([a-z]+)/);
    if (hashMatch) applyFilter(hashMatch[1]);
  }

  /* ── Form integrations ──────────────────────────────────── */
  // Early access (waitlist) forms
  document.querySelectorAll('.terminal-form, .newsletter').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var emailInput = form.querySelector('input[type="email"]');
      var submitBtn  = form.querySelector('button[type="submit"]');
      if (!emailInput || !submitBtn) return;
      var email        = emailInput.value;
      var originalText = submitBtn.innerText;
      var isTerminal   = form.classList.contains('terminal-form');
      submitBtn.innerText = isTerminal ? 'EXECUTING...' : 'Joining...';
      submitBtn.disabled  = true;
      submitBtn.style.opacity = '0.5';
      try {
        var r    = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        var data = await r.json();
        if (r.ok) {
          emailInput.value       = '';
          emailInput.placeholder = isTerminal ? '[ ACCESS GRANTED ]' : 'Welcome to the ecosystem.';
          if (isTerminal) { emailInput.style.color = '#8fd6a8'; submitBtn.innerText = 'DONE'; }
          else { submitBtn.innerText = 'Success'; submitBtn.style.background = '#8fd6a8'; submitBtn.style.color = '#0a0a0a'; }
        } else {
          alert(data.error || 'Registration failed.');
          submitBtn.innerText  = originalText;
          submitBtn.disabled   = false;
          submitBtn.style.opacity = '1';
        }
      } catch (_) {
        alert('Network offline. Try again later.');
        submitBtn.innerText  = originalText;
        submitBtn.disabled   = false;
        submitBtn.style.opacity = '1';
      }
    });
  });

  // Contact form
  document.querySelectorAll('form.form-grid').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var submitBtn    = form.querySelector('button[type="submit"]');
      if (!submitBtn) return;
      var originalHTML = submitBtn.innerHTML;
      var payload      = Object.fromEntries(new FormData(form).entries());
      submitBtn.innerText = 'Submitting...';
      submitBtn.disabled  = true;
      submitBtn.style.opacity = '0.5';
      try {
        var r    = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        var data = await r.json();
        if (r.ok) {
          form.reset();
          submitBtn.innerText = 'Message Received';
          submitBtn.style.background = '#8fd6a8';
          submitBtn.style.color      = '#0a0a0a';
        } else {
          alert(data.error || 'Submission failed.');
          submitBtn.innerHTML = originalHTML;
          submitBtn.disabled  = false;
          submitBtn.style.opacity = '1';
        }
      } catch (_) {
        alert('Network offline. Try again later.');
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled  = false;
        submitBtn.style.opacity = '1';
      }
    });
  });




  /* ── UNIFIED rAF loop (progress bar) ─── */
  function unifiedLoop() {
    // Progress bar — GPU-accelerated scaleX (zero layout reflow)
    if (lastScrollY !== -1) {
      var h       = document.documentElement;
      var max     = h.scrollHeight - h.clientHeight;
      var percent = max > 0 ? lastScrollY / max : 0;
      progressBar.style.transform = 'scaleX(' + percent.toFixed(4) + ')';
      lastScrollY = -1;
    }

    requestAnimationFrame(unifiedLoop);
  }
  requestAnimationFrame(unifiedLoop);

  /* ── Tilt + spotlight cards ─────────────────────────────── */
  if (canHover && !reduceMotion) {
    document.querySelectorAll('.div-card, .pcard, .culture-card, .value-card, .acard, .brand-row, .term-window').forEach(function (card) {
      card.classList.add('tilt-card');
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width) * 100;
        var py = ((e.clientY - r.top)  / r.height) * 100;
        card.style.setProperty('--mx', px + '%');
        card.style.setProperty('--my', py + '%');
        card.classList.add('spotlight-on');
        card.style.transform = 'perspective(900px) translateY(-5px) rotateX(' + (((50 - py) / 50) * 1.4).toFixed(2) + 'deg) rotateY(' + (((px - 50) / 50) * 1.4).toFixed(2) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.classList.remove('spotlight-on');
        card.style.transform = '';
      });
    });
  }

  /* ── Magnetic buttons ───────────────────────────────────── */
  if (canHover && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* ── Button press feedback ──────────────────────────────── */
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('mousedown', function () { btn.style.transform = (btn.style.transform || '') + ' scale(.97)'; });
    function release() { btn.style.transform = (btn.style.transform || '').replace(' scale(.97)', ''); }
    btn.addEventListener('mouseup',    release);
    btn.addEventListener('mouseleave', release);
  });

  /* ── Count-up numbers ───────────────────────────────────── */
  var countEls = document.querySelectorAll('[data-countup]');
  if (countEls.length && 'IntersectionObserver' in window) {
    var countIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el       = entry.target;
        var target   = parseFloat(el.getAttribute('data-countup'));
        var pad      = el.getAttribute('data-pad') === 'true';
        if (reduceMotion) { el.textContent = pad ? String(target).padStart(2, '0') : target; countIo.unobserve(el); return; }
        var start = null;
        (function step(ts) {
          if (!start) start = ts;
          var p   = Math.min((ts - start) / 1400, 1);
          var val = Math.round((1 - Math.pow(1 - p, 3)) * target);
          el.textContent = pad ? String(val).padStart(2, '0') : String(val);
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
        countIo.unobserve(el);
      });
    }, { threshold: 0.6 });
    countEls.forEach(function (el) { countIo.observe(el); });
  }

  /* ── Footer status strip ────────────────────────────────── */
  document.querySelectorAll('.footer').forEach(function (footer) {
    var top = footer.querySelector('.footer-top');
    if (!top) return;
    var strip = document.createElement('div');
    strip.className = 'status-strip';
    strip.innerHTML =
      '<span class="status-pill"><span class="pulse-dot"></span>All Divisions Operational</span>' +
      '<span class="status-pill">Build Passing</span>' +
      '<span class="status-pill">4 Companies Synced</span>';
    top.insertAdjacentElement('afterend', strip);
  });

  /* ── FAQ animated height ────────────────────────────────── */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var summary = item.querySelector('summary');
    var panel   = item.querySelector('.faq-a');
    if (!summary || !panel) return;
    panel.style.height = item.open ? 'auto' : '0px';
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (item.hasAttribute('open')) {
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(function () { panel.style.height = '0px'; });
        panel.addEventListener('transitionend', function te() { item.removeAttribute('open'); panel.removeEventListener('transitionend', te); }, { once: true });
      } else {
        item.setAttribute('open', '');
        panel.style.height = '0px';
        requestAnimationFrame(function () { panel.style.height = panel.scrollHeight + 'px'; });
        panel.addEventListener('transitionend', function te() { panel.style.height = 'auto'; panel.removeEventListener('transitionend', te); }, { once: true });
      }
    });
  });

  /* ── Terminal typewriter (case study) ───────────────────── */
  document.querySelectorAll('.term-window[data-typewriter]').forEach(function (term) {
    var body  = term.querySelector('.term-body');
    if (!body) return;
    var lines  = Array.prototype.slice.call(body.querySelectorAll('.term-line'));
    var cursor = document.createElement('span'); cursor.className = 'term-cursor';
    var played = false;
    function play() {
      if (played) return; played = true;
      if (reduceMotion) { lines.forEach(function (l) { l.classList.add('shown'); }); lines[lines.length - 1].appendChild(cursor); return; }
      var li = 0;
      (function next() {
        if (li >= lines.length) { lines[lines.length - 1].appendChild(cursor); return; }
        lines[li].classList.add('shown'); li++;
        setTimeout(next, li === 1 ? 260 : 420);
      })();
    }
    if ('IntersectionObserver' in window) {
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { play(); tio.unobserve(term); } });
      }, { threshold: 0.4 });
      tio.observe(term);
    } else { play(); }
  });

  /* ── Segmented control tabs ─────────────────────────────── */
  var projectFilter = document.getElementById('projectFilter');
  if (projectFilter) {
    var segBtns = projectFilter.querySelectorAll('.seg-btn');
    var segPill = projectFilter.querySelector('.seg-pill');
    var projRows = document.querySelectorAll('.proj-row');
    function updatePill(btn) {
      var r  = btn.getBoundingClientRect();
      var pr = projectFilter.getBoundingClientRect();
      segPill.style.width     = r.width + 'px';
      segPill.style.transform = 'translateX(' + (r.left - pr.left) + 'px)';
    }
    var initBtn = projectFilter.querySelector('.seg-btn.active');
    if (initBtn) setTimeout(function () { updatePill(initBtn); }, 100);
    segBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        segBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        updatePill(btn);
        var f = btn.getAttribute('data-filter');
        projRows.forEach(function (row) {
          var cat = row.querySelector('.proj-cat') ? row.querySelector('.proj-cat').textContent.toLowerCase() : '';
          row.style.display = (f === 'all' || cat.indexOf(f) > -1) ? 'grid' : 'none';
        });
      });
    });
  }

  /* ── Dual-mode early access signup ─────────────────────── */
  var toggleClassic  = document.getElementById('toggleClassic');
  var toggleTerminal = document.getElementById('toggleTerminal');
  var signupClassic  = document.getElementById('signupClassic');
  var signupTerminal = document.getElementById('signupTerminal');
  if (toggleClassic && toggleTerminal) {
    toggleClassic.addEventListener('click', function () {
      signupTerminal.style.display = 'none'; signupClassic.style.display = 'block';
      toggleClassic.style.color   = 'var(--white)';    toggleClassic.style.borderColor  = 'var(--border-strong)';
      toggleTerminal.style.color  = 'var(--gray-400)'; toggleTerminal.style.borderColor = 'transparent';
    });
    toggleTerminal.addEventListener('click', function () {
      signupClassic.style.display  = 'none'; signupTerminal.style.display = 'block';
      toggleTerminal.style.color  = 'var(--white)';    toggleTerminal.style.borderColor = 'var(--border-strong)';
      toggleClassic.style.color   = 'var(--gray-400)'; toggleClassic.style.borderColor  = 'transparent';
    });
  }

  /* ── Scramble text ──────────────────────────────────────── */
  var chars = '!<>-_\\/[]{}—=+*^?#________';
  document.querySelectorAll('.scramble-text').forEach(function (el) {
    var orig = el.innerText;
    el.setAttribute('data-original', orig);
    el.innerText = '';
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || el.classList.contains('scrambled')) return;
        el.classList.add('scrambled');
        var frame = 0;
        var queue = orig.split('').map(function (ch) {
          var s = Math.floor(Math.random() * 20);
          return { from: ch, start: s, end: s + Math.floor(Math.random() * 20), char: '' };
        });
        (function loop() {
          var out = '', complete = 0;
          queue.forEach(function (q) {
            if (frame >= q.end) { out += q.from; complete++; }
            else if (frame >= q.start) { if (!q.char || Math.random() < 0.28) q.char = chars[Math.floor(Math.random() * chars.length)]; out += '<span style="color:var(--gray-500);opacity:.7">' + q.char + '</span>'; }
            else out += '';
          });
          el.innerHTML = out;
          if (complete < queue.length) { frame++; requestAnimationFrame(loop); } else el.innerHTML = orig;
        })();
      });
    }, { threshold: 0.5 });
    obs.observe(el);
  });

  /* ── Command palette ────────────────────────────────────── */
  document.body.insertAdjacentHTML('beforeend', [
    '<div class="cmd-palette-overlay" id="cmdOverlay" aria-hidden="true">',
    '  <div class="cmd-palette">',
    '    <div class="cmd-header">',
    '      <svg viewBox="0 0 24 24" fill="none"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '      <input type="text" class="cmd-input" id="cmdInput" placeholder="Search pages, projects..." autocomplete="off">',
    '    </div>',
    '    <div class="cmd-body" id="cmdBody">',
    '      <div class="cmd-group"><span class="cmd-group-label">Pages</span>',
    '        <a href="index.html"    class="cmd-item"><div class="cmd-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Home</div><span class="cmd-shortcut">H</span></a>',
    '        <a href="projects.html" class="cmd-item"><div class="cmd-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> Projects</div><span class="cmd-shortcut">P</span></a>',
    '        <a href="brands.html"  class="cmd-item"><div class="cmd-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> Companies</div><span class="cmd-shortcut">B</span></a>',
    '        <a href="about.html"   class="cmd-item"><div class="cmd-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> About</div><span class="cmd-shortcut">A</span></a>',
    '        <a href="contact.html" class="cmd-item"><div class="cmd-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Contact</div><span class="cmd-shortcut">C</span></a>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join(''));

  var cmdOverlay = document.getElementById('cmdOverlay');
  var cmdInput   = document.getElementById('cmdInput');
  var cmdItems   = Array.from(cmdOverlay.querySelectorAll('.cmd-item'));
  var cmdIdx     = -1;

  function toggleCmd(force) {
    var open = force !== undefined ? force : !cmdOverlay.classList.contains('is-active');
    cmdOverlay.classList.toggle('is-active', open);
    if (open) { cmdInput.value = ''; cmdIdx = -1; setTimeout(function () { cmdInput.focus(); }, 80); }
    else cmdInput.blur();
  }
  function updateCmdSel() {
    var vis = cmdItems.filter(function (i) { return i.style.display !== 'none'; });
    vis.forEach(function (item, idx) { item.classList.toggle('is-selected', idx === cmdIdx); });
    if (vis[cmdIdx]) vis[cmdIdx].scrollIntoView({ block: 'nearest' });
  }
  cmdOverlay.addEventListener('click', function (e) { if (e.target === cmdOverlay) toggleCmd(false); });
  cmdInput.addEventListener('input', function () {
    var q = cmdInput.value.toLowerCase();
    cmdItems.forEach(function (item) { item.style.display = item.textContent.toLowerCase().indexOf(q) > -1 ? 'flex' : 'none'; });
    cmdIdx = 0; updateCmdSel();
  });
  cmdInput.addEventListener('keydown', function (e) {
    var vis = cmdItems.filter(function (i) { return i.style.display !== 'none'; });
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdIdx = (cmdIdx + 1) % vis.length; updateCmdSel(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); cmdIdx = (cmdIdx - 1 + vis.length) % vis.length; updateCmdSel(); }
    if (e.key === 'Enter' && vis[cmdIdx]) vis[cmdIdx].click();
  });

  /* ── Global keyboard shortcuts ──────────────────────────── */
  window.addEventListener('keydown', function (e) {
    var tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      if (e.key === 'Escape' && cmdOverlay.classList.contains('is-active')) toggleCmd(false);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); toggleCmd(true); }
    if (e.key === '/') { e.preventDefault(); toggleCmd(true); }
    if (e.key === 'Escape' && cmdOverlay.classList.contains('is-active')) toggleCmd(false);
    if (!cmdOverlay.classList.contains('is-active')) {
      if (e.key.toLowerCase() === 'h') window.location.href = 'index.html';
      if (e.key.toLowerCase() === 'p') window.location.href = 'projects.html';
      if (e.key.toLowerCase() === 'a') window.location.href = 'about.html';
      if (e.key.toLowerCase() === 'c') window.location.href = 'contact.html';
      if (e.key.toLowerCase() === 'b') window.location.href = 'brands.html';
    }
  });

  /* ── macOS Dock ─────────────────────────────────────────── */
  document.body.insertAdjacentHTML('beforeend', [
    '<div class="mac-dock-wrapper" id="macDock">',
    '  <div class="mac-dock">',
    '    <a href="index.html"    class="dock-item"><div class="dock-item-label">Home</div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></a>',
    '    <a href="brands.html"  class="dock-item"><div class="dock-item-label">Companies</div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></a>',
    '    <a href="projects.html" class="dock-item"><div class="dock-item-label">Projects</div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></a>',
    '    <a href="journal.html" class="dock-item"><div class="dock-item-label">Journal</div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></a>',
    '    <a href="contact.html" class="dock-item"><div class="dock-item-label">Contact</div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a>',
    '  </div>',
    '</div>'
  ].join(''));

  var macDock   = document.getElementById('macDock');
  var dockItems = Array.from(macDock.querySelectorAll('.dock-item'));
  if (canHover && !reduceMotion) {
    window.addEventListener('mousemove', function (e) {
      macDock.classList.toggle('is-visible', window.innerHeight - e.clientY < 180);
    }, { passive: true });
    macDock.addEventListener('mousemove', function (e) {
      dockItems.forEach(function (item) {
        var center = item.getBoundingClientRect().left + item.getBoundingClientRect().width / 2;
        var dist   = Math.abs(e.clientX - center);
        item.style.transform = 'scale(' + (dist < 100 ? 1 + (1 - dist / 100) * 0.4 : 1) + ')';
      });
    });
    macDock.addEventListener('mouseleave', function () {
      dockItems.forEach(function (item) { item.style.transform = 'scale(1)'; });
    });
  }

  /* ── Ambient noise overlay ──────────────────────────────── */
  document.body.insertAdjacentHTML('afterbegin', '<div class="ambient-noise" aria-hidden="true"></div>');

  /* ── Live footer clock ──────────────────────────────────── */
  var footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom) {
    var liveBox = document.createElement('div');
    liveBox.style.cssText = 'display:flex;gap:16px;align-items:center;';
    liveBox.innerHTML = '<span style="font-family:var(--font-ui);font-size:11px;letter-spacing:.1em;color:var(--gray-500);text-transform:uppercase">Build 2026.08</span><span id="liveClock" style="font-family:var(--font-ui);font-size:11px;letter-spacing:.1em;color:var(--gray-300)"></span>';
    footerBottom.appendChild(liveBox);
    var clock = document.getElementById('liveClock');
    function tickClock() {
      var d  = new Date();
      clock.textContent = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0') + ':' + d.getSeconds().toString().padStart(2,'0');
      setTimeout(tickClock, 1000);
    }
    tickClock();
  }

  /* ── Glow card hover ─────────────────────────────────────── */
  var glowCards = document.querySelectorAll('.glow-card');
  var mainEl    = document.getElementById('main');
  if (mainEl && glowCards.length) {
    mainEl.addEventListener('mousemove', function (e) {
      glowCards.forEach(function (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px');
        card.style.setProperty('--mouse-y', (e.clientY - r.top) + 'px');
        if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
          card.style.transform = 'perspective(1000px) rotateX(' + (((e.clientY - r.top) / r.height - 0.5) * -12).toFixed(1) + 'deg) rotateY(' + (((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(1) + 'deg) scale3d(1.02,1.02,1.02)';
        } else {
          card.style.transform = '';
        }
      });
    }, { passive: true });
    mainEl.addEventListener('mouseleave', function () {
      glowCards.forEach(function (card) { card.style.transform = ''; });
    });
  }

  /* ── Noise overlay (film grain) ─────────────────────────── */
  if (!document.querySelector('.noise-overlay')) {
    var noise = document.createElement('div');
    noise.className = 'noise-overlay';
    document.body.appendChild(noise);
  }

  // Note: page transitions via CSS @view-transition { navigation: auto }

})();

