import { Radar } from 'lucide-react';
import { EmConstrucao } from '@/features/comum/EmConstrucao';

/** Rota /#/relatorio/:token: dashboard do cliente. */
export default function RelatorioPublicoPagina() {
  return <EmConstrucao titulo="Relatório de desempenho" fase="Fase 6" icone={Radar} detalhe="Dashboard com radar, análises e recomendações." />;
}
