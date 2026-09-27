// Edge Function: gerar-relatorio
// Valida o JWT e o perfil ativo, lê os dados COM O JWT DO USUÁRIO (a RLS vale), calcula os indicadores
// no código (a IA nunca calcula notas), pede o texto ao modelo, valida, tenta mais uma vez se preciso
// e grava em relatorios.conteudo_ia e conteudo_rascunho.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { calcularIndicadores, classificar, gerarInsights } from '../_shared/indicadores.js';
import { INSTRUCOES_DO_SISTEMA, converterCodigos, esquemaDaFerramenta, montarContexto, validarResultado } from '../_shared/relatorio-ia.js';
import { ErroDoModelo, chamarModelo, modeloConfigurado } from './llm.ts';

const URLS_PERMITIDAS = (Deno.env.get('APP_URLS') ?? 'https://thegoldenbr.github.io/avaliacao/,http://localhost:5173/,http://localhost/avaliacao/')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
const ORIGENS = new Set(URLS_PERMITIDAS.map((u) => { try { return new URL(u).origin; } catch { return ''; } }).filter(Boolean));
const STATUS_COM_RESPOSTA = ['respondida', 'em_analise', 'publicada'];
const FAIXAS_PADRAO = [
  { id: 'critico', rotulo: 'Crítico', de: 0, ate: 4.9 },
  { id: 'atencao', rotulo: 'Atenção', de: 5, ate: 6.9 },
  { id: 'bom', rotulo: 'Bom', de: 7, ate: 8.4 },
  { id: 'excelente', rotulo: 'Excelente', de: 8.5, ate: 10 },
];

