// assets/terminal.js — BL.co Interactive Terminal
// Open: backtick key or data-terminal-open buttons
// Close: Escape or click outside overlay

const BL_TERMINAL = (() => {
  const VERSION = '1.0.0';
  const BOOT_DATE = '2026';
  let el, inputEl, outputEl, overlay, isOpen = false;
  let history = [], historyIdx = -1;

  const PROJECTS = [
    { id: 'ASCEND-AI',  name: 'Ascend AI',                status: 'BUILDING',      company: 'BL.Software' },
    { id: 'WEBTASTIC',  name: 'Webtastic Games',           status: 'BUILDING',      company: 'Webtastic Games' },
    { id: 'BLOOMVERSE', name: 'BloomVerse',                status: 'IN BUILD',      company: 'BL.Software' },
    { id: 'FITW',       name: 'Fallen in the Wrong World', status: 'IN PRODUCTION', company: 'BL.Media' },
    { id: 'NEXUS',      name: 'Nexus',                     status: 'SHIPPED',       company: 'Webtastic Games' },
    { id: '415',        name: '4^15 Tests',                status: 'SHIPPED',       company: 'BL.Software' },
  ];

  const LABS = [
    { id: 'SIGNAL',   name: 'Signal',   status: 'CONCEPT',     desc: 'Generative-UI motion-first interfaces' },
    { id: 'CURRENTS', name: 'Currents', status: 'CONCEPT',     desc: 'Short-form media cadence experiment' },
    { id: 'LOCAL-AI', name: 'Local AI', status: 'RESEARCHING', desc: 'Model fine-tuning and local inference' },
    { id: 'PROTO-4',  name: 'Proto-4',  status: 'ARCHIVED',    desc: 'Early BL.co CMS attempt, retired' },
  ];

  const JOURNAL = [
    { log: 'LOG_007', title: 'The rule about fake metrics',            cat: 'Build Log', date: 'AUG 2026' },
    { log: 'LOG_006', title: 'Infrastructure first: shared toolchain', cat: 'Build Log', date: 'AUG 2026' },
    { log: 'LOG_005', title: 'Why Ascend is being rebuilt',            cat: 'AI',        date: 'AUG 2026' },
  ];

  function appendLines(lines) {
    if (!lines) return;
    lines.forEach(line => {
      const div = document.createElement('div');
      div.className = 'tline';
      div.innerHTML = line;
      outputEl.appendChild(div);
    });
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function printPrompt(cmd) {
    const div = document.createElement('div');
    div.className = 'tline tprompt';
    const safe = cmd.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    div.innerHTML = '<span class="t-acc">BL.co</span><span class="t-dim"> ~/</span> <span class="t-cmd">' + safe + '</span>';
    outputEl.appendChild(div);
  }

  const COMMANDS = {
    help: function() {
      return [
        '<span class="t-dim">--- BL.CO TERMINAL ' + VERSION + ' ---</span>',
        '',
        '  <span class="t-kw">help</span>         Show this list',
        '  <span class="t-kw">projects</span>     Active projects and status',
        '  <span class="t-kw">labs</span>         BL.Labs experiments',
        '  <span class="t-kw">journal</span>      Recent log entries',
        '  <span class="t-kw">status</span>       Live system signal',
        '  <span class="t-kw">now</span>          Current build focus',
        '  <span class="t-kw">contact</span>      Reach BL.co',
        '  <span class="t-kw">clear</span>        Clear the terminal',
        '',
      ];
    },
    projects: function() {
      var lines = ['<span class="t-head">BL.CO / PROJECTS</span>', ''];
      PROJECTS.forEach(function(p) {
        var st = p.status === 'SHIPPED' ? 't-live' : p.status === 'ARCHIVED' ? 't-dim' : 't-prog';
        lines.push('  <span class="t-id">' + p.id.padEnd(12) + '</span> <span class="' + st + '">' + p.status.padEnd(15) + '</span> ' + p.name);
      });
      lines.push('', '  <span class="t-dim">' + PROJECTS.length + ' projects total.</span>');
      return lines;
    },
    labs: function() {
      var lines = ['<span class="t-head">BL.LABS / EXPERIMENTS</span>', ''];
      LABS.forEach(function(l) {
        var st = l.status === 'ARCHIVED' ? 't-dim' : l.status === 'RESEARCHING' ? 't-live' : 't-prog';
        lines.push('  <span class="t-id">' + l.id.padEnd(12) + '</span> <span class="' + st + '">' + l.status.padEnd(12) + '</span> ' + l.desc);
      });
      lines.push('', '  <span class="t-dim">Most of what happens here never ships. That is the point.</span>');
      return lines;
    },
    journal: function() {
      var lines = ['<span class="t-head">BL.CO / JOURNAL</span>', ''];
      JOURNAL.forEach(function(j) {
        lines.push('  <span class="t-kw">' + j.log + '</span>  <span class="t-dim">[' + j.cat + ']</span>  ' + j.title);
        lines.push('           <span class="t-dim">' + j.date + '</span>');
        lines.push('');
      });
      lines.push('  <a href="journal.html" class="t-link">Open full journal →</a>');
      return lines;
    },
    status: async function() {
      appendLines(['<span class="t-dim">Fetching signal from /api/pulse...</span>']);
      try {
        var r = await fetch('/api/pulse');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var d = await r.json();
        var dep = d.vercel.deployments !== null ? String(d.vercel.deployments) : '--';
        var lat = d.vercel.latestAt ? new Date(d.vercel.latestAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '--';
        var com = d.github.commits30d !== null ? String(d.github.commits30d) : '--';
        var rep = d.github.repos !== null ? String(d.github.repos) : '--';
        return [
          '',
          '<span class="t-head">BL.CO / SYSTEM STATUS</span>',
          '',
          '  ACTIVE PROJECTS      <span class="t-live">' + d.config.activeProjects + '</span>',
          '  GITHUB REPOS         <span class="t-live">' + rep + '</span>',
          '  COMMITS 30D          <span class="t-live">' + com + '</span>',
          '  TOTAL DEPLOYMENTS    <span class="t-live">' + dep + '</span>',
          '  LATEST SHIP          <span class="t-live">' + lat + '</span>',
          '  JOURNAL ENTRIES      <span class="t-live">' + d.config.journalEntries + '</span>',
          '',
          '  <span class="t-dim">Fetched: ' + new Date(d.fetchedAt).toLocaleTimeString() + '</span>',
        ];
      } catch(e) {
        return ['<span class="t-err">Could not reach /api/pulse: ' + e.message + '</span>'];
      }
    },
    now: function() {
      return [
        '<span class="t-head">BL.CO / NOW</span>',
        '',
        '  BUILDING       Ascend AI',
        '  EXPERIMENTING  Local AI / model fine-tuning',
        '  LAST SHIPPED   BL.co website — Aug 2026',
        '  MOOD           LOCKED IN',
        '',
        '  <a href="now.html" class="t-link">Full /now page →</a>',
      ];
    },
    contact: function() {
      return [
        '<span class="t-head">BL.CO / CONTACT</span>',
        '',
        '  EMAIL    <span class="t-acc">hello@bl.co</span>',
        '  <a href="contact.html" class="t-link">Open contact page →</a>',
      ];
    },
    clear: function() {
      outputEl.innerHTML = '';
      return null;
    },
    whoami: function() {
      return [
        '',
        '  <span class="t-acc">BLAMED</span> / FOUNDER',
        '  Rudra Rathore / CO-FOUNDER',
        '',
        '  Building the ecosystem from the ground up.',
        '  Started ' + BOOT_DATE + '. Still building.',
        '',
      ];
    },
    secret: function() {
      return [
        '',
        '  <span class="t-dim">/// CLASSIFIED ///</span>',
        '',
        '  BL.co is not a portfolio.',
        '  It is not an agency.',
        '  It is not a startup.',
        '',
        '  It is a long bet on independent, intentional work.',
        '  Most of it has not shipped yet.',
        '  Most of the best ideas are still in Labs.',
        '',
        '  <span class="t-dim">/// END ///</span>',
        '',
      ];
    },
  };

  COMMANDS['sudo ascend'] = async function() {
    appendLines([
      '<span class="t-err">sudo: permission check...</span>',
      '<span class="t-prog">VERIFYING IDENTITY</span>',
    ]);
    await new Promise(function(r){ setTimeout(r, 800); });
    return [
      '<span class="t-live">ACCESS GRANTED.</span>',
      '',
      '  <span class="t-acc">ASCEND</span> is being rebuilt from scratch.',
      '  The old version was deleted because it was not good enough.',
      '  The new version will be.',
      '',
      '  <span class="t-dim">ETA: when it is ready.</span>',
      '',
    ];
  };

  async function runCommand(raw) {
    var cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    history.unshift(raw);
    historyIdx = -1;
    printPrompt(raw);
    var fn = COMMANDS[cmd];
    if (fn) {
      var result = await fn();
      appendLines(result);
    } else if (cmd === 'exit' || cmd === 'quit' || cmd === 'close') {
      closeTerm();
    } else {
      var safe = cmd.replace(/</g,'&lt;');
      appendLines([
        '<span class="t-err">command not found: ' + safe + '</span>',
        '<span class="t-dim">Type help for available commands.</span>'
      ]);
    }
  }

  function buildDOM() {
    overlay = document.createElement('div');
    overlay.id = 'bl-terminal-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','BL.co Terminal');
    overlay.innerHTML = '<div id="bl-terminal"><div class="tbar"><span class="tbar-dot" style="background:#ff5f57"></span><span class="tbar-dot" style="background:#febc2e"></span><span class="tbar-dot" style="background:#28c840"></span><span class="tbar-title">BL.CO / TERMINAL</span><button class="tbar-close" aria-label="Close terminal">ESC</button></div><div id="bl-terminal-out"></div><div class="tinput-row"><span class="t-acc">BL.co</span><span class="t-dim"> ~/</span>&nbsp;<input id="bl-terminal-in" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input" placeholder="type a command..."></div></div>';
    document.body.appendChild(overlay);
    el = document.getElementById('bl-terminal');
    inputEl = document.getElementById('bl-terminal-in');
    outputEl = document.getElementById('bl-terminal-out');

    overlay.addEventListener('click', function(e){ if(e.target===overlay) closeTerm(); });
    overlay.querySelector('.tbar-close').addEventListener('click', closeTerm);

    inputEl.addEventListener('keydown', async function(e) {
      if (e.key === 'Enter') {
        var val = inputEl.value;
        inputEl.value = '';
        await runCommand(val);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIdx < history.length-1) { historyIdx++; inputEl.value = history[historyIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIdx > 0) { historyIdx--; inputEl.value = history[historyIdx]; }
        else { historyIdx = -1; inputEl.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        var partial = inputEl.value.trim().toLowerCase();
        var matches = Object.keys(COMMANDS).filter(function(k){ return k.startsWith(partial); });
        if (matches.length === 1) inputEl.value = matches[0];
      }
    });
  }

  function showWelcome() {
    appendLines([
      '<span class="t-head">BL.CO / SYSTEM READY</span>',
      '<span class="t-dim">Version ' + VERSION + '  —  Est. ' + BOOT_DATE + '</span>',
      '',
      '  Type <span class="t-kw">help</span> to see commands.  Press <span class="t-kw">ESC</span> to close.',
      '',
    ]);
  }

  function openTerm() {
    if (!el) { buildDOM(); showWelcome(); }
    overlay.classList.add('active');
    document.body.classList.add('terminal-open');
    isOpen = true;
    inputEl.focus();
  }

  function closeTerm() {
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.classList.remove('terminal-open');
    isOpen = false;
  }

  function toggleTerm() { isOpen ? closeTerm() : openTerm(); }

  function init() {
    document.addEventListener('keydown', function(e) {
      if (e.key === '' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggleTerm();
      }
      if (e.key === 'Escape' && isOpen) closeTerm();
    });
    document.querySelectorAll('[data-terminal-open]').forEach(function(btn) {
      btn.addEventListener('click', function(){ openTerm(); });
    });
  }

  return { init: init, open: openTerm, close: closeTerm, toggle: toggleTerm };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ BL_TERMINAL.init(); });
} else {
  BL_TERMINAL.init();
}