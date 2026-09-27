/* Script clássico, carregado no <head> antes do CSS: aplica o tema antes do primeiro quadro (sem piscar). */
(function () {
  var escolha = 'sistema';
  try { escolha = localStorage.getItem('tema') || 'sistema'; } catch (e) {}
  var escuro = escolha === 'escuro' || (escolha !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
})();
