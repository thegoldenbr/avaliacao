// Chamada ao modelo, isolada aqui para permitir trocar de provedor sem mexer no resto.
// Padrão: API de mensagens da Anthropic, com saída estruturada por "tool use".
// Secrets (Supabase > Edge Functions > Secrets): ANTHROPIC_API_KEY e, opcionalmente, ANTHROPIC_MODEL.

export interface Ferramenta {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export class ErroDoModelo extends Error {
  constructor(
    public codigo: 'sem_chave' | 'chave_invalida' | 'limite' | 'indisponivel' | 'tempo_esgotado' | 'resposta_invalida',
    mensagem: string,
    public status = 502,
  ) {
    super(mensagem);
  }
}

const URL_API = 'https://api.anthropic.com/v1/messages';
const MODELO_PADRAO = 'claude-sonnet-5';
const TEMPO_LIMITE_MS = 110_000;

export function modeloConfigurado(): string {
  return Deno.env.get('ANTHROPIC_MODEL') || MODELO_PADRAO;
}

export async function chamarModelo(opcoes: { sistema: string; usuario: string; ferramenta: Ferramenta }): Promise<unknown> {
  const chave = Deno.env.get('ANTHROPIC_API_KEY');
  if (!chave) {
    throw new ErroDoModelo('sem_chave', 'A chave da IA ainda não foi configurada. Cadastre ANTHROPIC_API_KEY nos secrets das Edge Functions ou escreva o relatório à mão.', 503);
  }

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(URL_API, {
      method: 'POST',
      signal: controle.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: modeloConfigurado(),
        max_tokens: 6000,
        system: opcoes.sistema,
        messages: [{ role: 'user', content: opcoes.usuario }],
        tools: [opcoes.ferramenta],
        tool_choice: { type: 'tool', name: opcoes.ferramenta.name },
      }),
    });

    if (resposta.status === 401 || resposta.status === 403) throw new ErroDoModelo('chave_invalida', 'A chave da IA foi recusada. Confira ANTHROPIC_API_KEY.', 502);
    if (resposta.status === 429) throw new ErroDoModelo('limite', 'O limite de uso da IA foi atingido. Tente de novo em alguns minutos.', 429);
    if (resposta.status >= 500 || resposta.status === 529) throw new ErroDoModelo('indisponivel', 'A IA está indisponível agora. Tente de novo em instantes ou escreva o relatório à mão.', 503);
    if (!resposta.ok) throw new ErroDoModelo('resposta_invalida', `A IA recusou o pedido (código ${resposta.status}).`, 502);

    const corpo = await resposta.json();
    const bloco = Array.isArray(corpo.content) ? corpo.content.find((b: { type: string }) => b.type === 'tool_use') : null;
    if (!bloco?.input) throw new ErroDoModelo('resposta_invalida', 'A IA não devolveu o relatório no formato esperado.', 502);
    return bloco.input;
  } catch (erro) {
    if (erro instanceof ErroDoModelo) throw erro;
    if (erro instanceof DOMException && erro.name === 'AbortError') {
      throw new ErroDoModelo('tempo_esgotado', 'A geração demorou demais e foi interrompida. Tente de novo.', 504);
    }
    throw new ErroDoModelo('indisponivel', 'Não foi possível falar com a IA agora. Tente de novo em instantes.', 503);
  } finally {
    clearTimeout(relogio);
  }
}
