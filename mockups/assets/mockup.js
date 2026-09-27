/* Auxiliares dos mockups: ícones (Lucide, inline), shell da área interna e gráfico radar. */
(function () {
  var I = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    clip: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    mais: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    ajustes: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    dir: '<path d="m9 18 6-6-6-6"/>',
    esq: '<path d="m15 18-6-6 6-6"/>',
    baixo: '<path d="m6 9 6 6 6-6"/>',
    copia: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    ia: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    aviso: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    critico: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    estrela: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    alca: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
    sobe: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    desce: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    lixo: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    olho: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    pessoas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    cadeado: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    zap: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    celular: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    refaz: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    calendario: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    negrito: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    italico: '<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',
    lista: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    copiar2: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    imagem: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    editar: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'
  };
  var ESTILOS = {
    atual: { cls: 'serie--atual', dash: '' },
    anterior: { cls: 'serie--anterior', dash: '7 5' },
    meta: { cls: 'serie--meta', dash: '2 5' },
    media: { cls: 'serie--media', dash: '10 4 2 4' }
  };
  var FAIXA_ICONE = { critico: 'critico', atencao: 'aviso', bom: 'ok', excelente: 'estrela' };
  function icone(nome, cls) {
    return '<svg class="icone ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (I[nome] || '') + '</svg>';
  }
  window.MK = { icone: icone };

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  ready(function () {
    document.querySelectorAll('i[data-i]').forEach(function (el) {
      var tmp = document.createElement('span');
      tmp.innerHTML = icone(el.dataset.i, el.dataset.cls);
      el.replaceWith(tmp.firstChild);
    });
    document.querySelectorAll('[data-faixa-icone]').forEach(function (el) {
      var tmp = document.createElement('span');
      tmp.innerHTML = icone(FAIXA_ICONE[el.dataset.faixaIcone], 'icone--sm');
      el.prepend(tmp.firstChild);
    });
    montarShell();
    document.querySelectorAll('.radar-host').forEach(desenharRadar);
  });

  /* ---------- Shell da área interna ---------- */
  function montarShell() {
    var ativo = document.body.dataset.ativo;
    if (!ativo) return;
    var main = document.querySelector('main');
    var itens = [
      ['inicio', 'Início', 'home', 'inicio.html'],
      ['empresas', 'Empresas', 'building', 'empresas.html'],
      ['avaliacoes', 'Avaliações', 'clip', 'avaliacao-detalhe.html'],
      ['questionarios', 'Questionários', 'file', 'questionario-editor.html']
    ];
    var lateral = itens.concat([['config', 'Configurações', 'ajustes', 'configuracoes.html']]);
    var baixo = itens.concat([['config', 'Mais', 'mais', 'configuracoes.html']]);
    function link(it, extra) {
      return '<a href="' + it[3] + '"' + (ativo === it[0] ? ' aria-current="page"' : '') + '>' + icone(it[2]) + '<span>' + it[1] + '</span></a>';
    }
    var app = document.createElement('div');
    app.className = 'app';
    app.innerHTML =
      '<aside class="lateral"><div class="marca"><span class="marca-logo" aria-hidden="true">V</span><span>Vértice Consultoria</span></div>' +
      '<nav aria-label="Principal">' + lateral.map(link).join('') + '</nav>' +
      '<div class="usuario"><b>Marina Albuquerque</b><span class="muted">Administradora</span><a href="login.html">Sair</a></div></aside>';
    main.classList.add('principal');
    app.appendChild(main);
    var nav = document.createElement('nav');
    nav.className = 'nav-baixo';
    nav.setAttribute('aria-label', 'Principal');
    nav.innerHTML = baixo.map(link).join('');
    document.body.appendChild(app);
    document.body.appendChild(nav);
  }

  /* ---------- Radar ---------- */
  function desenharRadar(host) {
    var rotulos = JSON.parse(host.dataset.rotulos);
    var series = JSON.parse(host.dataset.series);
    var n = rotulos.length, cx = 200, cy = 200, R = 128;
    function pt(i, v) {
      var a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + Math.cos(a) * R * (v / 10), cy + Math.sin(a) * R * (v / 10)];
    }
    var s = '<svg class="radar' + (host.dataset.anima ? ' radar--anima' : '') + '" viewBox="0 0 400 400" role="img" aria-label="' + (host.dataset.titulo || 'Radar de desempenho por grupo, escala de 0 a 10') + '">';
    [2, 4, 6, 8, 10].forEach(function (v) {
      var pts = rotulos.map(function (_, i) { return pt(i, v).join(','); }).join(' ');
      s += '<polygon class="anel' + (v === 10 ? ' anel--fora' : '') + '" points="' + pts + '"/>';
    });
    rotulos.forEach(function (_, i) { var p = pt(i, 10); s += '<line class="eixo" x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '"/>'; });
    [0, 5, 10].forEach(function (v) { s += '<text class="escala-txt" x="' + (cx + 4) + '" y="' + (cy - R * v / 10 + 4) + '">' + v + '</text>'; });
    series.slice().reverse().forEach(function (se) {
      var st = ESTILOS[se.tipo];
      s += '<polygon class="serie ' + st.cls + '" points="' + se.valores.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '"/>';
    });
    series.filter(function (se) { return se.tipo === 'atual'; }).forEach(function (se) {
      se.valores.forEach(function (v, i) { var p = pt(i, v); s += '<circle class="ponto" cx="' + p[0] + '" cy="' + p[1] + '" r="5"><title>' + rotulos[i] + ': ' + fmt(v) + '</title></circle>'; });
    });
    rotulos.forEach(function (r, i) {
      var a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      var x = cx + Math.cos(a) * (R + 22), y = cy + Math.sin(a) * (R + 22) + 5;
      var anc = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
      s += '<text x="' + x + '" y="' + y + '" text-anchor="' + anc + '">' + r + '</text>';
    });
    s += '</svg>';
    var leg = '<ul class="legenda">' + series.map(function (se) {
      var st = ESTILOS[se.tipo], cor = { atual: 'var(--color-primary)', anterior: 'var(--serie-anterior)', meta: 'var(--serie-meta)', media: 'var(--serie-media)' }[se.tipo];
      return '<li><svg viewBox="0 0 32 8" aria-hidden="true"><line x1="0" y1="4" x2="32" y2="4" stroke="' + cor + '" stroke-width="3" stroke-dasharray="' + st.dash + '"/></svg>' + se.nome + '</li>';
    }).join('') + '</ul>';
    var tab = '<table class="sr-only"><caption>Notas por grupo</caption><thead><tr><th>Grupo</th>' + series.map(function (se) { return '<th>' + se.nome + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rotulos.map(function (r, i) { return '<tr><th>' + r + '</th>' + series.map(function (se) { return '<td>' + fmt(se.valores[i]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    host.innerHTML = s + (host.dataset.semLegenda ? '' : leg) + tab;
  }
  function fmt(v) { return v.toFixed(1).replace('.', ','); }
})();
