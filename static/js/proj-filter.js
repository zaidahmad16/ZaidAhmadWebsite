(function () {
  var btns = document.querySelectorAll('.proj-filter-btn');
  var rows = document.querySelectorAll('.proj-row[data-cat]');
  if (!btns.length || !rows.length) return;

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.dataset.filter;

      btns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      rows.forEach(function (row) {
        var show = filter === 'all' || row.dataset.cat === filter;
        row.classList.toggle('is-hidden', !show);
      });
    });
  });
})();
