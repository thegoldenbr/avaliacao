import { useEffect, useState } from 'react';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input, Textarea } from '@/components/ui/input';

interface CampoAoSairProps {
  id: string;
  rotulo: string;
  valor: string | number;
  /** Chamado ao sair do campo, só se o valor mudou e é válido. Números chegam já convertidos em texto. */
  onSalvar: (valor: string) => void;
  numero?: boolean;
  obrigatorio?: boolean;
  multilinha?: boolean;
  maxLength?: number;
  ajuda?: string;
  className?: string;
}

/** Campo que salva ao sair (blur): o editor de questionário não tem botão "Salvar". */
export function CampoAoSair({ id, rotulo, valor, onSalvar, numero = false, obrigatorio = false, multilinha = false, maxLength, ajuda, className }: CampoAoSairProps) {
  const [texto, setTexto] = useState(String(valor));
  const [erro, setErro] = useState<string | undefined>();

  useEffect(() => {
    setTexto(String(valor));
    setErro(undefined);
  }, [valor]);

  function handleSair() {
    const limpo = texto.trim();
    if (limpo === String(valor)) return;
    if (numero) {
      const n = Number(limpo.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0 || n > 1000) {
        setErro('Use um número maior que zero.');
        return;
      }
      setErro(undefined);
      onSalvar(String(n));
      return;
    }
    if (obrigatorio && !limpo) {
      setErro('Preencha este campo.');
      return;
    }
    setErro(undefined);
    onSalvar(limpo);
  }

  const comum = {
    ...propsDoCampo(id, erro, ajuda),
    value: texto,
    onChange: (e: { target: { value: string } }) => setTexto(e.target.value),
    onBlur: handleSair,
    maxLength,
  };

  return (
    <Campo id={id} rotulo={rotulo} erro={erro} ajuda={ajuda} className={className}>
      {multilinha ? <Textarea {...comum} className="min-h-16" /> : <Input {...comum} type={numero ? 'number' : 'text'} inputMode={numero ? 'decimal' : undefined} step={numero ? 'any' : undefined} min={numero ? 0 : undefined} />}
    </Campo>
  );
}
