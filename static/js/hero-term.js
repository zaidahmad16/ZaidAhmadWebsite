(function () {
  'use strict';

  var out     = document.getElementById('ht-output');
  var inp     = document.getElementById('ht-input');
  var termEl  = document.querySelector('.hero-term');

  if (!out || !inp || !termEl) return;

  var cmdHistory = [], histIdx = -1;
  var introPlayed = false;
  var typing = false;

  var PROMPT = 'zaid@portfolio:~$';

  /* ── Output helpers ──────────────────── */
  function line(html, cls) {
    var p = document.createElement('p');
    if (cls) p.className = cls;
    p.innerHTML = html !== undefined ? html : '&nbsp;';
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
  }

  function blank() { line(''); }

  function cmd(text) {
    line('<span class="ht-cmd">' + PROMPT + '</span> ' + esc(text));
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ── Commands ────────────────────────── */
  function exec(raw) {
    raw = raw.trim();
    if (!raw) return;

    var parts = raw.split(/\s+/);
    var c     = parts[0].toLowerCase();
    var arg   = parts.slice(1).join(' ');

    switch (c) {

      case 'whoami':
        line('<span class="ht-acc">zaid ahmad</span>');
        blank();
        line('cs @ carleton university');
        line('minor in mathematics');
        line('ai/ml stream &middot; 2029');
        break;

      case 'ls':
        if (!arg || arg === '.' || arg === '~') {
          line('<span class="ht-dir">projects/</span>    <span class="ht-file">resume.pdf</span>    <span class="ht-dim">.bashrc</span>');
        } else if (/^(\.\/)?projects\/?$/.test(arg)) {
          listProjects();
        } else {
          line('ls: ' + esc(arg) + ': no such file or directory', 'ht-err');
        }
        break;
      case 'cat':
        if (!arg) { line('cat: missing operand', 'ht-err'); break; }
        var f = arg.replace(/\/$/, '');
        if (f === 'resume.pdf' || f === './resume.pdf') {
          line('opening resume&hellip;', 'ht-dim');
          setTimeout(function () { window.open('static/docs/ZaidAhmadResume.pdf', '_blank'); }, 400);
        } else if (f === '.bashrc') {
          line('# ~/.bashrc', 'ht-dim');
          line('export PS1="\\u@\\h:\\w\\$ "');
          line('alias ll="ls -alF"');
          line('alias gs="git status"');
          line('alias py="python3"');
        } else if (findProject(f)) {
          showProject(findProject(f));
        } else {
          line('cat: ' + esc(arg) + ': no such file or directory', 'ht-err');
        }
        break;
      case 'cd':
        if (!arg || arg === '~' || arg === '.') { break; }
        var target = findProject(arg);
        if (target) {
          line('navigating&hellip;', 'ht-dim');
          setTimeout(function () {
            if (target.external) window.open(target.href, '_blank', 'noopener');
            else window.location.href = target.href;
          }, 400);
        } else {
          line('cd: ' + esc(arg) + ': no such directory', 'ht-err');
        }
        break;
      case 'pwd':
        line('/home/zaid/portfolio');
        break;

      case 'date':
        line(new Date().toString(), 'ht-dim');
        break;

      case 'echo':
        line(esc(arg));
        break;

      case 'git':
        if (parts[1] === 'log') {
          line('<span class="ht-acc">commit 4ce8fe7</span> (HEAD &rarr; ui)');
          line('<span class="ht-dim">Author: Zaid Ahmad &lt;zaidahmad8060@gmail.com&gt;</span>');
          line('<span class="ht-dim">Date:   ' + esc(new Date().toDateString()) + '</span>');
          blank();
          line('    CLEANUP');
          blank();
          line('<span class="ht-acc">commit 242d753</span>');
          line('<span class="ht-dim">Date:   Sun Jun 1 2026</span>');
          blank();
          line('    feat: default light mode');
        } else if (parts[1] === 'status') {
          line('On branch ui');
          line('<span class="ht-dim">nothing to commit, working tree clean</span>');
        } else {
          line("git: '" + esc(parts[1] || '') + "' is not a git command. See 'git --help'", 'ht-err');
        }
        break;

      case 'uname':
        line('Linux portfolio 6.17.0-29-generic #1 SMP x86_64 GNU/Linux', 'ht-dim');
        break;

      case 'clear':
        out.innerHTML = '';
        break;

      case 'open':
        if (typeof window.openPortfolioTerm === 'function') window.openPortfolioTerm();
        break;

      case 'snake':
      case 'pokemon':
      case 'fastfetch':
        line('launching in full terminal&hellip;', 'ht-dim');
        setTimeout(function () {
          if (typeof window.openPortfolioTerm === 'function') window.openPortfolioTerm();
          setTimeout(function () {
            var overlayInput = document.getElementById('term-input');
            if (!overlayInput) return;
            overlayInput.value = c;
            overlayInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }, 350);
        }, 200);
        break;

      case 'sudo':
        if (arg === 'apt install snake' || arg === 'apt install pokemon') {
          var pkg = arg.split(' ').pop();
          line('launching in full terminal&hellip;', 'ht-dim');
          setTimeout(function () {
            if (typeof window.openPortfolioTerm === 'function') window.openPortfolioTerm();
            setTimeout(function () {
              var overlayInput = document.getElementById('term-input');
              if (!overlayInput) return;
              overlayInput.value = 'sudo apt install ' + pkg;
              overlayInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            }, 350);
          }, 200);
        } else {
          line('sudo: permission denied', 'ht-err');
        }
        break;

      case 'help':
        line('commands:');
        blank();
        line('  <span class="ht-acc">whoami</span>              who is this');
        line('  <span class="ht-acc">ls</span> [path]          list directory');
        line('  <span class="ht-acc">cat</span> [file]         read a file');
        line('  <span class="ht-acc">cd</span> [project]       open project page');
        line('  <span class="ht-acc">git log</span>            recent commits');
        line('  <span class="ht-acc">snake</span>              launch snake game');
        line('  <span class="ht-acc">pokemon</span>            start a pok&eacute;mon battle');
        line('  <span class="ht-acc">fastfetch</span>          system info');
        line('  <span class="ht-acc">clear</span>              clear screen');
        line('  <span class="ht-acc">open</span>               full terminal (ctrl+shift+l)');
        break;

      default:
        line('<span class="ht-err">bash: ' + esc(c) + ': command not found</span>');
        line('<span class="ht-dim">try <span class="ht-acc">help</span> or click ↗ for the full terminal</span>');
    }
  }

  /* ── Projects: read live from the "Selected work" list on this page, so a new
        project row shows up here with nothing else to edit ── */
  function projects() {
    return Array.prototype.map.call(document.querySelectorAll('.proj-list .proj-row'), function (li) {
      var a = li.querySelector('a');
      var href = a ? a.getAttribute('href') || '' : '';
      var text = function (sel) { var e = li.querySelector(sel); return e ? e.textContent.trim() : ''; };
      var name = text('.proj-row-name');
      var dir = /^projects\//.test(href) ? href.replace(/^.*\//, '').replace(/\.html$/, '')
                                         : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return {
        dir: dir, name: name, year: text('.proj-row-year'), hook: text('.proj-row-hook'), href: href,
        external: !!a && a.getAttribute('target') === '_blank',
        stack: Array.prototype.map.call(li.querySelectorAll('.proj-row-pills span'), function (x) { return x.textContent.trim(); }).join(' · '),
      };
    }).filter(function (p) { return p.dir && p.href; });
  }

  /* "duely", "projects/duely/", "kernel", "ghost": the folder name first, then a word in the title */
  function findProject(arg) {
    var q = String(arg).toLowerCase().replace(/^(\.\/)?(projects\/)?/, '').replace(/\/$/, '');
    if (!q) return null;
    var list = projects();
    return list.filter(function (p) { return p.dir === q; })[0]
        || list.filter(function (p) { return p.dir.indexOf(q) === 0; })[0]
        || list.filter(function (p) { return p.name.toLowerCase().indexOf(q) !== -1; })[0]
        || null;
  }

  function listProjects() {
    var dirs = projects().map(function (p) { return p.dir + '/'; });
    if (!dirs.length) { line('(empty)', 'ht-dim'); return; }
    var w = Math.max.apply(null, dirs.map(function (d) { return d.length; })) + 3;
    for (var i = 0; i < dirs.length; i += 2) {
      var left = '<span class="ht-dir">' + esc(dirs[i]) + '</span>';
      var right = dirs[i + 1] ? new Array(w - dirs[i].length + 1).join(' ') + '<span class="ht-dir">' + esc(dirs[i + 1]) + '</span>' : '';
      line(left + right);
    }
  }

  /* wraps the row's one-line description to the terminal's width */
  function wrap(text, width) {
    var out = [], cur = '';
    text.toLowerCase().split(/\s+/).forEach(function (w) {
      if (cur && (cur + ' ' + w).length > width) { out.push(cur); cur = w; }
      else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) out.push(cur);
    return out;
  }

  function showProject(p) {
    if (!p) return;
    line('<span class="ht-acc">' + esc(p.name) + '</span>' + (p.year ? '  <span class="ht-dim">' + esc(p.year) + '</span>' : ''));
    // the stack wraps between items, never inside one
    var row = '';
    p.stack.split(' · ').forEach(function (t) {
      if (row && (row + ' · ' + t).length > 56) { line('<span class="ht-dim">' + esc(row) + '</span>'); row = t; }
      else row = row ? row + ' · ' + t : t;
    });
    if (row) line('<span class="ht-dim">' + esc(row) + '</span>');
    blank();
    wrap(p.hook, 56).forEach(function (l) { line(esc(l)); });
    blank();
    line('<span class="ht-dim">' + (p.external ? 'open it' : 'open write-up') + ':  cd ' + esc('projects/' + p.dir) + '</span>');
  }

  /* ── Input handler ───────────────────── */
  inp.addEventListener('keydown', function (e) {
    if (typing) { e.preventDefault(); return; }

    if (e.key === 'Enter') {
      var val = inp.value.trim();
      cmd(val);
      if (val) { cmdHistory.unshift(val); histIdx = -1; exec(val); }
      inp.value = '';
      blank();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx < cmdHistory.length - 1) { histIdx++; inp.value = cmdHistory[histIdx]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx > 0 ? (histIdx--, inp.value = cmdHistory[histIdx]) : (histIdx = -1, inp.value = '');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault(); exec('clear');
    }
  });

  termEl.addEventListener('click', function () { inp.focus(); });

  /* ── Auto-type intro ─────────────────── */
  function typeCommand(text, onDone) {
    typing = true;
    inp.value = '';
    var i = 0;
    var iv = setInterval(function () {
      inp.value += text[i++];
      if (i >= text.length) {
        clearInterval(iv);
        setTimeout(function () {
          cmd(text);
          inp.value = '';
          exec(text);
          blank();
          typing = false;
          if (onDone) setTimeout(onDone, 700);
        }, 300);
      }
    }, 58);
  }

  function playIntro() {
    if (introPlayed) return;
    introPlayed = true;
    setTimeout(function () {
      typeCommand('whoami', function () {
        typeCommand('ls projects/', function () {
          inp.focus();
        });
      });
    }, 950);
  }

  /* ── Watch for About page becoming active ── */
  var aboutEl = document.getElementById('about');
  if (aboutEl) {
    if (aboutEl.classList.contains('page--active')) {
      setTimeout(playIntro, 600);
    } else {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.attributeName === 'class' && aboutEl.classList.contains('page--active')) {
            playIntro();
          }
        });
      }).observe(aboutEl, { attributes: true });
    }
  }

}());
