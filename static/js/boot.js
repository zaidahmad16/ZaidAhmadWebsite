// Start-up glue that used to be inline in index.html (moved here so the Content-Security-Policy can
// forbid inline scripts): the Pokémon battle, the page switcher, and the buttons that were onclick=.
initPokemonBattle();
window._switchPage = function (id) {
  document.dispatchEvent(new CustomEvent('switchpage', { detail: id }));
};
document.addEventListener('switchpage', function (e) {
  var fn = window.__cinSwitchPage;
  if (fn) fn(e.detail);
});
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-switch-page], [data-open-term]');
  if (!el) return;
  e.preventDefault();
  if (el.hasAttribute('data-switch-page')) window._switchPage(el.getAttribute('data-switch-page'));
  else if (window.openPortfolioTerm) window.openPortfolioTerm();
});
