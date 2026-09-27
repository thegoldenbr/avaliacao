-- Dados de exemplo (não usar em produção com clientes reais).
-- Questionário "Maturidade de Gestão" (6 grupos x 5 perguntas) e 3 empresas fictícias:
--   Metalúrgica Serra Azul: duas avaliações publicadas (evolução);
--   Clínica Vida Plena: respondida, aguardando análise;
--   Padaria Pão Nobre: aguardando resposta (com 12 perguntas já salvas como rascunho).
-- É seguro rodar uma vez. Para repetir, apague as linhas com o CNPJ de exemplo ou use `supabase db reset`.

-- Função temporária (existe só nesta sessão): grava respostas a partir de uma matriz [grupo][pergunta]
-- de notas EFETIVAS. Para perguntas de escala invertida grava 10 - nota, como o respondente marcaria.
create function pg_temp.semear_respostas(p_av uuid, p_notas jsonb, p_limite int) returns void
language plpgsql as $f$
declare
  r record;
  n int := 0;
  v_eff int;
begin
  for r in
    select ap.id, ap.escala_invertida, ag.ordem as og, ap.ordem as op
    from public.avaliacao_perguntas ap
    join public.avaliacao_grupos ag on ag.id = ap.avaliacao_grupo_id
    where ap.avaliacao_id = p_av
    order by ag.ordem, ap.ordem
  loop
    exit when n >= p_limite;
    n := n + 1;
    v_eff := ((p_notas -> (r.og - 1)) ->> (r.op - 1))::int;
    insert into public.respostas (avaliacao_id, pergunta_id, nota)
    values (p_av, r.id, case when r.escala_invertida then 10 - v_eff else v_eff end);
  end loop;
end;
$f$;

do $$
declare
  v_q uuid;
  v_g uuid;
  v_grupo jsonb;
  v_perg jsonb;
  v_ordem_g int := 0;
  v_ordem_p int;
  v_serra uuid;
  v_clinica uuid;
  v_padaria uuid;
  v_av1 uuid;
  v_av2 uuid;
  v_av3 uuid;
  v_av4 uuid;
