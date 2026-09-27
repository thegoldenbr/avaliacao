/** Modo de apresentação (operador): busca o snapshot atual da avaliação e delega o desenho a apresentacao-vista.js. */
import { html } from '../html.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { montarApresentacao } from '../apresentacao-vista.js';
import { statusTemIndicadores } from './_avaliacao-indicadores.js';
import { SELECAO_AVALIACAO, obterSnapshotAtual } from './_snapshot-atual.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes', semShell: true });
const id = new URLSearchParams(location.search).get('id');
const { data: av } = await supabase.from('avaliacoes').select(SELECAO_AVALIACAO).eq('id', id ?? '').maybeSingle();

if (!av || !statusTemIndicadores(av.status)) {
  main.innerHTML = String(html`<div class="ap-vazio"><h1>Nada para apresentar ainda</h1><p>Esta avaliação ainda não foi respondida. <a class="link" href="${av ? `avaliacao.html?id=${av.id}` : 'avaliacoes.html'}">Voltar</a></p></div>`);
  throw new Error('sem respostas');
}

const { snapshot, marca, rodape } = await obterSnapshotAtual(av);
document.title = `Apresentação — ${snapshot.empresa}`;
montarApresentacao(main, { snapshot, marca, rodape, sair: `avaliacao.html?id=${av.id}` });

// Marca que o operador já apresentou: condição para depois poder liberar o modo de apresentação ao cliente.
// Sem then()/await a chamada nunca sai (o builder do Supabase só executa quando "resolvido").
if (!av.apresentacao_realizada_em) supabase.from('avaliacoes').update({ apresentacao_realizada_em: new Date().toISOString() }).eq('id', av.id).then(() => {});
