import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { mensagemDeErro } from '@/lib/erros';
import { formatarNota } from '@/lib/formatacao';
import type { Configuracoes } from '@/lib/tipos';
import { cn } from '@/lib/utils';
import { useSalvarConfiguracoes } from './api';
import { limitesValidos, lerFaixas, montarFaixas } from './faixas';

const COR: Record<string, string> = { critico: 'text-faixa-critico', atencao: 'text-faixa-atencao', bom: 'text-faixa-bom', excelente: 'text-faixa-excelente' };

/** Faixas de classificação: o usuário define onde começam Atenção, Bom e Excelente; os fins são calculados. */
export function FaixasForm({ config }: { config: Configuracoes }) {
  const { notificar } = useToast();
  const salvar = useSalvarConfiguracoes();
  const atuais = lerFaixas(config.faixas);
  const [limites, setLimites] = useState<[string, string, string]>([String(atuais[1]?.de), String(atuais[2]?.de), String(atuais[3]?.de)]);
  const numeros = limites.map((l) => Number(l.replace(',', '.'))) as [number, number, number];
  const valido = limitesValidos(numeros);
  const previa = valido ? montarFaixas(atuais, numeros) : null;

  function handleMudar(indice: 0 | 1 | 2, valor: string) {
    setLimites((antes) => antes.map((v, i) => (i === indice ? valor : v)) as [string, string, string]);
  }

  async function handleSalvar() {
    if (!previa) return;
    try {
      await salvar.mutateAsync({ faixas: previa });
      notificar('Faixas salvas.');
    } catch (erro) {
      notificar(mensagemDeErro(erro, 'Não foi possível salvar as faixas.'), 'erro');
    }
  }

  const rotulos = ['Atenção a partir de', 'Bom a partir de', 'Excelente a partir de'] as const;

  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <p className="text-muted">A nota já arredondada (uma casa decimal) define a faixa, para o rótulo nunca contradizer o número exibido.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {rotulos.map((r, i) => (
          <Campo key={r} id={`limite-${i}`} rotulo={r} erro={!valido ? 'Use limites crescentes entre 0,1 e 10.' : undefined}>
            <Input {...propsDoCampo(`limite-${i}`, !valido ? 'erro' : undefined)} inputMode="decimal" className="tabular-nums" value={limites[i]} onChange={(e) => handleMudar(i as 0 | 1 | 2, e.target.value)} />
          </Campo>
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {(previa ?? atuais).map((f) => (
          <li key={f.id} className={cn('flex justify-between border-b border-border py-2 font-medium', COR[f.id])}>
            <span>{f.rotulo}</span>
            <span className="tabular-nums">{formatarNota(f.de)} a {formatarNota(f.ate)}</span>
          </li>
        ))}
      </ul>
      <Button className="self-start" onClick={() => void handleSalvar()} disabled={!valido || salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar faixas'}</Button>
    </div>
  );
}
