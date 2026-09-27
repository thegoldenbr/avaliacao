import { LockKeyhole } from 'lucide-react';
import { LogoMarca } from '@/features/marca/LogoMarca';
import { EmConstrucao } from '@/features/comum/EmConstrucao';

export default function LoginPagina() {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-6">
      <div className="flex w-full max-w-[420px] flex-col gap-8">
        <LogoMarca />
        <EmConstrucao
          titulo="Entrar"
          fase="Fase 2"
          icone={LockKeyhole}
          detalhe="Login com e-mail e senha, recuperação de senha e convites de usuários."
        />
      </div>
    </div>
  );
}
