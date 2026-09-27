import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { cnpjValido, limparCnpj, mascararCnpj } from '@/lib/cnpj';
import { mensagemDeErro } from '@/lib/erros';
import { PORTES, UFS, mascararTelefone, somenteDigitos, telefoneValido } from '@/lib/mascaras';
import { useEmpresa, useSalvarEmpresa, type NovaEmpresa } from './api';

const texto = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);

const esquema = z.object({
  razao_social: z.string().trim().min(2, 'Informe a razão social.').max(200, 'Use no máximo 200 caracteres.'),
  nome_fantasia: texto(200),
  cnpj: z.string().refine(cnpjValido, 'CNPJ inválido. Confira os 14 caracteres e os dois dígitos finais.'),
  segmento: texto(120),
  porte: z.string(),
  municipio: texto(120),
  uf: z.string(),
  responsavel_nome: texto(120),
  responsavel_cargo: texto(120),
  responsavel_email: z.union([z.literal(''), z.email('Informe um e-mail válido, como nome@empresa.com.br.')]),
  responsavel_telefone: z.string().refine(telefoneValido, 'O telefone está incompleto. Use DDD e 8 ou 9 dígitos, como (54) 99999-0000.'),
  observacoes: texto(2000),
  ativo: z.boolean(),
});
type Dados = z.infer<typeof esquema>;

const VAZIO: Dados = {
  razao_social: '', nome_fantasia: '', cnpj: '', segmento: '', porte: '', municipio: '', uf: '',
  responsavel_nome: '', responsavel_cargo: '', responsavel_email: '', responsavel_telefone: '', observacoes: '', ativo: true,
};

