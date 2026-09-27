/** Traduz erros do Supabase/Postgres em mensagens que dizem o que houve e o que fazer. */
export function mensagemDeErro(erro, padrao = 'Algo deu errado. Tente de novo em instantes.') {
  const e = erro ?? {};
  const msg = String(e.message ?? '');
  if (e.code === '23505') return 'Já existe um registro com esse valor. Confira os dados.';
  if (e.code === '23503') return 'Este item está em uso e não pode ser removido.';
  if (e.code === '42501' || msg.includes('row-level security')) return 'Você não tem permissão para fazer isso.';
  if (msg === 'copia_congelada') return 'As perguntas de uma avaliação já enviada não podem ser alteradas.';
  if (msg.toLowerCase().includes('failed to fetch')) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  return padrao;
}
