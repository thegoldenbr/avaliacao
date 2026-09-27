import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemaProvider } from '@/features/tema/TemaProvider';
import { AplicarMarca } from '@/features/marca/AplicarMarca';
import { AppLayout } from './AppLayout';
import { PublicLayout } from './PublicLayout';

// Rotas carregadas sob demanda: o bundle inicial fica pequeno (importante no celular).
const InicioPagina = lazy(() => import('@/features/inicio/InicioPagina'));
const EmpresasPagina = lazy(() => import('@/features/empresas/EmpresasPagina'));
const QuestionariosPagina = lazy(() => import('@/features/questionarios/QuestionariosPagina'));
const AvaliacoesPagina = lazy(() => import('@/features/avaliacoes/AvaliacoesPagina'));
const ConfiguracoesPagina = lazy(() => import('@/features/configuracoes/ConfiguracoesPagina'));
const LoginPagina = lazy(() => import('@/features/auth/LoginPagina'));
const ResponderPagina = lazy(() => import('@/features/publico/ResponderPagina'));
const RelatorioPublicoPagina = lazy(() => import('@/features/publico/RelatorioPublicoPagina'));
const NaoEncontrada = lazy(() => import('./NaoEncontrada'));

const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

/**
 * HashRouter: links profundos funcionam no GitHub Pages sem truque de 404, e o token dos links
 * públicos fica no fragmento (#), que o navegador não envia ao servidor.
 */
export function App() {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <TemaProvider>
        <AplicarMarca />
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPagina />} />
            <Route element={<PublicLayout />}>
              <Route path="/responder/:token" element={<ResponderPagina />} />
              <Route path="/relatorio/:token" element={<RelatorioPublicoPagina />} />
            </Route>
            {/* Fase 2: estas rotas passam a exigir login. */}
            <Route element={<AppLayout />}>
              <Route index element={<InicioPagina />} />
              <Route path="/empresas" element={<EmpresasPagina />} />
              <Route path="/questionarios" element={<QuestionariosPagina />} />
              <Route path="/avaliacoes" element={<AvaliacoesPagina />} />
              <Route path="/configuracoes" element={<ConfiguracoesPagina />} />
            </Route>
            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </HashRouter>
      </TemaProvider>
    </QueryClientProvider>
  );
}