const nulo = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export default function EmpresaFormPagina() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { notificar } = useToast();
  const { data: empresa, isPending } = useEmpresa(id);
  const salvar = useSalvarEmpresa();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: VAZIO });

  useEffect(() => {
    if (!empresa) return;
    reset({
      razao_social: empresa.razao_social,
      nome_fantasia: empresa.nome_fantasia ?? '',
      cnpj: mascararCnpj(empresa.cnpj),
      segmento: empresa.segmento ?? '',
      porte: empresa.porte ?? '',
      municipio: empresa.municipio ?? '',
      uf: empresa.uf ?? '',
      responsavel_nome: empresa.responsavel_nome ?? '',
      responsavel_cargo: empresa.responsavel_cargo ?? '',
      responsavel_email: empresa.responsavel_email ?? '',
      responsavel_telefone: mascararTelefone(empresa.responsavel_telefone ?? ''),
      observacoes: empresa.observacoes ?? '',
      ativo: empresa.ativo,
    });
  }, [empresa, reset]);

  async function handleSalvar(d: Dados) {
    const dados: NovaEmpresa = {
      razao_social: d.razao_social.trim(),
      nome_fantasia: nulo(d.nome_fantasia),
      cnpj: limparCnpj(d.cnpj),
      segmento: nulo(d.segmento),
      porte: nulo(d.porte),
      municipio: nulo(d.municipio),
      uf: nulo(d.uf),
      responsavel_nome: nulo(d.responsavel_nome),
      responsavel_cargo: nulo(d.responsavel_cargo),
      responsavel_email: nulo(d.responsavel_email),
      responsavel_telefone: nulo(somenteDigitos(d.responsavel_telefone)),
      observacoes: nulo(d.observacoes),
      ativo: d.ativo,
    };
    try {
      const salva = await salvar.mutateAsync({ id, dados });
      notificar(id ? 'Empresa salva.' : 'Empresa cadastrada.');
      navegar(`/empresas/${salva.id}`);
    } catch (erro) {
      const duplicado = (erro as { code?: string }).code === '23505';
      notificar(duplicado ? 'Já existe uma empresa com esse CNPJ.' : mensagemDeErro(erro, 'Não foi possível salvar a empresa.'), 'erro');
    }
  }

  const editando = Boolean(id);
  if (editando && isPending) return <Skeleton className="h-64 w-full" />;
  if (editando && !empresa) return <p role="alert">Empresa não encontrada. <Link to="/empresas" className="text-primary underline">Voltar para a lista</Link></p>;

  const erro = (campo: keyof Dados) => errors[campo]?.message;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="mb-2 flex items-center gap-1.5 text-sm text-muted">
          <Link to="/empresas" className="underline underline-offset-4">Empresas</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          {editando ? 'Editar' : 'Nova empresa'}
        </p>
        <h1 className="text-[1.625rem] font-semibold tracking-tight">{editando ? 'Editar empresa' : 'Nova empresa'}</h1>
      </header>

      <form className="flex max-w-[760px] flex-col gap-8" onSubmit={(e) => void handleSubmit(handleSalvar)(e)} noValidate>
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-3 text-xl font-semibold">Dados da empresa</legend>
          <Campo id="razao_social" rotulo="Razão social" erro={erro('razao_social')} className="md:col-span-2">
            <Input {...propsDoCampo('razao_social', erro('razao_social'))} autoComplete="organization" {...register('razao_social')} />
          </Campo>
          <Campo id="nome_fantasia" rotulo="Nome fantasia" erro={erro('nome_fantasia')}>
            <Input {...propsDoCampo('nome_fantasia', erro('nome_fantasia'))} {...register('nome_fantasia')} />
          </Campo>
          <Campo id="cnpj" rotulo="CNPJ" ajuda="Aceita o formato numérico e o alfanumérico." erro={erro('cnpj')}>
            <Input
              {...propsDoCampo('cnpj', erro('cnpj'), 'ajuda')}
              inputMode="text"
              autoCapitalize="characters"
              className="tabular-nums"
              {...register('cnpj', { onChange: (e) => { e.target.value = mascararCnpj(e.target.value); } })}
            />
          </Campo>
          <Campo id="segmento" rotulo="Segmento" erro={erro('segmento')}>
            <Input {...propsDoCampo('segmento', erro('segmento'))} placeholder="Ex.: Indústria metalmecânica" {...register('segmento')} />
          </Campo>
          <Campo id="porte" rotulo="Porte">
            <Select {...propsDoCampo('porte')} {...register('porte')}>
              <option value="">Não informado</option>
              {PORTES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Campo>
          <Campo id="municipio" rotulo="Município" erro={erro('municipio')}>
            <Input {...propsDoCampo('municipio', erro('municipio'))} {...register('municipio')} />
          </Campo>
          <Campo id="uf" rotulo="UF">
            <Select {...propsDoCampo('uf')} {...register('uf')}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u}>{u}</option>)}
            </Select>
          </Campo>
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-3 text-xl font-semibold">Responsável</legend>
          <Campo id="responsavel_nome" rotulo="Nome" erro={erro('responsavel_nome')}>
            <Input {...propsDoCampo('responsavel_nome', erro('responsavel_nome'))} {...register('responsavel_nome')} />
          </Campo>
          <Campo id="responsavel_cargo" rotulo="Cargo" erro={erro('responsavel_cargo')}>
            <Input {...propsDoCampo('responsavel_cargo', erro('responsavel_cargo'))} {...register('responsavel_cargo')} />
          </Campo>
          <Campo id="responsavel_email" rotulo="E-mail" erro={erro('responsavel_email')}>
            <Input {...propsDoCampo('responsavel_email', erro('responsavel_email'))} type="email" inputMode="email" {...register('responsavel_email')} />
          </Campo>
          <Campo id="responsavel_telefone" rotulo="Telefone" erro={erro('responsavel_telefone')}>
            <Input
              {...propsDoCampo('responsavel_telefone', erro('responsavel_telefone'))}
              type="tel"
              inputMode="tel"
              className="tabular-nums"
              {...register('responsavel_telefone', { onChange: (e) => { e.target.value = mascararTelefone(e.target.value); } })}
            />
          </Campo>
          <Campo id="observacoes" rotulo="Observações" erro={erro('observacoes')} className="md:col-span-2">
            <Textarea {...propsDoCampo('observacoes', erro('observacoes'))} {...register('observacoes')} />
          </Campo>
        </fieldset>

        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="size-5 accent-primary" {...register('ativo')} />
          Empresa ativa
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar empresa'}</Button>
          <Link to={editando ? `/empresas/${id}` : '/empresas'} className="inline-flex min-h-11 items-center rounded-controle px-4 font-semibold hover:bg-surface-alt">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}
