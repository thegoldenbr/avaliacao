/* Aplica tema e fonte antes do primeiro quadro. Parâmetros: ?tema=claro|escuro&fonte=a|b */
(function () {
  var p = new URLSearchParams(location.search);
  var t = p.get('tema');
  if (t !== 'claro' && t !== 'escuro') {
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }
  var d = document.documentElement;
  d.dataset.tema = t;
  d.dataset.fonte = p.get('fonte') === 'a' ? 'a' : 'b';
  d.lang = 'pt-BR';
})();
