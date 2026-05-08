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
  var snakeInterval = null;

  // ── Open / Close ──────────────────────────────────────────────
  function openTerm() {
    overlay.classList.add('open');
    if (termOutput.children.length === 0) printWelcome();
    termInput.focus();
  }

  function closeTerm() {
    stopSnake();
    overlay.classList.remove('open');
  }

  // ── Output helpers ────────────────────────────────────────────
  function line(text, cls) {
    var d = document.createElement('div');
    d.className = cls || 'tl';
    d.textContent = text || ' ';
    termOutput.appendChild(d);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function printWelcome() {
    line('Ubuntu 22.04.4 LTS', 'tl-dim');
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
        line('  ls              list directory',                'tl');
        line('  pwd             print working directory',       'tl');
        line('  whoami          current user',                  'tl');
        line('  uname -a        system info',                   'tl');
        line('  date            current date/time',             'tl');
        line('  cat <file>      print file contents',           'tl');
        line('  git log         recent commits',                'tl');
        line('  git status      working tree status',           'tl');
        line('  neofetch        system info (fancy)',           'tl');
        line('  echo <text>     print text',                    'tl');
        line('  clear           clear terminal',                'tl');
        line('  exit            close terminal',                'tl');
        line('  sudo apt install snake   ...', 'tl');
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
        line('Linux portfolio 6.1.0-21-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.90-1 x86_64 GNU/Linux', 'tl');
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

      case 'neofetch':
        printNeofetch();
        break;

      case 'apt':
        line('E: Could not open lock file /var/lib/dpkg/lock-frontend (13: Permission denied)', 'tl-err');
        line('E: Unable to lock the administration directory — are you root?', 'tl-err');
        break;

      case 'sudo':
        if (args[0] === 'apt' && args[1] === 'install' && args[2] === 'snake') {
          fakeAptInstall();
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

  function printNeofetch() {
    var art = [
      '            .-/+oossssoo+/-.        ',
      '        `:+ssssssssssssssssss+:`    ',
      '      -+ssssssssssssssssssyyssss+-  ',
      '    .ossssssssssssssssssdMMMNysssso.',
      '   /ssssssssssshdmmNNmmyNMMMMhssssss',
      '  +ssssssssshmydMMMMMMMNddddyssssssss',
      ' /sssssssshNMMMyhhyyyyhmNMMMNhssssssss',
      '.ssssssssdMMMNhsssssssssshNMMMdssssssss',
    ];
    var info = [
      'zaid@portfolio',
      '--------------',
      'OS: Ubuntu 22.04.4 LTS',
      'Host: Carleton University',
      'Year: 3rd — Computer Systems Engineering',
      'Shell: bash 5.2.15',
      'Languages: C, Python, JavaScript',
      'Focus: DevOps, Embedded Systems',
    ];
    for (var i = 0; i < art.length; i++) {
      var d  = document.createElement('div');
      d.className = 'tl';
      var s1 = document.createElement('span');
      s1.className   = 'tl-acc';
      s1.textContent = art[i] || '';
      var s2 = document.createElement('span');
      s2.className   = 'tl-dim';
      s2.textContent = '  ' + (info[i] || '');
      d.appendChild(s1);
      d.appendChild(s2);
      termOutput.appendChild(d);
    }
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
      [1880, 'Get:1 http://archive.ubuntu.com/ubuntu jammy/universe amd64 snake 1.0.4 [42.0 kB]', 'tl-dim'],
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

  // ── Snake game ────────────────────────────────────────────────
  var CELL         = 20;
  var FOOD_LETTERS = ['Z','A','I','D','A','H','M','A','D'];

  var sSnake, sDir, sNextDir, sFood, sFoodIdx, sCols, sRows;

  function startSnake() {
    termOutput.style.display   = 'none';
    termInputRow.style.display = 'none';
    termCanvas.style.display   = 'block';

    requestAnimationFrame(function () {
      sCols = Math.floor(termCanvas.clientWidth  / CELL);
      sRows = Math.floor(termCanvas.clientHeight / CELL);
      termCanvas.width  = sCols * CELL;
      termCanvas.height = sRows * CELL;

      var cx = Math.floor(sCols / 2);
      var cy = Math.floor(sRows / 2);
      sSnake   = [{x: cx, y: cy}, {x: cx-1, y: cy}, {x: cx-2, y: cy}];
      sDir     = {x: 1, y: 0};
      sNextDir = {x: 1, y: 0};
      sFoodIdx = 0;
      placeFood();

      snakeRunning  = true;
      snakeInterval = setInterval(snakeTick, 115);
      document.addEventListener('keydown', snakeKeys);
      drawFrame();
    });
  }

  function stopSnake() {
    if (!snakeRunning) return;
    snakeRunning = false;
    clearInterval(snakeInterval);
    snakeInterval = null;
    document.removeEventListener('keydown', snakeKeys);
    termCanvas.style.display   = 'none';
    termOutput.style.display   = '';
    termInputRow.style.display = '';
  }

  function placeFood() {
    var pos;
    do {
      pos = {
        x: Math.floor(Math.random() * sCols),
        y: Math.floor(Math.random() * sRows)
      };
    } while (sSnake.some(function (s) { return s.x === pos.x && s.y === pos.y; }));
    sFood = pos;
  }

  function snakeKeys(e) {
    if (!snakeRunning) return;
    var map = {
      ArrowUp:    {x:  0, y: -1},
      ArrowDown:  {x:  0, y:  1},
      ArrowLeft:  {x: -1, y:  0},
      ArrowRight: {x:  1, y:  0},
      w: {x:0,y:-1}, W: {x:0,y:-1},
      s: {x:0,y:1},  S: {x:0,y:1},
      a: {x:-1,y:0}, A: {x:-1,y:0},
      d: {x:1,y:0},  D: {x:1,y:0},
    };
    var nd = map[e.key];
    if (nd && !(nd.x === -sDir.x && nd.y === -sDir.y)) {
      sNextDir = nd;
      e.preventDefault();
    }
  }

  function snakeTick() {
    sDir = sNextDir;
    var head = {x: sSnake[0].x + sDir.x, y: sSnake[0].y + sDir.y};

    if (head.x < 0 || head.x >= sCols || head.y < 0 || head.y >= sRows) {
      return gameOver();
    }
    if (sSnake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
      return gameOver();
    }

    sSnake.unshift(head);

    if (head.x === sFood.x && head.y === sFood.y) {
      sFoodIdx++;
      if (sFoodIdx >= FOOD_LETTERS.length) {
        drawFrame();
        return snakeWin();
      }
      placeFood();
    } else {
      sSnake.pop();
    }

    drawFrame();
  }

  function drawFrame() {
    var ctx = termCanvas.getContext('2d');
    var W   = termCanvas.width;
    var H   = termCanvas.height;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid
    ctx.fillStyle = '#161b22';
    for (var gx = 0; gx < sCols; gx++) {
      for (var gy = 0; gy < sRows; gy++) {
        ctx.fillRect(gx * CELL + CELL/2 - 1, gy * CELL + CELL/2 - 1, 2, 2);
      }
    }

    // Snake body
    sSnake.forEach(function (seg, i) {
      ctx.fillStyle = i === 0 ? '#3fb950' : '#238636';
      rr(ctx, seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 3);
    });

    // Food tile + letter
    if (sFood) {
      ctx.fillStyle = '#f0883e';
      rr(ctx, sFood.x * CELL + 2, sFood.y * CELL + 2, CELL - 4, CELL - 4, 3);
      ctx.fillStyle    = '#0d1117';
      ctx.font         = 'bold ' + (CELL - 5) + 'px "JetBrains Mono", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(FOOD_LETTERS[sFoodIdx], sFood.x * CELL + CELL/2, sFood.y * CELL + CELL/2 + 1);
    }

    // HUD
    ctx.fillStyle    = '#6e7681';
    ctx.font         = '11px "JetBrains Mono", monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    var eaten = FOOD_LETTERS.slice(0, sFoodIdx).join('') || '...';
    ctx.fillText('collected: ' + eaten + '  next: ' + FOOD_LETTERS[sFoodIdx], 6, 5);
    ctx.textAlign = 'right';
    ctx.fillText('len: ' + sSnake.length, W - 6, 5);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('arrow keys / wasd  ·  esc to quit', W / 2, H - 4);
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h,     x, y + h - r,     r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y,         x + r, y,         r);
    ctx.closePath();
    ctx.fill();
  }

  function gameOver() {
    stopSnake();
    line('');
    line('Game over. Snake collided.', 'tl-err');
    line('Run "sudo apt install snake" to play again.', 'tl-dim');
    termInput.focus();
  }

  function snakeWin() {
    stopSnake();

    // Open resume — same as the existing target="_blank" links
    window.open('ZaidAhmadCV.pdf', '_blank');

    var steps = [
      [0,    ''],
      [150,  'Reading package lists... Done',                              'tl'],
      [450,  'Building dependency tree... Done',                           'tl'],
      [700,  ''],
      [800,  'Setting up zaid-ahmad (latest) ...',                         'tl'],
      [1300, 'Processing triggers for career-db (2026.05) ...',            'tl'],
      [1700, ''],
      [1800, "✓ Package 'Zaid Ahmad' successfully installed.",        'tl-acc'],
      [2050, '  Skills: C · Python · Linux · React Native · AWS', 'tl-dim'],
      [2250, '  Location: Ottawa, ON',                                     'tl-dim'],
      [2450, '  Status: actively looking for internships',                 'tl-dim'],
      [2700, ''],
      [2800, 'Resume opened in a new tab.',                                'tl'],
      [2900, ''],
    ];

    steps.forEach(function (s) {
      setTimeout(function () { line(s[1], s[2]); }, s[0]);
    });

    // Fallback clickable link in case popup was blocked
    setTimeout(function () {
      var d = document.createElement('div');
      d.className = 'tl-acc';
      var a = document.createElement('a');
      a.href   = 'ZaidAhmadCV.pdf';
      a.target = '_blank';
      a.style.cssText = 'color:#58a6ff; text-decoration:underline;';
      a.textContent   = '  → view resume';
      d.appendChild(a);
      termOutput.appendChild(d);
      termOutput.scrollTop = termOutput.scrollHeight;
    }, 3000);

    setTimeout(function () {
      termInputRow.style.display = '';
      termInput.focus();
    }, 3200);
  }

  // ── Global keyboard ───────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      overlay.classList.contains('open') ? closeTerm() : openTerm();
      return;
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
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
