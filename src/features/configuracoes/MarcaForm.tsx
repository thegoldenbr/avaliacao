import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { mensagemDeErro } from '@/lib/erros';
import type { Configuracoes } from '@/lib/tipos';
import { enviarLogo, useSalvarConfiguracoes } from './api';

const esquema = z.object({
  nome_empresa: z.string().trim().min(2, 'Informe o nome da empresa.').max(120, 'Use no máximo 120 caracteres.'),
  cor_destaque: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #2B4ACB.'),
});
type Dados = z.infer<typeof esquema>;

export function MarcaForm({ config }: { config: Configuracoes }) {
  const { notificar } = useToast();
  const salvar = useSalvarConfiguracoes();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | undefined>();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { nome_empresa: config.nome_empresa, cor_destaque: config.cor_destaque } });
  const cor = watch('cor_destaque');

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0] ?? null;
    setErroArquivo(undefined);
    if (escolhido && escolhido.size > 1_048_576) {
      setErroArquivo('A imagem passa de 1 MB. Reduza o tamanho e tente de novo.');
      setArquivo(null);
      return;
    }
    setArquivo(escolhido);
  }

  async function handleSalvar(d: Dados) {
    try {
      const logo = arquivo ? await enviarLogo(arquivo) : undefined;
      await salvar.mutateAsync({ nome_empresa: d.nome_empresa.trim(), cor_destaque: d.cor_destaque.toUpperCase(), ...(logo ? { logo_url: logo } : {}) });
      setArquivo(null);
      notificar('Marca salva.');
    } catch (erro) {
      notificar(mensagemDeErro(erro, 'Não foi possível salvar a marca.'), 'erro');
    }
  }

  return (
    <form className="flex max-w-[640px] flex-col gap-5" onSubmit={(e) => void handleSubmit(handleSalvar)(e)} noValidate>
      <Campo id="nome_empresa" rotulo="Nome da empresa" erro={errors.nome_empresa?.message}>
        <Input {...propsDoCampo('nome_empresa', errors.nome_empresa?.message)} {...register('nome_empresa')} />
      </Campo>
      <div className="flex flex-col gap-2">
        <Campo id="logo" rotulo="Logo" ajuda="PNG, JPG, SVG ou WebP, até 1 MB. Aparece no login, no formulário e no relatório." erro={erroArquivo}>
          <Input {...propsDoCampo('logo', erroArquivo, 'ajuda')} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleArquivo} className="py-2" />
        </Campo>
        {config.logo_url && !arquivo ? <img src={config.logo_url} alt="Logo atual" className="h-12 w-auto self-start rounded-controle border border-border p-1" /> : null}
      </div>
      <Campo id="cor_destaque" rotulo="Cor de destaque" ajuda="O sistema ajusta a cor nos temas claro e escuro para manter o contraste de leitura." erro={errors.cor_destaque?.message}>
        <div className="flex items-center gap-3">
          <input type="color" aria-label="Escolher cor" value={/^#[0-9a-fA-F]{6}$/.test(cor) ? cor : '#2b4acb'} onChange={(e) => setValue('cor_destaque', e.target.value.toUpperCase(), { shouldValidate: true })} className="size-11 cursor-pointer rounded-controle border border-border-strong bg-surface p-1" />
          <Input {...propsDoCampo('cor_destaque', errors.cor_destaque?.message, 'ajuda')} className="max-w-40 tabular-nums" {...register('cor_destaque')} />
        </div>
      </Campo>
      <Button type="submit" disabled={isSubmitting} className="self-start">{isSubmitting ? 'Salvando…' : 'Salvar marca'}</Button>
    </form>
  );
}
