// Edge Function: usuarios
// Contas sem e-mail (usuario = nome.sobrenome, senha inicial 123456), troca de senha obrigatória e PIN de 6 dígitos.
//
// Ações (POST { acao, ... }):
//   criar          (admin)   { nome_completo, papel }      cria usuário + perfil com troca de senha obrigatória
//   redefinir      (admin)   { usuario_id }                volta a senha para a inicial e exige nova troca
//   trocar-senha   (logado)  { nova_senha }                troca a senha e libera o acesso
//   definir-pin    (logado)  { pin }                       cadastra/atualiza o PIN de 6 dígitos
//   recusar-pin    (logado)                                 registra que o usuário não quis PIN agora
//   remover-pin    (logado)                                 apaga o PIN
//   login-pin      (público) { usuario, pin }              confere o PIN (5 erros = 15 min de bloqueio) e devolve um token para abrir a sessão
//
// A service_role só existe aqui, no servidor. O PIN é guardado com hash bcrypt (funções SQL restritas à service_role).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SENHA_INICIAL, emailInterno, gerarUsuario, problemasDaSenha, problemasDoPin } from '../_shared/usuarios.js';

const URLS_PERMITIDAS = (Deno.env.get('APP_URLS') ?? 'https://thegoldenbr.github.io/avaliacao/,http://localhost:5173/,http://localhost/avaliacao/')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
const ORIGENS = new Set(URLS_PERMITIDAS.map((u) => { try { return new URL(u).origin; } catch { return ''; } }).filter(Boolean));

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return responder(req, { erro: 'Método não permitido.' }, 405);

  const urlSupabase = Deno.env.get('SUPABASE_URL');
  const chaveAnon = Deno.env.get('SUPABASE_ANON_KEY');
  const chaveServico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!urlSupabase || !chaveAnon || !chaveServico) return responder(req, { erro: 'Função mal configurada.' }, 500);

  let corpo: Linha;
  try {
    corpo = await req.json();
  } catch {
    return responder(req, { erro: 'Pedido inválido.' }, 400);
  }
  const acao = String(corpo?.acao ?? '');
  const admin = createClient(urlSupabase, chaveServico, { auth: { autoRefreshToken: false, persistSession: false } });

  // ---------- público: login por PIN ----------
  if (acao === 'login-pin') {
    const usuario = String(corpo.usuario ?? '').trim().toLowerCase();
    const pin = String(corpo.pin ?? '');
    if (!usuario || !/^[0-9]{6}$/.test(pin)) return responder(req, { erro: 'Informe o usuário e o PIN de 6 dígitos.' }, 400);
    const { data: id, error } = await admin.rpc('verificar_pin', { p_usuario: usuario, p_pin: pin });
    if (error) {
      if (String(error.message).includes('pin_bloqueado')) return responder(req, { erro: 'PIN bloqueado por excesso de tentativas. Tente de novo em 15 minutos ou entre com a senha.' }, 429);
      return responder(req, { erro: 'Não foi possível entrar agora. Tente de novo.' }, 500);
    }
    if (!id) return responder(req, { erro: 'Usuário ou PIN incorretos.' }, 401);
    const { data: perfil } = await admin.from('perfis').select('email').eq('id', id).maybeSingle();
    if (!perfil) return responder(req, { erro: 'Usuário ou PIN incorretos.' }, 401);
    const { data: link, error: erroLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email: perfil.email });
    if (erroLink || !link?.properties?.hashed_token) return responder(req, { erro: 'Não foi possível entrar agora. Tente de novo.' }, 500);
    return responder(req, { token_hash: link.properties.hashed_token });
  }

  // ---------- demais ações: exigem login ----------
  const autorizacao = req.headers.get('Authorization');
  if (!autorizacao) return responder(req, { erro: 'Entre no sistema para continuar.' }, 401);
  const comoUsuario = createClient(urlSupabase, chaveAnon, { global: { headers: { Authorization: autorizacao } } });
  const { data: dadosUsuario, error: erroUsuario } = await comoUsuario.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) return responder(req, { erro: 'Sessão inválida. Entre de novo.' }, 401);
  const eu = dadosUsuario.user.id;
  // O perfil é lido com a service_role: quem ainda não trocou a senha inicial precisa poder usar estas ações.
  const { data: perfilEu } = await admin.from('perfis').select('*').eq('id', eu).maybeSingle();
  if (!perfilEu || !perfilEu.ativo) return responder(req, { erro: 'Seu acesso não está ativo.' }, 403);

  if (acao === 'trocar-senha') {
    const problemas = problemasDaSenha(corpo.nova_senha, { usuario: perfilEu.usuario ?? '' });
    if (problemas.length) return responder(req, { erro: problemas[0] }, 400);
    const { error } = await admin.auth.admin.updateUserById(eu, { password: String(corpo.nova_senha) });
    if (error) return responder(req, { erro: 'Não foi possível trocar a senha. Tente de novo.' }, 400);
    const pinEstado = perfilEu.precisa_trocar_senha && perfilEu.pin_estado === 'nenhum' ? 'segundo_login' : perfilEu.pin_estado;
    await admin.from('perfis').update({ precisa_trocar_senha: false, pin_estado: pinEstado }).eq('id', eu);
    return responder(req, { ok: true });
  }

  // As ações abaixo exigem que a senha inicial já tenha sido trocada.
  if (perfilEu.precisa_trocar_senha) return responder(req, { erro: 'Troque a senha inicial antes de continuar.' }, 403);

  if (acao === 'definir-pin') {
    const problemas = problemasDoPin(corpo.pin);
    if (problemas.length) return responder(req, { erro: problemas[0] }, 400);
    const { error } = await admin.rpc('definir_pin', { p_usuario_id: eu, p_pin: String(corpo.pin) });
    if (error) return responder(req, { erro: 'Não foi possível salvar o PIN.' }, 400);
    await admin.from('perfis').update({ pin_estado: 'ativo' }).eq('id', eu);
    return responder(req, { ok: true });
  }
  if (acao === 'recusar-pin') {
    if (perfilEu.pin_estado === 'segundo_login') await admin.from('perfis').update({ pin_estado: 'ofertado' }).eq('id', eu);
    return responder(req, { ok: true });
  }
  if (acao === 'remover-pin') {
    await admin.rpc('remover_pin', { p_usuario_id: eu });
    await admin.from('perfis').update({ pin_estado: 'ofertado' }).eq('id', eu);
    return responder(req, { ok: true });
  }

  // ---------- administração ----------
  if (acao === 'criar' || acao === 'redefinir') {
    if (perfilEu.papel !== 'admin') return responder(req, { erro: 'Só administradores podem fazer isso.' }, 403);

    if (acao === 'criar') {
      const nome = String(corpo.nome_completo ?? '').trim().replace(/\s+/g, ' ');
      const papel = corpo.papel === 'admin' ? 'admin' : 'analista';
      if (nome.length < 3 || nome.length > 120) return responder(req, { erro: 'Informe nome e sobrenome.' }, 400);
      const { data: existentes } = await admin.from('perfis').select('usuario').not('usuario', 'is', null);
      const usuario = gerarUsuario(nome, (existentes ?? []).map((p: Linha) => p.usuario));
      if (!usuario) return responder(req, { erro: 'Informe nome e sobrenome (duas palavras, no mínimo).' }, 400);
      const email = emailInterno(usuario);
      const { data: criado, error } = await admin.auth.admin.createUser({ email, password: SENHA_INICIAL, email_confirm: true, user_metadata: { nome, usuario } });
      if (error || !criado.user) return responder(req, { erro: 'Não foi possível criar o usuário. Tente de novo.' }, 400);
      const { error: erroPerfil } = await admin.from('perfis').insert({ id: criado.user.id, nome, email, papel, ativo: true, usuario, precisa_trocar_senha: true, pin_estado: 'nenhum' });
      if (erroPerfil) {
        await admin.auth.admin.deleteUser(criado.user.id);
        return responder(req, { erro: 'Não foi possível salvar o perfil do usuário.' }, 500);
      }
      return responder(req, { usuario, senha_inicial: SENHA_INICIAL, usuario_id: criado.user.id });
    }

    // redefinir
    const alvo = String(corpo.usuario_id ?? '');
    if (alvo === eu) return responder(req, { erro: 'Para trocar a sua própria senha, use a opção de trocar senha.' }, 400);
    const { data: perfilAlvo } = await admin.from('perfis').select('id, usuario').eq('id', alvo).maybeSingle();
    if (!perfilAlvo) return responder(req, { erro: 'Usuário não encontrado.' }, 404);
    if (!perfilAlvo.usuario) return responder(req, { erro: 'Este usuário entra com e-mail: gere um novo convite por link.' }, 400);
    const { error } = await admin.auth.admin.updateUserById(alvo, { password: SENHA_INICIAL });
    if (error) return responder(req, { erro: 'Não foi possível redefinir a senha.' }, 400);
    await admin.rpc('remover_pin', { p_usuario_id: alvo });
    await admin.from('perfis').update({ precisa_trocar_senha: true, pin_estado: 'nenhum' }).eq('id', alvo);
    return responder(req, { usuario: perfilAlvo.usuario, senha_inicial: SENHA_INICIAL });
  }

  return responder(req, { erro: 'Ação desconhecida.' }, 400);
});
