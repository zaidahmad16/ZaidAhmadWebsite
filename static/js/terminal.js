(function () {
  'use strict';

  var overlay      = document.getElementById('term-overlay');
  var termWindow   = document.getElementById('term-window');
  var termOutput   = document.getElementById('term-output');
  var termCanvas   = document.getElementById('term-canvas');
  var termInputRow = document.getElementById('term-input-row');
  var termInput    = document.getElementById('term-input');

  if (!overlay) return;

  // ── State ─────────────────────────────────────────────────────
  var cmdHistory   = [];
  var histIdx      = -1;
  var snakeRunning = false;

  // ── Open / Close ──────────────────────────────────────────────
  // The window grows out of the hero terminal and shrinks back into it (FLIP: measure both boxes,
  // start the window at the hero's box with a transform, then animate the transform away).
  var termBody = document.getElementById('term-body');
  var closeBtn = overlay.querySelector('.term-close');
  var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var OPEN_MS = 480, CLOSE_MS = 380;
  var closing = false, closeTimer = null;

  // the hero terminal's box, only while it's on screen (About page showing)
  function heroBox() {
    var hero = document.querySelector('.hero-term');
    var about = document.getElementById('about');
    if (!hero || (about && !about.classList.contains('page--active'))) return null;
    var r = hero.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { el: hero, r: r } : null;
  }
  // the transform that puts the window exactly over a box
  function onto(r) {
    var t = termWindow.getBoundingClientRect();
    return 'translate(' + (r.left - t.left) + 'px,' + (r.top - t.top) + 'px) scale(' + (r.width / t.width) + ',' + (r.height / t.height) + ')';
  }
  function resetStyles() {
    termWindow.style.transition = termWindow.style.transform = termWindow.style.opacity = '';
    termBody.style.transition = termBody.style.opacity = '';
  }

  function openTerm() {
    if (overlay.classList.contains('open') && !closing) return;
    if (closing) { clearTimeout(closeTimer); closing = false; }
    overlay.classList.add('open');
    if (termOutput.children.length === 0) continueFromHero();
    resetStyles();
    var hero = reduced ? null : heroBox();
    termWindow.style.transition = 'none';
    termWindow.style.transform = hero ? onto(hero.r) : 'scale(0.97)';
    termWindow.style.opacity = hero ? '1' : '0';
    termBody.style.opacity = hero ? '0' : '1';
    if (hero) hero.el.style.visibility = 'hidden';               // one terminal on screen, not two
    void termWindow.offsetWidth;                                  // apply the start state before animating
    overlay.classList.add('shown');
    var ms = reduced ? 160 : OPEN_MS;
    termWindow.style.transition = 'transform ' + ms + 'ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out';
    termBody.style.transition = 'opacity 220ms ease-out ' + (hero ? ms * 0.45 : 0) + 'ms';
    termWindow.style.transform = 'none';
    termWindow.style.opacity = '1';
    termBody.style.opacity = '1';
    termInput.focus({ preventScroll: true });
  }

  function closeTerm() {
    if (!overlay.classList.contains('open') || closing) return;
    stopSnake();
    closing = true;
    var hero = reduced ? null : heroBox();
    termWindow.style.transition = 'none';
    termWindow.style.transform = 'none';
    var to = hero ? onto(hero.r) : 'scale(0.97)';
    void termWindow.offsetWidth;
    var ms = reduced ? 140 : CLOSE_MS;
    overlay.classList.remove('shown');
    termBody.style.transition = 'opacity 120ms ease-out';
    termBody.style.opacity = '0';
    termWindow.style.transition = 'transform ' + ms + 'ms cubic-bezier(0.65, 0, 0.35, 1), opacity ' + (hero ? 0 : 160) + 'ms ease-out';
    termWindow.style.transform = to;
    if (!hero) termWindow.style.opacity = '0';
    closeTimer = setTimeout(function () {
      overlay.classList.remove('open');
      resetStyles();
      var h = document.querySelector('.hero-term');
      if (h) h.style.visibility = '';
      closing = false;
    }, ms);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeTerm);

  // ── Output helpers ────────────────────────────────────────────
  function line(text, cls) {
    var d = document.createElement('div');
    d.className = cls || 'tl';
    d.textContent = text || ' ';
    termOutput.appendChild(d);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  // The first time it opens, carry over what the hero terminal already shows, so it reads as the same
  // terminal getting bigger rather than a different one
  function continueFromHero() {
    var hero = document.getElementById('ht-output');
    if (!hero || !hero.children.length) { printWelcome(); return; }
    Array.prototype.forEach.call(hero.children, function (n) { termOutput.appendChild(n.cloneNode(true)); });
    line('full terminal: type "help" for more commands', 'tl-dim');
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function printWelcome() {
    line('Linux Mint 22.1 Xia', 'tl-dim');
    line('');
    line("Welcome to Zaid's portfolio terminal.", 'tl');
    line('Type "help" for available commands.', 'tl-dim');
    line('');
  }

  // ── Commands ──────────────────────────────────────────────────
  function run(raw) {
    raw = raw.trim();
    if (!raw) return;

    cmdHistory.unshift(raw);
    histIdx = -1;

    line('zaid@portfolio:~$ ' + raw, 'tl-cmd');

    var parts = raw.split(/\s+/);
    var cmd   = parts[0].toLowerCase();
    var args  = parts.slice(1);

    switch (cmd) {
      case 'help':
        line('');
        line('  ls                        list directory',          'tl');
        line('  pwd                       print working directory', 'tl');
        line('  whoami                    current user',            'tl');
        line('  uname -a                  system info',             'tl');
        line('  date                      current date/time',       'tl');
        line('  cat <file>                print file contents',     'tl');
        line('  git log                   recent commits',          'tl');
        line('  git status                working tree status',     'tl');
        line('  fastfetch                 system info (ascii art)', 'tl');
        line('  echo <text>               print text',              'tl');
        line('  clear                     clear terminal',          'tl');
        line('  exit                      close terminal',          'tl');
        line('  htop                      what\'s running right now', 'tl');
        line('  sudo apt install snake    unlock a mini-game',      'tl');
        line('  sudo apt install pokemon  start a Pokémon battle',  'tl');
        line('');
        break;

      case 'ls':
        line('Desktop  Documents  Downloads  portfolio  .bashrc  .ssh  .zshrc', 'tl');
        break;

      case 'pwd':
        line('/home/zaid/portfolio', 'tl');
        break;

      case 'whoami':
        line('zaid', 'tl');
        break;

      case 'uname':
        line('Linux portfolio 6.8.0-51-generic #52-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux', 'tl');
        break;

      case 'date':
        line(new Date().toString(), 'tl');
        break;

      case 'echo':
        line(args.join(' '), 'tl');
        break;

      case 'clear':
        termOutput.innerHTML = '';
        break;

      case 'exit':
      case 'quit':
        closeTerm();
        break;

      case 'cat':
        var f = args[0];
        if (f === '.bashrc' || f === '~/.bashrc') {
          line('# ~/.bashrc',                                          'tl-dim');
          line('export PS1="\\u@\\h:\\w\\$ "',                        'tl');
          line('alias ll="ls -alF"',                                   'tl');
          line('alias gs="git status"',                                'tl');
          line('alias py="python3"',                                   'tl');
        } else if (f === '.zshrc' || f === '~/.zshrc') {
          line('# ~/.zshrc',                                           'tl-dim');
          line('export ZSH="$HOME/.oh-my-zsh"',                       'tl');
          line('ZSH_THEME="robbyrussell"',                             'tl');
          line('plugins=(git z sudo)',                                  'tl');
        } else if (!f) {
          line('cat: missing operand',                                  'tl-err');
        } else {
          line('cat: ' + f + ': No such file or directory',            'tl-err');
        }
        break;

      case 'git':
        if (args[0] === 'log') {
          line('commit a1b2c3d4 (HEAD -> main, origin/main)',          'tl-acc');
          line('Author: Zaid Ahmad <zaidahmad8060@gmail.com>',         'tl');
          line('Date:   ' + new Date().toDateString(),                 'tl-dim');
          line('');
          line('    built terminal easter egg — patience rewarded',    'tl');
          line('');
          line('commit f8e7d6c5',                                       'tl-acc');
          line('Author: Zaid Ahmad <zaidahmad8060@gmail.com>',         'tl');
          line('Date:   Tue Apr 15 2025',                              'tl-dim');
          line('');
          line('    added project subpages',                           'tl');
        } else if (args[0] === 'status') {
          line("On branch main",                                        'tl');
          line("Your branch is up to date with 'origin/main'.",        'tl-dim');
          line('');
          line('nothing to commit, working tree clean',                'tl-dim');
        } else {
          line("git: '" + (args[0] || '') + "' is not a git command. See 'git --help'", 'tl-err');
        }
        break;

      case 'ssh':
        line('ssh: connect to host ' + (args[0] || 'localhost') + ' port 22: Connection refused', 'tl-err');
        break;

      case 'python3':
      case 'python':
        line('Python 3.11.6 (main, Oct  2 2023, 13:45:01) on linux',  'tl-dim');
        line('Type "help", "copyright" or "quit()" for more info.',   'tl-dim');
        line('>>> ',                                                    'tl');
        break;

      case 'node':
        line('Welcome to Node.js v20.11.0.',                           'tl-dim');
        line('Type ".help" for more information.',                     'tl-dim');
        line('> ',                                                      'tl');
        break;

      case 'fastfetch':
        printFastfetch();
        break;

      case 'htop':
      case 'top':
        startHtop();
        break;

      case 'snake':
        line("Command 'snake' not found \u2014 installing it with: sudo apt install snake", 'tl-dim');
        fakeAptInstall();
        break;

      case 'apt':
        line('E: Could not open lock file /var/lib/dpkg/lock-frontend (13: Permission denied)', 'tl-err');
        line('E: Unable to lock the administration directory — are you root?', 'tl-err');
        break;

      case 'sudo':
        if (args[0] === 'htop' || args[0] === 'top') {
          startHtop();
        } else if (args[0] === 'apt' && args[1] === 'install' && args[2] === 'snake') {
          fakeAptInstall();
        } else if (args[0] === 'apt' && args[1] === 'install' && args[2] === 'pokemon') {
          fakeAptInstallPokemon();
        } else if (args[0] === 'apt' && args[1] === 'install') {
          setTimeout(function () {
            line('E: Unable to locate package ' + (args[2] || ''), 'tl-err');
          }, 300);
        } else if (args[0] === 'rm' && args[1] === '-rf') {
          line('[sudo] password for zaid: ', 'tl');
          setTimeout(function () {
            line("rm: it is dangerous to operate recursively on '/'",         'tl-err');
            line("rm: use --no-preserve-root to override this failsafe",      'tl-err');
          }, 900);
        } else {
          line('[sudo] password for zaid: ', 'tl');
          setTimeout(function () { line('Sorry, try again.', 'tl-err'); }, 900);
        }
        break;

      default:
        line('bash: ' + cmd + ': command not found', 'tl-err');
        line('Try "help" to see available commands.', 'tl-dim');
    }
  }



  function printFastfetch() {
    var artLines = [
      '           -MMMMMMMMMMMMMMMM-          ',
      '       .-MMMM  . : : : : : .  MMMM-.  ',
      '    -:MMMM .:MMMMMMMMMMMMMM:. MMMM:-  ',
      '  -MMMMMM-M- -MMMMMMMMMMMMMMMM-MMM-   ',
      ' `MMM:MM`   :MMMM. . . .:- -MMMM:MMM:`',
      ' :MMM:MMM`   :MM:`           :MMM:MMM:',
      ' :MMM:MMM`  :MM.  -MM.   MM-  `MMM:MMM.',
      ' MMM:MMM`   :MM.  -MM-   MM:  `MMM-MMM ',
      ' MMM:MMM`   :MM.  -MM-  .MM:   MMM-MMM ',
      ' MMM:MMM`   :MM.   MM-  .MM:  `MMM-MMM ',
      ' MMM:MMM`   :MM. --MM:--MM:   `MMM-MMM ',
      ' `MMM:MMM`  :MM.  -MMMMMMMMM. `MMM-MMM-',
      '  :MMM:MMM.                :MM:MMM:    ',
      '   `MMM.MMMM.         .:MMMMMMMM:     ',
      '     `-MMMM.-MMMMMMMMMMMMMMM-.MMMM-`  ',
      '       `.-MMMM  : : : : :  MMMM-.`   ',
      '          `-MMMMMMMMMMMMMM-`          ',
      '                : : : : :             ',
    ];
    var infoLines = [
      { text: '',                               cls: 'tl' },
      { text: '',                               cls: 'tl' },
      { text: '',                               cls: 'tl' },
      { text: 'zaid@portfolio',                 cls: 'tl-acc' },
      { text: '--------------',                 cls: 'tl-dim' },
      { text: 'OS: Linux Mint 22.1 Xia x86_64', cls: 'tl' },
      { text: 'Kernel: 6.8.0-51-generic',       cls: 'tl' },
      { text: 'Uptime: always on',               cls: 'tl' },
      { text: 'Shell: bash 5.2.15',              cls: 'tl' },
      { text: 'DE: Cinnamon 6.4',                cls: 'tl' },
      { text: 'Terminal: kitty',                 cls: 'tl' },
      { text: 'Languages: C · Python · TS',     cls: 'tl' },
      { text: 'Focus: Backend · Databases',     cls: 'tl' },
      { text: '',                               cls: 'tl' },
      { text: '',                               cls: 'tl' },
      { text: '',                               cls: 'tl' },
      { text: '',                               cls: 'tl' },
      { text: '',                               cls: 'tl' },
    ];
    var colW = Math.max.apply(null, artLines.map(function(s){ return s.length; }));
    var rows = artLines.map(function(art, i) {
      var inf = infoLines[i] || { text: '', cls: 'tl' };
      return { art: art.padEnd(colW), info: inf.text, cls: inf.cls };
    });
    rows.forEach(function (r) {
      var d  = document.createElement('div');
      d.className = 'tl';
      var s1 = document.createElement('span');
      s1.className   = 'tl-mint';
      s1.textContent = r.art;
      var s2 = document.createElement('span');
      s2.className   = r.cls;
      s2.textContent = '  ' + r.info;
      d.appendChild(s1);
      d.appendChild(s2);
      termOutput.appendChild(d);
    });
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  // ── Fake apt install ──────────────────────────────────────────
  function fakeAptInstall() {
    termInputRow.style.display = 'none';

    var steps = [
      [0,    'Reading package lists... Done',                                           'tl'],
      [350,  'Building dependency tree... Done',                                        'tl'],
      [600,  'Reading state information... Done',                                       'tl'],
      [850,  'The following NEW packages will be installed:',                           'tl'],
      [1000, '  snake',                                                                 'tl-acc'],
      [1250, '0 upgraded, 1 newly installed, 0 to remove and 212 not upgraded.',        'tl'],
      [1480, 'Need to get 42.0 kB of archives.',                                        'tl'],
      [1620, 'After this operation, 128 kB of additional disk space will be used.',     'tl'],
      [1880, 'Get:1 http://packages.linuxmint.com xia/universe amd64 snake 1.0.4 [42.0 kB]', 'tl-dim'],
      [2500, 'Fetched 42.0 kB in 0s (168 kB/s)',                                       'tl-dim'],
      [2700, 'Selecting previously unselected package snake.',                          'tl'],
      [2900, '(Reading database ... 347,682 files currently installed.)',               'tl-dim'],
      [3150, 'Preparing to unpack .../snake_1.0.4_amd64.deb ...',                      'tl'],
      [3500, 'Unpacking snake (1.0.4) ...',                                             'tl'],
      [3950, 'Setting up snake (1.0.4) ...',                                            'tl'],
      [4350, 'Processing triggers for man-db (2.10.2-1) ...',                          'tl-dim'],
      [4700, ''],
      [4800, 'Launching snake...',                                                      'tl-acc'],
    ];

    steps.forEach(function (s) {
      setTimeout(function () { line(s[1], s[2]); }, s[0]);
    });

    setTimeout(startSnake, 5300);
  }

  // ── Fake apt install — pokemon ────────────────────────────────
  function fakeAptInstallPokemon() {
    termInputRow.style.display = 'none';

    var steps = [
      [0,    'Reading package lists... Done',                                              'tl'],
      [350,  'Building dependency tree... Done',                                           'tl'],
      [600,  'Reading state information... Done',                                          'tl'],
      [850,  'The following NEW packages will be installed:',                              'tl'],
      [1000, '  pokemon',                                                                  'tl-acc'],
      [1250, '0 upgraded, 1 newly installed, 0 to remove and 212 not upgraded.',           'tl'],
      [1480, 'Need to get 649.0 kB of archives.',                                          'tl'],
      [1620, 'After this operation, 1,024 kB of additional disk space will be used.',      'tl'],
      [1880, 'Get:1 http://packages.linuxmint.com xia/universe amd64 pokemon 1.0.0 [649.0 kB]', 'tl-dim'],
      [2500, 'Fetched 649.0 kB in 0s (1,337 kB/s)',                                       'tl-dim'],
      [2700, 'Selecting previously unselected package pokemon.',                           'tl'],
      [2900, '(Reading database ... 347,682 files currently installed.)',                  'tl-dim'],
      [3150, 'Preparing to unpack .../pokemon_1.0.0_amd64.deb ...',                       'tl'],
      [3500, 'Unpacking pokemon (1.0.0) ...',                                              'tl'],
      [3950, 'Setting up pokemon (1.0.0) ...',                                             'tl'],
      [4350, 'Processing triggers for man-db (2.10.2-1) ...',                             'tl-dim'],
      [4700, ''],
      [4800, 'Launching Pokémon battle...',                                                'tl-acc'],
    ];

    steps.forEach(function (s) {
      setTimeout(function () { line(s[1], s[2]); }, s[0]);
    });

    setTimeout(function () {
      closeTerm();
      if (typeof window.startPokemonBattle === 'function') {
        window.startPokemonBattle();
      }
    }, 5600);
  }

  // ── Snake (static/js/snake.js draws it inside this terminal) ──
  function startSnake() {
    if (!window.TermSnake) { termInputRow.style.display = ''; line('snake: failed to start', 'tl-err'); return; }
    snakeRunning = true;
    window.TermSnake.start({ body: termBody, onExit: function (r) {
      snakeRunning = false;
      termInputRow.style.display = '';
      if (r.won) return snakeWin();
      line('');
      line('snake: score ' + r.score + ' \xb7 best ' + r.best + ' (level ' + r.level + ')', 'tl-dim');
      line('type "sudo apt install snake" to play again', 'tl-dim');
      if (overlay.classList.contains('open')) termInput.focus({ preventScroll: true });
    } });
  }

  function stopSnake() {
    if (window.TermSnake && window.TermSnake.running()) window.TermSnake.stop();
    if (window.TermHtop && window.TermHtop.running()) window.TermHtop.stop();
  }

  // ── htop (static/js/htop.js) ──
  function startHtop() {
    if (!window.TermHtop) { line('bash: htop: command not found', 'tl-err'); return; }
    snakeRunning = true;   // same flag: keeps Esc/backdrop from closing the terminal mid-app
    termInputRow.style.display = 'none';
    window.TermHtop.start({
      body: termBody,
      onExit: function () {
        snakeRunning = false;
        termInputRow.style.display = '';
        if (overlay.classList.contains('open')) termInput.focus({ preventScroll: true });
      },
      navigate: function (href) {
        closeTerm();
        setTimeout(function () { window.location.href = href; }, 200);
      },
    });
  }

  // Spelling ZAIDAHMAD "installs" Zaid and opens the resume
  function snakeWin() {
    termInputRow.style.display = 'none';
    window.open('static/docs/ZaidAhmadResume.pdf', '_blank');

    var steps = [
      [0,    ''],
      [150,  'Reading package lists... Done',                         'tl'],
      [450,  'Building dependency tree... Done',                      'tl'],
      [700,  ''],
      [800,  'Setting up zaid-ahmad (latest) ...',                    'tl'],
      [1300, 'Processing triggers for career-db (2026.05) ...',        'tl'],
      [1700, ''],
      [1800, "✓ Package 'Zaid Ahmad' successfully installed.",    'tl-acc'],
      [2050, '  Skills: Python \xb7 C \xb7 TypeScript \xb7 SQL \xb7 Linux', 'tl-dim'],
      [2150, '  Previously: Business Analyst @ IRCC (summer 2026)',     'tl-dim'],
      [2250, '  Status: actively seeking internships',                 'tl-dim'],
      [2700, ''],
      [2800, 'Resume opened in a new tab.',                            'tl'],
      [2900, ''],
    ];

    steps.forEach(function(s){ setTimeout(function(){ line(s[1],s[2]); }, s[0]); });

    setTimeout(function(){
      var d=document.createElement('div'); d.className='tl-acc';
      var a=document.createElement('a');
      a.href='static/docs/ZaidAhmadResume.pdf'; a.target='_blank';
      a.style.cssText='color:#58a6ff;text-decoration:underline;';
      a.textContent='  → view resume';
      d.appendChild(a); termOutput.appendChild(d);
      termOutput.scrollTop=termOutput.scrollHeight;
    }, 3000);

    setTimeout(function(){
      termInputRow.style.display=''; termInput.focus();
    }, 3200);
  }

  window.openPortfolioTerm = openTerm;

  // ── Global keyboard ───────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      overlay.classList.contains('open') ? closeTerm() : openTerm();
      return;
    }
    if (e.key === 'Escape' && overlay.classList.contains('open') && !snakeRunning) {
      closeTerm();
    }
  });

  // Click on backdrop closes (disabled during snake to avoid misclick)
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay && !snakeRunning) closeTerm();
  });

  // Input events
  termInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var val = termInput.value;
      termInput.value = '';
      run(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx < cmdHistory.length - 1) {
        histIdx++;
        termInput.value = cmdHistory[histIdx];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) {
        histIdx--;
        termInput.value = cmdHistory[histIdx];
      } else {
        histIdx = -1;
        termInput.value = '';
      }
    }
  });

  // Clicking anywhere in the terminal window refocuses input
  termWindow.addEventListener('click', function (e) {
    if (!snakeRunning && e.target !== termInput) termInput.focus();
  });

}());
