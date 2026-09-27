import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmarExclusao } from '@/components/ui/confirmar-exclusao';
import { cn } from '@/lib/utils';
import type { GrupoCompleto } from '../api';
import { formatarPercentual, percentuais } from '../pesos';
import { CampoAoSair } from './CampoAoSair';
import { ItemOrdenavel, ListaOrdenavel } from './Ordenacao';
import { PerguntaLinha } from './PerguntaLinha';
import { useAcoesEditor } from './useAcoesEditor';

interface GrupoCardProps {
  questionarioId: string;
  grupo: GrupoCompleto;
  posicao: number;
  total: number;
  percentualNaNota: number;
  onMover: (direcao: -1 | 1) => void;
}

type AlvoExclusao = { tipo: 'grupo' } | { tipo: 'pergunta'; id: string; posicao: number };

export function GrupoCard({ questionarioId, grupo, posicao, total, percentualNaNota, onMover }: GrupoCardProps) {
  const { editor, executar } = useAcoesEditor(questionarioId);
  const [aberto, setAberto] = useState(true);
  const [alvo, setAlvo] = useState<AlvoExclusao | null>(null);
  const perguntas = grupo.perguntas;
  const pctNoGrupo = percentuais(perguntas.map((p) => p.peso));
  const salvar = (patch: Parameters<typeof editor.atualizarGrupo.mutateAsync>[0]['patch']) =>
    void executar(editor.atualizarGrupo.mutateAsync({ id: grupo.id, patch }));

  function handleAdicionarPergunta() {
    const ordem = perguntas.reduce((maior, p) => Math.max(maior, p.ordem), 0) + 1;
    void executar(editor.criarPergunta.mutateAsync({ grupo_id: grupo.id, enunciado: 'Nova pergunta', peso: 1, ordem }));
  }

  function handleMoverPergunta(indice: number, direcao: -1 | 1) {
    const ids = perguntas.map((p) => p.id);
    const destino = indice + direcao;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino] as string, ids[indice] as string];
    void executar(editor.reordenar.mutateAsync({ tabela: 'perguntas', ids }));
  }

  function handleConfirmarExclusao() {
    if (!alvo) return;
    const operacao = alvo.tipo === 'grupo' ? editor.excluirGrupo.mutateAsync(grupo.id) : editor.excluirPergunta.mutateAsync(alvo.id);
    void executar(operacao, 'Não foi possível remover.').then(() => setAlvo(null));
  }

  return (
    <ItemOrdenavel id={grupo.id} rotuloAlca={`Arrastar o grupo ${posicao} para reordenar`} className="rounded-cartao border border-border bg-surface">
      {(alca) => (
        <>
          <div className="flex flex-wrap items-start gap-2 p-3 pl-1">
            {alca}
            <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[2fr_1fr_90px_90px]">
              <CampoAoSair id={`g-${grupo.id}-nome`} rotulo={`Grupo ${posicao}`} valor={grupo.nome} obrigatorio maxLength={120} onSalvar={(v) => salvar({ nome: v })} />
              <CampoAoSair id={`g-${grupo.id}-curto`} rotulo="Rótulo no radar" valor={grupo.nome_curto} obrigatorio maxLength={16} ajuda="Até 16 letras." onSalvar={(v) => salvar({ nome_curto: v })} />
              <CampoAoSair id={`g-${grupo.id}-peso`} rotulo="Peso" numero valor={grupo.peso} onSalvar={(v) => salvar({ peso: Number(v) })} />
              <CampoAoSair id={`g-${grupo.id}-meta`} rotulo="Meta" numero valor={grupo.meta ?? ''} ajuda="Nota-alvo, 0–10" onSalvar={(v) => salvar({ meta: Math.min(10, Number(v)) })} />
            </div>
            <div className="flex items-center">
              <Badge className="mr-1">{formatarPercentual(percentualNaNota)} da nota</Badge>
              <Button variant="ghost" size="icone" onClick={() => onMover(-1)} disabled={posicao === 1} aria-label={`Subir o grupo ${posicao}`}><ArrowUp className="size-5" aria-hidden="true" /></Button>
              <Button variant="ghost" size="icone" onClick={() => onMover(1)} disabled={posicao === total} aria-label={`Descer o grupo ${posicao}`}><ArrowDown className="size-5" aria-hidden="true" /></Button>
              <Button variant="ghost" size="icone" onClick={() => setAlvo({ tipo: 'grupo' })} aria-label={`Remover o grupo ${posicao}`}><Trash2 className="size-5" aria-hidden="true" /></Button>
              <Button variant="ghost" size="icone" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-label={aberto ? 'Recolher perguntas' : 'Mostrar perguntas'}>
                <ChevronDown className={cn('size-5 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
              </Button>
            </div>
          </div>
          {aberto ? (
            <>
              <ListaOrdenavel ids={perguntas.map((p) => p.id)} onReordenar={(ids) => void executar(editor.reordenar.mutateAsync({ tabela: 'perguntas', ids }))}>
                {perguntas.map((p, i) => (
                  <PerguntaLinha
                    key={p.id}
                    questionarioId={questionarioId}
                    pergunta={p}
                    posicao={i + 1}
                    total={perguntas.length}
                    percentualNoGrupo={pctNoGrupo[i] ?? 0}
                    percentualNaNota={((pctNoGrupo[i] ?? 0) * percentualNaNota) / 100}
                    onMover={(d) => handleMoverPergunta(i, d)}
                    onExcluir={() => setAlvo({ tipo: 'pergunta', id: p.id, posicao: i + 1 })}
                  />
                ))}
              </ListaOrdenavel>
              <div className="border-t border-border p-2">
                <Button variant="ghost" onClick={handleAdicionarPergunta}><Plus className="size-4" aria-hidden="true" />Adicionar pergunta</Button>
              </div>
            </>
          ) : null}
          <ConfirmarExclusao
            aberto={alvo !== null}
            onFechar={() => setAlvo(null)}
            onConfirmar={handleConfirmarExclusao}
            titulo={alvo?.tipo === 'grupo' ? 'Remover grupo' : 'Remover pergunta'}
            descricao={alvo?.tipo === 'grupo' ? `O grupo ${posicao} e as ${perguntas.length} perguntas dele serão removidos do modelo. Avaliações já criadas não são afetadas.` : 'A pergunta será removida do modelo. Avaliações já criadas não são afetadas.'}
            rotuloConfirmar="Remover"
          />
        </>
      )}
    </ItemOrdenavel>
  );
}
