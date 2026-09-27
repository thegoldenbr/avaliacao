import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { mensagemDeErro } from '@/lib/erros';
import type { Configuracoes } from '@/lib/tipos';
import { useSalvarConfiguracoes } from './api';

const longo = z.string().trim().min(1, 'Preencha este texto.').max(2000, 'Use no máximo 2000 caracteres.');
const esquema = z.object({
  texto_apresentacao: longo,
  texto_privacidade: longo,
  texto_rodape: z.string().trim().min(1, 'Preencha este texto.').max(300, 'Use no máximo 300 caracteres.'),
  rotulo_escala_min: z.string().trim().min(1, 'Preencha o rótulo.').max(60, 'Use no máximo 60 caracteres.'),
  rotulo_escala_max: z.string().trim().min(1, 'Preencha o rótulo.').max(60, 'Use no máximo 60 caracteres.'),
});
type Dados = z.infer<typeof esquema>;

export function TextosForm({ config }: { config: Configuracoes }) {
  const { notificar } = useToast();
  const salvar = useSalvarConfiguracoes();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      texto_apresentacao: config.texto_apresentacao,
      texto_privacidade: config.texto_privacidade,
      texto_rodape: config.texto_rodape,
      rotulo_escala_min: config.rotulo_escala_min,
      rotulo_escala_max: config.rotulo_escala_max,
    },
  });

  async function handleSalvar(d: Dados) {
    try {
      await salvar.mutateAsync(d);
      notificar('Textos salvos.');
    } catch (erro) {
      notificar(mensagemDeErro(erro, 'Não foi possível salvar os textos.'), 'erro');
    }
  }

  return (
    <form className="flex max-w-[720px] flex-col gap-5" onSubmit={(e) => void handleSubmit(handleSalvar)(e)} noValidate>
      <Campo id="texto_apresentacao" rotulo="Apresentação do formulário" ajuda="Usada quando a avaliação não tem mensagem própria." erro={errors.texto_apresentacao?.message}>
        <Textarea {...propsDoCampo('texto_apresentacao', errors.texto_apresentacao?.message, 'ajuda')} {...register('texto_apresentacao')} />
      </Campo>
      <Campo id="texto_privacidade" rotulo="Aviso de privacidade" ajuda="Aparece na abertura do formulário (LGPD)." erro={errors.texto_privacidade?.message}>
        <Textarea {...propsDoCampo('texto_privacidade', errors.texto_privacidade?.message, 'ajuda')} {...register('texto_privacidade')} />
      </Campo>
      <Campo id="texto_rodape" rotulo="Rodapé do relatório" erro={errors.texto_rodape?.message}>
        <Input {...propsDoCampo('texto_rodape', errors.texto_rodape?.message)} {...register('texto_rodape')} />
      </Campo>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo id="rotulo_escala_min" rotulo="Rótulo padrão do 0" erro={errors.rotulo_escala_min?.message}>
          <Input {...propsDoCampo('rotulo_escala_min', errors.rotulo_escala_min?.message)} {...register('rotulo_escala_min')} />
        </Campo>
        <Campo id="rotulo_escala_max" rotulo="Rótulo padrão do 10" erro={errors.rotulo_escala_max?.message}>
          <Input {...propsDoCampo('rotulo_escala_max', errors.rotulo_escala_max?.message)} {...register('rotulo_escala_max')} />
        </Campo>
      </div>
      <Button type="submit" disabled={isSubmitting} className="self-start">{isSubmitting ? 'Salvando…' : 'Salvar textos'}</Button>
    </form>
  );
}