begin
  if exists (select 1 from public.questionarios where titulo = 'Maturidade de Gestão') then
    raise notice 'Seed já aplicado; nada a fazer.';
    return;
  end if;

  insert into public.questionarios (titulo, descricao)
  values ('Maturidade de Gestão', 'Avalia a maturidade da gestão da empresa em seis temas, com notas de 0 a 10.')
  returning id into v_q;

  for v_grupo in select * from jsonb_array_elements('[
    {"nome":"Estratégia e Governança","curto":"Estratégia","peso":2,"perguntas":[
      {"e":"A empresa tem metas anuais claras e conhecidas pela liderança?","p":3},
      {"e":"Com que frequência a diretoria revisa os resultados contra as metas?","p":2,"min":"Nunca","max":"Todo mês"},
      {"e":"Existe um planejamento estratégico escrito para os próximos 3 anos?","p":2},
      {"e":"Os papéis e as responsabilidades de cada área estão definidos?","p":2},
      {"e":"Decisões importantes dependem de uma única pessoa.","p":1,"inv":true}]},
    {"nome":"Finanças","curto":"Finanças","peso":3,"perguntas":[
      {"e":"O caixa é projetado para os próximos 3 meses?","p":3,"min":"Nunca","max":"Toda semana"},
      {"e":"A empresa separa as contas pessoais das contas da empresa?","p":2},
      {"e":"Existe controle de custos por produto ou serviço?","p":2},
      {"e":"A empresa conhece a margem de lucro de cada linha de negócio?","p":2},
      {"e":"Falta dinheiro em caixa para pagar contas em dia.","p":2,"inv":true}]},
    {"nome":"Pessoas e Liderança","curto":"Pessoas","peso":2,"perguntas":[
      {"e":"Cada pessoa da equipe conhece as metas do seu cargo?","p":2},
      {"e":"A liderança dá feedback regular à equipe?","p":2},
      {"e":"Há plano de desenvolvimento e treinamento para os colaboradores?","p":1},
      {"e":"A empresa consegue reter seus melhores profissionais?","p":2},
      {"e":"O clima de trabalho é de confiança e colaboração.","p":1}]},
    {"nome":"Processos e Qualidade","curto":"Processos","peso":2,"perguntas":[
      {"e":"As principais rotinas estão documentadas e são seguidas?","p":2},
      {"e":"Existem indicadores de qualidade acompanhados regularmente?","p":2},
      {"e":"Falhas e retrabalho são registrados e analisados?","p":2},
      {"e":"Os processos são revisados para ganhar eficiência?","p":1},
      {"e":"O conhecimento crítico está concentrado em poucas pessoas.","p":1,"inv":true}]},
    {"nome":"Comercial e Clientes","curto":"Comercial","peso":2,"perguntas":[
      {"e":"A empresa conhece o perfil dos seus melhores clientes?","p":2},
      {"e":"Há metas e acompanhamento do funil de vendas?","p":2},
      {"e":"Existe rotina de pós-venda e relacionamento com clientes?","p":2},
      {"e":"A satisfação dos clientes é medida?","p":1},
      {"e":"A maior parte do faturamento vem de poucos clientes.","p":2,"inv":true}]},
    {"nome":"Tecnologia e Inovação","curto":"Tecnologia","peso":1,"perguntas":[
      {"e":"Os sistemas da empresa são integrados entre as áreas?","p":2},
      {"e":"Os dados são usados para apoiar decisões?","p":2},
      {"e":"A empresa testa novas ideias, produtos ou serviços com frequência?","p":1},
      {"e":"Há proteção adequada para dados e acessos (cópias, senhas, permissões)?","p":2},
      {"e":"Boa parte das tarefas ainda é feita manualmente em planilhas.","p":1,"inv":true}]}
  ]'::jsonb)
  loop
    v_ordem_g := v_ordem_g + 1;
    insert into public.grupos (questionario_id, nome, nome_curto, peso, meta, ordem)
    values (v_q, v_grupo ->> 'nome', v_grupo ->> 'curto', (v_grupo ->> 'peso')::numeric, 8.0, v_ordem_g)
    returning id into v_g;

    v_ordem_p := 0;
    for v_perg in select * from jsonb_array_elements(v_grupo -> 'perguntas') loop
      v_ordem_p := v_ordem_p + 1;
      insert into public.perguntas (grupo_id, enunciado, peso, ordem, escala_invertida, rotulo_min, rotulo_max)
      values (v_g, v_perg ->> 'e', (v_perg ->> 'p')::numeric, v_ordem_p,
              coalesce((v_perg ->> 'inv')::boolean, false), v_perg ->> 'min', v_perg ->> 'max');
    end loop;
  end loop;

  insert into public.empresas (razao_social, nome_fantasia, cnpj, segmento, porte, municipio, uf,
                               responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone, observacoes)
  values ('Metalúrgica Serra Azul S.A.', 'Serra Azul', '12345678000195', 'Indústria metalmecânica', 'Média empresa',
          'Caxias do Sul', 'RS', 'Roberto Menezes', 'Diretor administrativo', 'roberto@serraazul.example', '54999990001',
          'Cliente desde 2024. Prefere contato por WhatsApp.')
  returning id into v_serra;
  insert into public.empresas (razao_social, nome_fantasia, cnpj, segmento, porte, municipio, uf,
                               responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone)
  values ('Clínica Vida Plena Ltda.', 'Vida Plena', '23456789000195', 'Saúde', 'Pequena empresa',
          'Belo Horizonte', 'MG', 'Dra. Camila Torres', 'Diretora clínica', 'camila@vidaplena.example', '31999990002')
  returning id into v_clinica;
  insert into public.empresas (razao_social, nome_fantasia, cnpj, segmento, porte, municipio, uf,
                               responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone)
  values ('Padaria Pão Nobre Ltda.', 'Pão Nobre', '34567890000130', 'Alimentação', 'Microempresa',
          'Curitiba', 'PR', 'Sérgio Batista', 'Proprietário', 'sergio@paonobre.example', '41999990003')
  returning id into v_padaria;

  -- Serra Azul, 1º semestre: publicada.
  v_av1 := public.criar_avaliacao(v_serra, v_q, 'Maturidade de Gestão · 1º semestre 2026', 'Jan a jun de 2026',
                                  '2026-03-20 23:59:00-03', 'Olá, Roberto! Responda com sinceridade: não há resposta certa.');
  perform pg_temp.semear_respostas(v_av1, '[[7,7,6,8,7],[5,6,6,5,5],[8,7,8,7,8],[6,7,6,6,7],[7,7,7,6,7],[5,5,4,5,5]]'::jsonb, 30);
  update public.avaliacoes set status = 'publicada', respondente_nome = 'Roberto Menezes', respondente_cargo = 'Diretor administrativo',
    enviado_em = '2026-02-12 10:00:00-03', respondido_em = '2026-03-05 16:20:00-03', publicado_em = '2026-03-12 09:30:00-03'
  where id = v_av1;
  insert into public.relatorios (avaliacao_id, conteudo_rascunho, conteudo_publicado, gerado_em, publicado_em)
  values (v_av1, '{"resumo_executivo":"Exemplo de relatório do 1º semestre (dados de demonstração)."}'::jsonb,
          '{"resumo_executivo":"Exemplo de relatório do 1º semestre (dados de demonstração).","seed":true}'::jsonb,
          '2026-03-10 11:00:00-03', '2026-03-12 09:30:00-03');

  -- Serra Azul, 2º semestre: publicada, com a anterior para comparar.
  v_av2 := public.criar_avaliacao(v_serra, v_q, 'Maturidade de Gestão · 2º semestre 2026', 'Jul a dez de 2026',
                                  '2026-09-10 23:59:00-03', 'Olá, Roberto! Vamos medir a evolução desde o último semestre.', v_av1);
  perform pg_temp.semear_respostas(v_av2, '[[8,8,7,8,8],[2,9,7,6,7],[9,8,8,8,9],[7,8,7,7,7],[8,8,8,7,8],[6,6,5,6,6]]'::jsonb, 30);
  update public.avaliacoes set status = 'publicada', respondente_nome = 'Roberto Menezes', respondente_cargo = 'Diretor administrativo',
    enviado_em = '2026-09-03 10:00:00-03', respondido_em = '2026-09-18 15:05:00-03', publicado_em = '2026-09-22 09:00:00-03'
  where id = v_av2;
  insert into public.relatorios (avaliacao_id, conteudo_rascunho, conteudo_publicado, gerado_em, publicado_em)
  values (v_av2, '{"resumo_executivo":"Exemplo de relatório do 2º semestre (dados de demonstração)."}'::jsonb,
          '{"resumo_executivo":"Exemplo de relatório do 2º semestre (dados de demonstração).","seed":true}'::jsonb,
          '2026-09-21 11:00:00-03', '2026-09-22 09:00:00-03');

  -- Vida Plena: respondida, aguardando análise.
  v_av3 := public.criar_avaliacao(v_clinica, v_q, 'Maturidade de Gestão · 2º semestre 2026', 'Jul a dez de 2026',
                                  '2026-09-25 23:59:00-03', 'Olá, Dra. Camila! Este questionário leva cerca de 15 minutos.');
  perform pg_temp.semear_respostas(v_av3, '[[6,5,6,7,6],[6,7,5,6,6],[7,6,7,7,6],[5,6,6,5,6],[6,6,7,6,5],[4,5,5,6,4]]'::jsonb, 30);
  update public.avaliacoes set status = 'respondida', respondente_nome = 'Camila Torres', respondente_cargo = 'Diretora clínica',
    enviado_em = '2026-09-08 10:00:00-03', respondido_em = '2026-09-22 14:10:00-03'
  where id = v_av3;

  -- Pão Nobre: aguardando resposta, com rascunho parcial (12 de 30).
  v_av4 := public.criar_avaliacao(v_padaria, v_q, 'Maturidade de Gestão · 2º semestre 2026', 'Jul a dez de 2026',
                                  '2026-09-28 23:59:00-03', 'Olá, Sérgio! Responda com calma; suas respostas são salvas automaticamente.');
  perform pg_temp.semear_respostas(v_av4, '[[7,6,5,7,6],[5,6,7,5,6],[6,7,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]'::jsonb, 12);
  update public.avaliacoes set status = 'aguardando_resposta', respondente_nome = 'Sérgio Batista', enviado_em = '2026-09-10 10:00:00-03'
  where id = v_av4;
end;
$$;
