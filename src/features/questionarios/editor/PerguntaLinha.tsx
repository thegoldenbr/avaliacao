import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Pergunta } from '@/lib/tipos';
import { formatarPercentual } from '../pesos';
import { CampoAoSair } from './CampoAoSair';
import { ItemOrdenavel } from './Ordenacao';
import { useAcoesEditor } from './useAcoesEditor';

interface PerguntaLinhaProps {
  questionarioId: string;
  pergunta: Pergunta;
  posicao: number;
  total: number;
  /** Peso relativo dentro do grupo e na nota geral, em %. */
  percentualNoGrupo: number;
  percentualNaNota: number;
  onMover: (direcao: -1 | 1) => void;
  onExcluir: () => void;
}

export function PerguntaLinha({ questionarioId, pergunta, posicao, total, percentualNoGrupo, percentualNaNota, onMover, onExcluir }: PerguntaLinhaProps) {
  const { editor, executar } = useAcoesEditor(questionarioId);
  const id = pergunta.id;
  const salvar = (patch: Parameters<typeof editor.atualizarPergunta.mutateAsync>[0]['patch']) =>
    void executar(editor.atualizarPergunta.mutateAsync({ id, patch }));

  return (
    <ItemOrdenavel id={id} rotuloAlca={`Arrastar a pergunta ${posicao} para reordenar`} className="border-t border-border bg-surface">
      {(alca) => (
        <div className="flex gap-1 py-3 pr-3 pl-1">
          {alca}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <CampoAoSair id={`p-${id}-enunciado`} rotulo={`Pergunta ${posicao}`} valor={pergunta.enunciado} obrigatorio multilinha maxLength={500} onSalvar={(v) => salvar({ enunciado: v })} />
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <CampoAoSair id={`p-${id}-peso`} rotulo="Peso" numero valor={pergunta.peso} className="w-24" onSalvar={(v) => salvar({ peso: Number(v) })} />
              <p className="pb-3 text-sm text-muted tabular-nums">{formatarPercentual(percentualNoGrupo)} do grupo · {formatarPercentual(percentualNaNota)} da nota</p>
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" className="size-5 accent-primary" checked={pergunta.escala_invertida} onChange={(e) => salvar({ escala_invertida: e.target.checked })} />
                Escala invertida
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" className="size-5 accent-primary" checked={pergunta.permite_comentario} onChange={(e) => salvar({ permite_comentario: e.target.checked })} />
                Permite comentário
              </label>
            </div>
            <details className="text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center text-primary">Texto de apoio e rótulos da escala</summary>
              <div className="grid gap-3 pt-2 md:grid-cols-2">
                <CampoAoSair id={`p-${id}-apoio`} rotulo="Texto de apoio" valor={pergunta.texto_apoio ?? ''} multilinha className="md:col-span-2" onSalvar={(v) => salvar({ texto_apoio: v || null })} />
                <CampoAoSair id={`p-${id}-min`} rotulo="Rótulo do 0" valor={pergunta.rotulo_min ?? ''} ajuda="Vazio usa o padrão das configurações." onSalvar={(v) => salvar({ rotulo_min: v || null })} />
                <CampoAoSair id={`p-${id}-max`} rotulo="Rótulo do 10" valor={pergunta.rotulo_max ?? ''} onSalvar={(v) => salvar({ rotulo_max: v || null })} />
              </div>
              {pergunta.escala_invertida ? <p className="pt-2 text-muted">Escala invertida: a nota 10 significa o pior cenário, então a nota efetiva é 10 − resposta.</p> : null}
            </details>
          </div>
          <div className="flex flex-col">
            <Button variant="ghost" size="icone" onClick={() => onMover(-1)} disabled={posicao === 1} aria-label={`Subir a pergunta ${posicao}`}><ArrowUp className="size-5" aria-hidden="true" /></Button>
            <Button variant="ghost" size="icone" onClick={() => onMover(1)} disabled={posicao === total} aria-label={`Descer a pergunta ${posicao}`}><ArrowDown className="size-5" aria-hidden="true" /></Button>
            <Button variant="ghost" size="icone" onClick={onExcluir} aria-label={`Remover a pergunta ${posicao}`}><Trash2 className="size-5" aria-hidden="true" /></Button>
          </div>
        </div>
      )}
    </ItemOrdenavel>
  );
}
