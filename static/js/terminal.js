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
        line('  sudo apt install snake    unlock a mini-game',      'tl');
        line('  sudo apt install pokemon  start a Pokémon battle',  'tl');
        line('  pokemon                   start a Pokémon battle',  'tl');
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

      case 'apt':
        line('E: Could not open lock file /var/lib/dpkg/lock-frontend (13: Permission denied)', 'tl-err');
        line('E: Unable to lock the administration directory — are you root?', 'tl-err');
        break;

      case 'sudo':
        if (args[0] === 'apt' && args[1] === 'install' && args[2] === 'snake') {
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

      case 'pokemon':
        line('Starting Pokémon battle...', 'tl-acc');
        setTimeout(function () {
          closeTerm();
          if (typeof window.startPokemonBattle === 'function') {
            window.startPokemonBattle();
          }
        }, 600);
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
      { text: 'Languages: C · Python · JS',     cls: 'tl' },
      { text: 'Focus: DevOps · Embedded',       cls: 'tl' },
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

  // ── Snake game — full redesign ────────────────────────────────
  var CELL         = 18;
  var FOOD_LETTERS = ['Z','A','I','D','A','H','M','A','D'];

  var particles  = [];
  var sScore     = 0;
  var sHighScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
  var paused     = false;
  var snakeOverlay = null, skCanvas = null, skScoreEl = null, skBestEl = null;

  var sSnake, sDir, sNextDir, sFood, sFoodIdx, sCols, sRows;

  /* ── Build the dedicated game overlay ──── */
  function buildSnakeOverlay() {
    var ov = document.createElement('div');
    ov.className = 'sk-overlay'; ov.id = 'sk-overlay';

    var panel = document.createElement('div');
    panel.className = 'sk-panel';

    /* Header */
    var hdr = document.createElement('header');
    hdr.className = 'sk-header';

    var exitBtn = document.createElement('button');
    exitBtn.className = 'sk-btn-exit';
    exitBtn.textContent = 'esc';
    exitBtn.addEventListener('click', function () { stopSnake(); });

    var lbl = document.createElement('span');
    lbl.className = 'sk-title';
    lbl.textContent = 'snake';

    var hud = document.createElement('div');
    hud.className = 'sk-hud';

    skScoreEl = document.createElement('span');
    skScoreEl.className = 'sk-hud-score';
    skScoreEl.textContent = '0';

    var sep = document.createElement('span');
    sep.className = 'sk-hud-sep';
    sep.textContent = '\xb7';

    skBestEl = document.createElement('span');
    skBestEl.className = 'sk-hud-best';
    skBestEl.textContent = 'best: ' + sHighScore;

    hud.appendChild(skScoreEl); hud.appendChild(sep); hud.appendChild(skBestEl);
    hdr.appendChild(exitBtn); hdr.appendChild(lbl); hdr.appendChild(hud);

    /* Canvas wrap */
    var wrap = document.createElement('div');
    wrap.className = 'sk-canvas-wrap';
    skCanvas = document.createElement('canvas');
    wrap.appendChild(skCanvas);

    /* Footer */
    var ftr = document.createElement('footer');
    ftr.className = 'sk-footer';
    ftr.textContent = 'arrows \xb7 wasd \xb7 space = pause \xb7 esc = quit';

    panel.appendChild(hdr); panel.appendChild(wrap); panel.appendChild(ftr);
    ov.appendChild(panel);
    document.body.appendChild(ov);
    snakeOverlay = ov;
  }

  function startSnake() {
    sScore = 0; paused = false; particles = [];
    buildSnakeOverlay();

    requestAnimationFrame(function () {
      var wrap = skCanvas.parentElement;
      sCols = Math.floor(wrap.clientWidth  / CELL);
      sRows = Math.floor(wrap.clientHeight / CELL);
      skCanvas.width  = sCols * CELL;
      skCanvas.height = sRows * CELL;

      var cx = Math.floor(sCols / 2);
      var cy = Math.floor(sRows / 2);
      sSnake   = [{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
      sDir     = {x:1,y:0};
      sNextDir = {x:1,y:0};
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
    snakeRunning  = false;
    clearInterval(snakeInterval);
    snakeInterval = null;
    document.removeEventListener('keydown', snakeKeys);
    if (snakeOverlay) { snakeOverlay.remove(); snakeOverlay = skCanvas = skScoreEl = skBestEl = null; }
    termInputRow.style.display = '';
  }

  function placeFood() {
    var pos;
    do { pos = { x: Math.floor(Math.random()*sCols), y: Math.floor(Math.random()*sRows) }; }
    while (sSnake.some(function(s){ return s.x===pos.x && s.y===pos.y; }));
    sFood = pos;
  }

  function playEat() {
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 900;
      g.gain.setValueAtTime(0.09, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.11);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.13);
    } catch(e) {}
  }

  function spawnParticles(x, y, color) {
    for (var i = 0; i < 14; i++) {
      var angle = (i/14)*Math.PI*2 + Math.random()*0.3;
      var spd   = 1.5 + Math.random()*4;
      particles.push({ x:x, y:y, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
        life:1, decay:0.05+Math.random()*0.04, size:1.5+Math.random()*2.5, color:color });
    }
  }

  function updateParticles() {
    particles = particles.filter(function(p){
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life-=p.decay; return p.life>0;
    });
  }

  /* Snake color: head (t=0) = electric blue, tail (t=1) = dark navy */
  function snakeColor(t) {
    var r = Math.round(91*(1-t) + 13*t);
    var g = Math.round(154*(1-t) + 28*t);
    var b = Math.round(245*(1-t) + 70*t);
    return 'rgb('+r+','+g+','+b+')';
  }

  function snakeKeys(e) {
    if (!snakeRunning) return;
    if (e.key === 'Escape') {
      e.stopImmediatePropagation();
      stopSnake();
      return;
    }
    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      paused = !paused;
      if (!paused) drawFrame();
      return;
    }
    if (paused) return;
    var map = {
      ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
      ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
      w:{x:0,y:-1}, W:{x:0,y:-1}, s:{x:0,y:1}, S:{x:0,y:1},
      a:{x:-1,y:0}, A:{x:-1,y:0}, d:{x:1,y:0}, D:{x:1,y:0},
    };
    var nd = map[e.key];
    if (nd && !(nd.x===-sDir.x && nd.y===-sDir.y)) { sNextDir=nd; e.preventDefault(); }
  }

  function snakeTick() {
    if (paused) return;
    sDir = sNextDir;
    var head = {x: sSnake[0].x+sDir.x, y: sSnake[0].y+sDir.y};

    if (head.x<0 || head.x>=sCols || head.y<0 || head.y>=sRows) return gameOver();
    if (sSnake.some(function(s){ return s.x===head.x && s.y===head.y; })) return gameOver();

    sSnake.unshift(head);

    if (head.x===sFood.x && head.y===sFood.y) {
      sScore++;
      if (sScore > sHighScore) { sHighScore=sScore; localStorage.setItem('snakeHighScore',String(sHighScore)); }
      playEat();
      spawnParticles(sFood.x*CELL+CELL/2, sFood.y*CELL+CELL/2, '#f09040');
      if (skScoreEl) skScoreEl.textContent = String(sScore);
      if (skBestEl)  skBestEl.textContent  = 'best: '+sHighScore;
      sFoodIdx++;
      if (sFoodIdx >= FOOD_LETTERS.length) { drawFrame(); return snakeWin(); }
      placeFood();
      clearInterval(snakeInterval);
      snakeInterval = setInterval(snakeTick, Math.max(55, 115-(sSnake.length-3)*4));
    } else {
      sSnake.pop();
    }
    drawFrame();
  }

  function drawFrame() {
    if (!skCanvas) return;
    var ctx = skCanvas.getContext('2d');
    var W = skCanvas.width, H = skCanvas.height;

    /* Background */
    ctx.fillStyle = '#050d1a';
    ctx.fillRect(0, 0, W, H);

    /* Dot grid */
    ctx.fillStyle = '#0b1628';
    for (var gx=0; gx<sCols; gx++) {
      for (var gy=0; gy<sRows; gy++) {
        ctx.fillRect(gx*CELL+CELL/2-0.5, gy*CELL+CELL/2-0.5, 1, 1);
      }
    }

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#5b9af5';
      ctx.font = '12px "JetBrains Mono",monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('paused \xb7 space to resume', W/2, H/2);
      return;
    }

    /* Food — pulsing circle with glow */
    if (sFood) {
      var fx = sFood.x*CELL+CELL/2, fy = sFood.y*CELL+CELL/2;
      var pulse = 0.87 + 0.13*Math.sin(Date.now()/260);
      ctx.save();
      ctx.shadowColor='#f09040'; ctx.shadowBlur=18;
      ctx.fillStyle='#f09040';
      ctx.beginPath(); ctx.arc(fx, fy, CELL*0.46*pulse, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      ctx.fillStyle='#080e1c';
      ctx.font='bold '+Math.round(CELL*0.6)+'px "JetBrains Mono",monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(FOOD_LETTERS[sFoodIdx], fx, fy+1);
    }

    /* Snake — draw connections first, then segments on top */
    var segW = CELL*0.66, hw = segW/2;

    for (var i=0; i<sSnake.length-1; i++) {
      var a=sSnake[i], b=sSnake[i+1];
      ctx.fillStyle = snakeColor((i+0.5)/Math.max(1,sSnake.length-1));
      var ax=a.x*CELL+CELL/2, ay=a.y*CELL+CELL/2;
      var bx=b.x*CELL+CELL/2, by=b.y*CELL+CELL/2;
      if (a.x!==b.x) ctx.fillRect(Math.min(ax,bx), ay-hw, Math.abs(ax-bx), segW);
      else            ctx.fillRect(ax-hw, Math.min(ay,by), segW, Math.abs(ay-by));
    }

    for (var i=sSnake.length-1; i>=0; i--) {
      var seg=sSnake[i], t=i/Math.max(1,sSnake.length-1);
      ctx.fillStyle = snakeColor(t);
      if (i===0) { ctx.save(); ctx.shadowColor='#5b9af5'; ctx.shadowBlur=22; }
      var r = i===0 ? CELL*0.4 : CELL*0.29;
      rr(ctx, seg.x*CELL+CELL/2-hw, seg.y*CELL+CELL/2-hw, segW, segW, r);
      if (i===0) ctx.restore();
    }
    ctx.shadowBlur=0;

    /* Particles */
    updateParticles();
    particles.forEach(function(p){
      ctx.globalAlpha = Math.max(0,p.life);
      ctx.fillStyle = p.color; ctx.shadowColor=p.color; ctx.shadowBlur=5;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.arcTo(x+w,y, x+w,y+r, r); ctx.lineTo(x+w,y+h-r);
    ctx.arcTo(x+w,y+h, x+w-r,y+h, r); ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h, x,y+h-r, r); ctx.lineTo(x,y+r);
    ctx.arcTo(x,y, x+r,y, r);
    ctx.closePath(); ctx.fill();
  }

  function gameOver() {
    if (!skCanvas) return;
    var ctx = skCanvas.getContext('2d');
    var W=skCanvas.width, H=skCanvas.height, fl=0;
    var iv = setInterval(function(){
      ctx.fillStyle = fl%2===0 ? 'rgba(180,18,18,0.42)' : 'transparent';
      ctx.fillRect(0,0,W,H); fl++;
      if (fl>=6) {
        clearInterval(iv);
        var sc=sScore, bst=sHighScore;
        stopSnake();
        line('');
        line('game over \xb7 score: '+sc+' \xb7 best: '+bst, 'tl-err');
        line('type "sudo apt install snake" to play again', 'tl-dim');
        termInput.focus();
      }
    }, 82);
  }

  function snakeWin() {
    var finalScore = sScore;
    stopSnake();
    window.open('static/docs/ZaidAhmadCV.pdf', '_blank');

    var steps = [
      [0,    ''],
      [150,  'Reading package lists... Done',                         'tl'],
      [450,  'Building dependency tree... Done',                      'tl'],
      [700,  ''],
      [800,  'Setting up zaid-ahmad (latest) ...',                    'tl'],
      [1300, 'Processing triggers for career-db (2026.05) ...',        'tl'],
      [1700, ''],
      [1800, "✓ Package 'Zaid Ahmad' successfully installed.",    'tl-acc'],
      [2050, '  Skills: C \xb7 Python \xb7 Linux \xb7 React \xb7 ARM', 'tl-dim'],
      [2250, '  Status: actively seeking internships',                 'tl-dim'],
      [2700, ''],
      [2800, 'Resume opened in a new tab.',                            'tl'],
      [2900, ''],
    ];

    steps.forEach(function(s){ setTimeout(function(){ line(s[1],s[2]); }, s[0]); });

    setTimeout(function(){
      var d=document.createElement('div'); d.className='tl-acc';
      var a=document.createElement('a');
      a.href='static/docs/ZaidAhmadCV.pdf'; a.target='_blank';
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
