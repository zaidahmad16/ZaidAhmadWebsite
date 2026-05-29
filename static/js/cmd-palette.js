(function () {
  'use strict';

  var COMMANDS = [
    { label: 'Go to About',      hint: '↓', action: function () { jumpTo('about'); } },
    { label: 'Go to Work',       hint: '↓', action: function () { jumpTo('work'); } },
    { label: 'Go to Experience', hint: '↓', action: function () { jumpTo('experience'); } },
    { label: 'Go to Contact',    hint: '↓', action: function () { jumpTo('contact'); } },
    { label: 'Open Resume',      hint: '↗', action: function () { window.open('static/docs/ZaidAhmadCV.pdf', '_blank'); } },
    { label: 'GitHub',           hint: '↗', action: function () { window.open('https://github.com/zaidahmad16', '_blank'); } },
    { label: 'LinkedIn',         hint: '↗', action: function () { window.open('https://linkedin.com/in/zaid-ahmad-ba9b10224', '_blank'); } },
    { label: 'Toggle Theme',     hint: '◐', action: function () { var t = document.getElementById('theme-toggle'); if (t) t.click(); } },
    { label: 'Open Terminal',    hint: '$', action: function () { if (typeof window.openPortfolioTerm === 'function') window.openPortfolioTerm(); } },
  ];

  var overlay = null, inputEl = null, listEl = null;
  var filtered = [], selectedIdx = 0;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'cmd-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Command palette');

    var box = document.createElement('div');
    box.className = 'cmd-box';

    var inputRow = document.createElement('div');
    inputRow.className = 'cmd-input-row';

    var icon = document.createElement('span');
    icon.className = 'cmd-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '>';

    inputEl = document.createElement('input');
    inputEl.className = 'cmd-input';
    inputEl.type = 'text';
    inputEl.placeholder = 'Type a command or search...';
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');

    inputRow.appendChild(icon);
    inputRow.appendChild(inputEl);

    listEl = document.createElement('ul');
    listEl.className = 'cmd-list';
    listEl.setAttribute('role', 'listbox');

    var footer = document.createElement('div');
    footer.className = 'cmd-footer';
    footer.innerHTML =
      '<span class="cmd-key"><kbd>↑↓</kbd> navigate</span>' +
      '<span class="cmd-key"><kbd>↵</kbd> open</span>' +
      '<span class="cmd-key"><kbd>esc</kbd> close</span>';

    box.appendChild(inputRow);
    box.appendChild(listEl);
    box.appendChild(footer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onKeydown);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  }

  function render() {
    listEl.innerHTML = '';

    if (filtered.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'cmd-empty';
      empty.textContent = 'No commands found.';
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach(function (cmd, i) {
      var item = document.createElement('li');
      item.className = 'cmd-item' + (i === selectedIdx ? ' selected' : '');
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(i === selectedIdx));

      var label = document.createElement('span');
      label.className = 'cmd-item-label';
      label.textContent = cmd.label;

      var hint = document.createElement('span');
      hint.className = 'cmd-item-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = cmd.hint;

      item.appendChild(label);
      item.appendChild(hint);

      item.addEventListener('mouseenter', function () {
        selectedIdx = i;
        listEl.querySelectorAll('.cmd-item').forEach(function (el, j) {
          el.classList.toggle('selected', j === i);
          el.setAttribute('aria-selected', String(j === i));
        });
      });
      item.addEventListener('click', function () { execute(i); });

      listEl.appendChild(item);
    });

    var sel = listEl.querySelector('.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function onInput() {
    var q = inputEl.value.toLowerCase().trim();
    filtered = q
      ? COMMANDS.filter(function (c) { return c.label.toLowerCase().indexOf(q) !== -1; })
      : COMMANDS.slice();
    selectedIdx = 0;
    render();
  }

  function onKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, filtered.length - 1);
        render();
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        render();
        break;
      case 'Enter':
        e.preventDefault();
        execute(selectedIdx);
        break;
      case 'Escape':
        close();
        break;
    }
  }

  function execute(idx) {
    var cmd = filtered[idx];
    if (!cmd) return;
    close();
    setTimeout(cmd.action, 80);
  }

  function jumpTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
  }

  function open() {
    if (!overlay) build();
    inputEl.value = '';
    filtered = COMMANDS.slice();
    selectedIdx = 0;
    render();
    overlay.classList.add('open');
    setTimeout(function () { inputEl.focus(); }, 30);
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  // Global keyboard trigger
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      overlay && overlay.classList.contains('open') ? close() : open();
    }
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      close();
    }
  });

  window.openCommandPalette = open;
}());
