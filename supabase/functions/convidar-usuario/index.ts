// Edge Function: convidar-usuario
// Só administradores ativos. Cria (ou reaproveita) o usuário pela API admin, cria/atualiza o perfil e devolve
// um link de convite para o admin enviar (WhatsApp, e-mail...). Não depende do envio de e-mails do Supabase.
//
// O link usa token_hash + verifyOtp; o token vai na query (não no fragmento):
//   {url_base}aceitar-convite.html?token_hash=...&type=invite

import { createClient } from 'jsr:@supabase/supabase-js@2';

const URLS_PERMITIDAS = (Deno.env.get('APP_URLS') ?? 'https://thegoldenbr.github.io/avaliacao/,http://localhost:5173/,http://localhost/avaliacao/')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

function origemDe(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
const ORIGENS_PERMITIDAS = new Set(URLS_PERMITIDAS.map(origemDe).filter((o): o is string => o !== null));

function cabecalhosCors(req: Request): Record<string, string> {
  const origem = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENS_PERMITIDAS.has(origem) ? origem : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function responder(req: Request, corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors(req), 'Content-Type': 'application/json' },
  });
}

interface Pedido {
  email: string;
  nome: string;
  papel: 'admin' | 'analista';
  url_base: string;
}

function lerPedido(dado: unknown): Pedido | string {
  if (typeof dado !== 'object' || dado === null) return 'Pedido inválido.';
  const { email, nome, papel, url_base } = dado as Record<string, unknown>;
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return 'E-mail inválido.';
  if (typeof nome !== 'string' || nome.trim().length < 2 || nome.length > 120) return 'Informe o nome (2 a 120 caracteres).';
  if (papel !== 'admin' && papel !== 'analista') return 'Papel inválido.';
  if (typeof url_base !== 'string' || !URLS_PERMITIDAS.includes(url_base)) return 'Endereço do sistema não permitido.';
  return { email: email.trim().toLowerCase(), nome: nome.trim(), papel, url_base };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabecalhosCors(req) });
  if (req.method !== 'POST') return responder(req, { erro: 'Método não permitido.' }, 405);

  const urlSupabase = Deno.env.get('SUPABASE_URL');
  const chaveAnon = Deno.env.get('SUPABASE_ANON_KEY');
  const chaveServico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const autorizacao = req.headers.get('Authorization');
  if (!urlSupabase || !chaveAnon || !chaveServico) return responder(req, { erro: 'Função mal configurada.' }, 500);
  if (!autorizacao) return responder(req, { erro: 'Entre no sistema para convidar usuários.' }, 401);

  // 1) Quem chama? Cliente com o JWT do próprio usuário: a leitura de perfis respeita a RLS.
  const comoUsuario = createClient(urlSupabase, chaveAnon, { global: { headers: { Authorization: autorizacao } } });
  const { data: dadosUsuario, error: erroUsuario } = await comoUsuario.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) return responder(req, { erro: 'Sessão inválida. Entre de novo.' }, 401);

  const { data: perfil } = await comoUsuario
    .from('perfis')
    .select('papel, ativo')
    .eq('id', dadosUsuario.user.id)
    .maybeSingle();
  if (!perfil || !perfil.ativo || perfil.papel !== 'admin') {
    return responder(req, { erro: 'Só administradores podem convidar usuários.' }, 403);
  }

  // 2) Pedido
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return responder(req, { erro: 'Pedido inválido.' }, 400);
  }
  const pedido = lerPedido(corpo);
  if (typeof pedido === 'string') return responder(req, { erro: pedido }, 400);

  // 3) Convite (API admin, com a service_role que só existe aqui no servidor)
  const admin = createClient(urlSupabase, chaveServico, { auth: { autoRefreshToken: false, persistSession: false } });
  let tipo: 'invite' | 'recovery' = 'invite';
  let resultado = await admin.auth.admin.generateLink({ type: 'invite', email: pedido.email, options: { data: { nome: pedido.nome } } });

  if (resultado.error) {
    // Usuário já existe (ex.: reenviar convite): gera um link de recuperação para ele definir a senha.
    tipo = 'recovery';
    resultado = await admin.auth.admin.generateLink({ type: 'recovery', email: pedido.email });
  }
  if (resultado.error || !resultado.data.user) {
    return responder(req, { erro: 'Não foi possível gerar o convite. Confira o e-mail e tente de novo.' }, 400);
  }

  const usuario = resultado.data.user;
  const { error: erroPerfil } = await admin
    .from('perfis')
    .upsert({ id: usuario.id, nome: pedido.nome, email: pedido.email, papel: pedido.papel, ativo: true });
  if (erroPerfil) return responder(req, { erro: 'O convite foi gerado, mas não foi possível salvar o perfil.' }, 500);

  const tokenHash = resultado.data.properties.hashed_token;
  const link = `${pedido.url_base}aceitar-convite.html?token_hash=${encodeURIComponent(tokenHash)}&type=${tipo}`;
  return responder(req, { link, usuario_id: usuario.id, tipo });
});
