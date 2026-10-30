/* term-screen.js — a tiny ncurses-style text screen for the terminal easter eggs (snake.js, htop.js).
   It takes over #term-body with a <pre>, keeps a character buffer with a CSS class per cell, and
   flushes it as text with as few <span>s as possible. Cells can carry a data-act for click handling. */
(function () {
'use strict';

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function create(opts) {
  var body = opts.body;
  var root = document.createElement('div');
  root.className = 'ts-root' + (opts.className ? ' ' + opts.className : '');
  var pre = document.createElement('pre');
  pre.className = 'ts-screen';
  if (opts.label) pre.setAttribute('aria-label', opts.label);
  root.appendChild(pre);
  body.classList.add('ts-on');
  body.appendChild(root);

  var buf = [];
  var scr = {
    root: root, pre: pre, cols: 0, rows: 0,

    // Work out how many characters fit, from the size of the font's character box
    measure: function () {
      var probe = document.createElement('span');
      probe.textContent = 'MMMMMMMMMM';
      probe.style.visibility = 'hidden';
      pre.appendChild(probe);
      var r = probe.getBoundingClientRect();
      pre.removeChild(probe);
      var cw = r.width / 10 || 8, lh = parseFloat(getComputedStyle(pre).lineHeight) || r.height || 16;
      scr.cols = Math.max(24, Math.floor(pre.clientWidth / cw));
      scr.rows = Math.max(12, Math.floor(pre.clientHeight / lh));
      return scr;
    },

    clear: function () {
      buf = [];
      for (var y = 0; y < scr.rows; y++) {
        var row = [];
        for (var x = 0; x < scr.cols; x++) row.push({ ch: ' ', cls: '' });
        buf.push(row);
      }
    },

    put: function (x, y, str, cls, act) {
      if (y < 0 || y >= scr.rows) return;
      for (var i = 0; i < str.length; i++) {
        var xx = x + i;
        if (xx < 0 || xx >= scr.cols) continue;
        buf[y][xx] = { ch: str[i], cls: cls || '', act: act };
      }
    },

    fillRow: function (y, cls, act) {
      if (y < 0 || y >= scr.rows) return;
      for (var x = 0; x < scr.cols; x++) buf[y][x] = { ch: ' ', cls: cls || '', act: act };
    },

    box: function (x, y, w, h, title, cls) {
      cls = cls || 'ts-frame';
      for (var j = 0; j < h; j++) scr.put(x, y + j, ' '.repeat(w), 'ts-dlg');
      scr.put(x, y, '┌' + '─'.repeat(w - 2) + '┐', cls);
      for (var k = 1; k < h - 1; k++) { scr.put(x, y + k, '│', cls); scr.put(x + w - 1, y + k, '│', cls); }
      scr.put(x, y + h - 1, '└' + '─'.repeat(w - 2) + '┘', cls);
      if (title) scr.put(x + Math.floor((w - title.length - 2) / 2), y, ' ' + title + ' ', cls + ' ts-strong');
    },

    center: function (y, str, cls, act) { scr.put(Math.floor((scr.cols - str.length) / 2), y, str, cls, act); },

    flush: function () {
      var html = '';
      for (var y = 0; y < scr.rows; y++) {
        var row = buf[y], cur = null, text = '';
        for (var x = 0; x <= scr.cols; x++) {
          var c = row[x];
          var key = c ? c.cls + '|' + (c.act || '') : null;
          if (key !== cur) {
            if (cur !== null) {
              var parts = cur.split('|');
              html += (parts[0] || parts[1])
                ? '<span' + (parts[0] ? ' class="' + parts[0] + '"' : '') + (parts[1] ? ' data-act="' + esc(parts[1]) + '"' : '') + '>' + esc(text) + '</span>'
                : esc(text);
            }
            cur = key; text = '';
          }
          if (c) text += c.ch;
        }
        html += '\n';
      }
      pre.innerHTML = html;
    },

    destroy: function () {
      body.classList.remove('ts-on');
      root.remove();
    },
  };
  return scr;
}

window.TermScreen = { create: create };
})();
