(function () {
  'use strict';

  function init() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var dot = document.getElementById('cursor-dot');
    if (!dot) return;

    var mx = -200, my = -200;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate(' + (mx - 3) + 'px, ' + (my - 3) + 'px)';
      if (!dot.classList.contains('visible')) dot.classList.add('visible');
    }, { passive: true });

    document.addEventListener('mousedown', function () { dot.classList.add('click'); });
    document.addEventListener('mouseup',   function () { dot.classList.remove('click'); });

    document.addEventListener('mouseleave', function () { dot.classList.remove('visible'); });
    document.addEventListener('mouseenter', function () { dot.classList.add('visible'); });

    var SELECTORS = 'a, button, .proj-row-link, .ct-link, .sn-link, .id-btn, .back-link, .pp-github';

    function attach() {
      document.querySelectorAll(SELECTORS).forEach(function (el) {
        if (el._cursorBound) return;
        el._cursorBound = true;
        el.addEventListener('mouseenter', function () { dot.classList.add('hover'); });
        el.addEventListener('mouseleave', function () { dot.classList.remove('hover'); });
      });
    }

    attach();

    var observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
