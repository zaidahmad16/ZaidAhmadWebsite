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
        line('ai/ml co-op stream &middot; 2029');
        break;

      case 'ls':
        if (!arg || arg === '.' || arg === '~') {
          line('<span class="ht-dir">projects/</span>    <span class="ht-file">resume.pdf</span>    <span class="ht-dim">.bashrc</span>');
        } else if (/^projects\/?$/.test(arg)) {
          line('<span class="ht-dir">carleton-course-map/</span>   <span class="ht-dir">linux-kernel-patch/</span>');
          line('<span class="ht-dir">stm32-doom-loader/</span>     <span class="ht-dir">nintendo-ds-card/</span>');
          line('<span class="ht-dir">c-simulation/</span>');
        } else {
          line('ls: ' + esc(arg) + ': no such file or directory', 'ht-err');
        }
        break;

      case 'cat':
        if (!arg) { line('cat: missing operand', 'ht-err'); break; }
        var f = arg.replace(/\/$/, '');
        if (f === 'resume.pdf' || f === './resume.pdf') {
          line('opening resume&hellip;', 'ht-dim');
          setTimeout(function () { window.open('static/docs/ZaidAhmadCV.pdf', '_blank'); }, 400);
        } else if (f === '.bashrc') {
          line('# ~/.bashrc', 'ht-dim');
          line('export PS1="\\u@\\h:\\w\\$ "');
          line('alias ll="ls -alF"');
          line('alias gs="git status"');
          line('alias py="python3"');
        } else if (/carleton/.test(f)) {
          showProject('carleton');
        } else if (/linux|kernel/.test(f)) {
          showProject('linux');
        } else if (/stm32|doom/.test(f)) {
          showProject('stm32');
        } else if (/nintendo|ds/.test(f)) {
          showProject('nintendo');
        } else if (/c-sim|ghost/.test(f)) {
          showProject('csim');
        } else {
          line('cat: ' + esc(arg) + ': no such file or directory', 'ht-err');
        }
        break;

      case 'cd':
        if (!arg || arg === '~' || arg === '.') { break; }
        if (/carleton/.test(arg)) {
          line('navigating&hellip;', 'ht-dim');
          setTimeout(function () { window.location.href = 'projects/carleton-course-map.html'; }, 400);
        } else if (/linux|kernel/.test(arg)) {
          line('navigating&hellip;', 'ht-dim');
          setTimeout(function () { window.location.href = 'projects/linux-kernel-patch.html'; }, 400);
        } else if (/nintendo/.test(arg)) {
          line('navigating&hellip;', 'ht-dim');
          setTimeout(function () { window.location.href = 'projects/nintendo-ds.html'; }, 400);
        } else if (/c-sim|ghost/.test(arg)) {
          line('navigating&hellip;', 'ht-dim');
          setTimeout(function () { window.location.href = 'projects/c-simulation.html'; }, 400);
        } else if (/stm32|doom/.test(arg)) {
          line('opening github&hellip;', 'ht-dim');
          setTimeout(function () { window.open('https://github.com/zaidahmad16/stm32-doom-loader', '_blank'); }, 400);
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

  function showProject(key) {
    var projects = {
      carleton: {
        name: 'Carleton Course Map',
        stack: 'Python · Parsel · FastAPI · PostgreSQL · Next.js · React Flow',
        desc: '800+ students use it. scraped every program at carleton,\nbuilt the prerequisite graph as a DAG, shipped a REST API\nand drag-and-drop semester planner.',
        link: 'projects/carleton-course-map.html',
      },
      linux: {
        name: 'Linux Wireless Kernel Patch',
        stack: 'C · mac80211 · nl80211 · iw',
        desc: 'wi-fi was capped at 54 mbps. should have been 1 gbps.\ntraced the bug through mac80211, wrote the patch, fixed it.',
        link: 'projects/linux-kernel-patch.html',
      },
      stm32: {
        name: 'STM32 Doom Bootloader',
        stack: 'C · ARM Cortex-M4 · Linker Scripts · OpenOCD · SPI',
        desc: 'bare-metal bootloader on an stm32f4. no HAL, no SDK.\nloads shareware doom off an SD card over SPI.',
        link: null,
        ext: 'https://github.com/zaidahmad16/stm32-doom-loader',
      },
      nintendo: {
        name: 'Nintendo DS Business Card',
        stack: 'C · NDS SDK · ARM',
        desc: 'boots on real hardware. play a short game,\nget my contact info at the end.',
        link: 'projects/nintendo-ds.html',
      },
      csim: {
        name: 'Ghost Hunting Simulation',
        stack: 'C · POSIX Threads · Semaphores',
        desc: 'every actor is its own POSIX thread on shared memory.\nzero deadlocks across 1,000+ ticks.',
        link: 'projects/c-simulation.html',
      },
    };
    var p = projects[key];
    if (!p) return;
    line('<span class="ht-acc">' + esc(p.name) + '</span>');
    line('<span class="ht-dim">' + esc(p.stack) + '</span>');
    blank();
    p.desc.split('\n').forEach(function (l) { line(esc(l)); });
    blank();
    var href = p.link || p.ext;
    var label = p.link ? 'open write-up' : 'open github';
    line('<span class="ht-dim">' + label + ':  cd ' + esc(key === 'stm32' ? 'projects/stm32-doom-loader' : 'projects/' + key) + '</span>');
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
