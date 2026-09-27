import { useState } from 'react';
import { Button } from './button';
import { Campo, propsDoCampo } from './campo';
import { Dialogo } from './dialogo';
import { Input } from './input';

interface ConfirmarExclusaoProps {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
  titulo: string;
  descricao: string;
  /** Se informado, o usuário precisa digitar este texto para habilitar o botão. */
  textoParaDigitar?: string;
  rotuloConfirmar?: string;
  processando?: boolean;
}

export function ConfirmarExclusao({
  aberto,
  onFechar,
  onConfirmar,
  titulo,
  descricao,
  textoParaDigitar,
  rotuloConfirmar = 'Excluir',
  processando = false,
}: ConfirmarExclusaoProps) {
  const [digitado, setDigitado] = useState('');
  const liberado = !textoParaDigitar || digitado.trim() === textoParaDigitar;

  function handleFechar() {
    setDigitado('');
    onFechar();
  }

  return (
    <Dialogo aberto={aberto} onFechar={handleFechar} titulo={titulo}>
      <p>{descricao}</p>
      {textoParaDigitar ? (
        <Campo id="confirmar-texto" rotulo={`Digite “${textoParaDigitar}” para confirmar`}>
          <Input {...propsDoCampo('confirmar-texto')} value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
        </Campo>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={handleFechar}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirmar} disabled={!liberado || processando}>
          {processando ? 'Excluindo…' : rotuloConfirmar}
        </Button>
      </div>
    </Dialogo>
  );
}