function cors(req: Request): Record<string, string> {
  const origem = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENS.has(origem) ? origem : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
const responder = (req: Request, corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

// deno-lint-ignore no-explicit-any
type Linha = any;

function montarGrupos(av: Linha, respostas: Linha[]) {
  const porPergunta = new Map(respostas.map((r) => [r.pergunta_id, r]));
  return [...av.avaliacao_grupos]
    .sort((a: Linha, b: Linha) => a.ordem - b.ordem)
    .map((g: Linha) => ({
      ...g,
      perguntas: [...g.avaliacao_perguntas]
        .sort((a: Linha, b: Linha) => a.ordem - b.ordem)
        .map((p: Linha) => ({ ...p, nota: porPergunta.get(p.id)?.nota ?? null, comentario: porPergunta.get(p.id)?.comentario ?? null })),
    }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return responder(req, { erro: 'Método não permitido.' }, 405);

  const urlSupabase = Deno.env.get('SUPABASE_URL');
  const chaveAnon = Deno.env.get('SUPABASE_ANON_KEY');
  const autorizacao = req.headers.get('Authorization');
  if (!urlSupabase || !chaveAnon) return responder(req, { erro: 'Função mal configurada.' }, 500);
  if (!autorizacao) return responder(req, { erro: 'Entre no sistema para gerar a análise.' }, 401);

  const db = createClient(urlSupabase, chaveAnon, { global: { headers: { Authorization: autorizacao } } });
  const { data: dadosUsuario, error: erroUsuario } = await db.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) return responder(req, { erro: 'Sessão inválida. Entre de novo.' }, 401);
  const { data: perfil } = await db.from('perfis').select('ativo').eq('id', dadosUsuario.user.id).maybeSingle();
  if (!perfil?.ativo) return responder(req, { erro: 'Seu acesso não está ativo.' }, 403);

  let corpo: Linha;
  try {
    corpo = await req.json();
  } catch {
    return responder(req, { erro: 'Pedido inválido.' }, 400);
  }
  const avaliacaoId = corpo?.avaliacao_id;
  const instrucoes = typeof corpo?.instrucoes === 'string' ? corpo.instrucoes.slice(0, 800) : '';
  if (typeof avaliacaoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(avaliacaoId)) return responder(req, { erro: 'Avaliação inválida.' }, 400);

  // Dados (RLS do usuário)
  const seletor = '*, empresas(segmento, porte), avaliacao_grupos(*, avaliacao_perguntas(*))';
  const { data: av } = await db.from('avaliacoes').select(seletor).eq('id', avaliacaoId).maybeSingle();
  if (!av) return responder(req, { erro: 'Avaliação não encontrada.' }, 404);
  if (!STATUS_COM_RESPOSTA.includes(av.status)) return responder(req, { erro: 'A avaliação ainda não foi respondida.' }, 409);

  const { data: respostas } = await db.from('respostas').select('pergunta_id, nota, comentario').eq('avaliacao_id', av.id);
  const { data: config } = await db.from('configuracoes').select('faixas').eq('id', true).maybeSingle();
  const faixas = Array.isArray(config?.faixas) && config.faixas.length === 4 ? config.faixas : FAIXAS_PADRAO;
  const indicadores = calcularIndicadores(montarGrupos(av, respostas ?? []));
  if (indicadores.geral === null) return responder(req, { erro: 'Não há respostas para analisar.' }, 409);

  // Avaliação anterior (mesma empresa e modelo), se houver
  let anterior = null;
  let candidata: Linha = null;
  if (av.avaliacao_anterior_id) candidata = (await db.from('avaliacoes').select(seletor).eq('id', av.avaliacao_anterior_id).maybeSingle()).data;
  if (!candidata && av.questionario_origem_id) {
    const { data: lista } = await db.from('avaliacoes').select(seletor).eq('empresa_id', av.empresa_id).eq('questionario_origem_id', av.questionario_origem_id).neq('id', av.id).in('status', STATUS_COM_RESPOSTA).order('criado_em', { ascending: false });
    candidata = (lista ?? []).find((c: Linha) => c.criado_em < av.criado_em) ?? null;
  }
  if (candidata && STATUS_COM_RESPOSTA.includes(candidata.status)) {
    const { data: respAnt } = await db.from('respostas').select('pergunta_id, nota, comentario').eq('avaliacao_id', candidata.id);
    anterior = calcularIndicadores(montarGrupos(candidata, respAnt ?? []));
  }

  const insights = gerarInsights(indicadores, { anterior });
  const { contexto, codigos, idPorCodigo } = montarContexto({
    empresa: av.empresas ?? {},
    avaliacao: av,
    indicadores,
    faixa: classificar(indicadores.geral, faixas),
    insights,
    anterior,
    instrucoesExtras: instrucoes,
  });

  const ferramenta = esquemaDaFerramenta(codigos);
  const pedido = `Escreva o relatório de desempenho com base nestes dados (JSON). Use a ferramenta registrar_relatorio.\n\n${JSON.stringify(contexto)}`;

  let resultado: unknown = null;
  try {
    let erros: string[] = [];
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      const usuario = tentativa === 1 ? pedido : `${pedido}\n\nA resposta anterior tinha problemas. Corrija e envie de novo:\n- ${erros.join('\n- ')}`;
      const bruto = await chamarModelo({ sistema: INSTRUCOES_DO_SISTEMA, usuario, ferramenta });
      erros = validarResultado(bruto, codigos);
      if (erros.length === 0) {
        resultado = converterCodigos(bruto, idPorCodigo);
        break;
      }
    }
    if (!resultado) return responder(req, { erro: 'A IA não conseguiu produzir um relatório válido. Tente de novo ou escreva à mão.' }, 502);
  } catch (erro) {
    if (erro instanceof ErroDoModelo) return responder(req, { erro: erro.message, codigo: erro.codigo }, erro.status);
    return responder(req, { erro: 'Erro inesperado ao gerar a análise.' }, 500);
  }

  const agora = new Date().toISOString();
  const { error: erroGravacao } = await db
    .from('relatorios')
    .upsert({ avaliacao_id: av.id, conteudo_ia: resultado, conteudo_rascunho: resultado, modelo_ia: modeloConfigurado(), gerado_em: agora }, { onConflict: 'avaliacao_id' });
  if (erroGravacao) return responder(req, { erro: 'A análise foi gerada, mas não foi possível salvar. Tente de novo.' }, 500);
  if (av.status === 'respondida') await db.from('avaliacoes').update({ status: 'em_analise' }).eq('id', av.id);

  return responder(req, { conteudo: resultado, modelo: modeloConfigurado(), gerado_em: agora });
});
