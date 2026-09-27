import { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemaProvider } from '@/features/tema/TemaProvider';
import { AplicarMarca } from '@/features/marca/AplicarMarca';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RotaAdmin, RotaProtegida } from '@/features/auth/RotasProtegidas';
import { AppLayout } from './AppLayout';
import { PublicLayout } from './PublicLayout';

// Rotas carregadas sob demanda: o bundle inicial fica pequeno (importante no celular).
const InicioPagina = lazy(() => import('@/features/inicio/InicioPagina'));
const EmpresasPagina = lazy(() => import('@/features/empresas/EmpresasPagina'));
const EmpresaPagina = lazy(() => import('@/features/empresas/EmpresaPagina'));
const EmpresaFormPagina = lazy(() => import('@/features/empresas/EmpresaFormPagina'));
const QuestionariosPagina = lazy(() => import('@/features/questionarios/QuestionariosPagina'));
const QuestionarioEditorPagina = lazy(() => import('@/features/questionarios/editor/QuestionarioEditorPagina'));
const QuestionarioPreviaPagina = lazy(() => import('@/features/questionarios/QuestionarioPreviaPagina'));
const AvaliacoesPagina = lazy(() => import('@/features/avaliacoes/AvaliacoesPagina'));
const ConfiguracoesPagina = lazy(() => import('@/features/configuracoes/ConfiguracoesPagina'));
const MaisPagina = lazy(() => import('@/features/conta/MaisPagina'));
const LoginPagina = lazy(() => import('@/features/auth/LoginPagina'));
const EsqueciSenhaPagina = lazy(() => import('@/features/auth/EsqueciSenhaPagina'));
const RedefinirSenhaPagina = lazy(() => import('@/features/auth/RedefinirSenhaPagina'));
const AceitarConvitePagina = lazy(() => import('@/features/auth/AceitarConvitePagina'));
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
        <ToastProvider>
          <AuthProvider>
            <AplicarMarca />
            <HashRouter>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/login" element={<LoginPagina />} />
                  <Route path="/esqueci-senha" element={<EsqueciSenhaPagina />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenhaPagina />} />
                  <Route path="/aceitar-convite" element={<AceitarConvitePagina />} />
                  <Route element={<PublicLayout />}>
                    <Route path="/responder/:token" element={<ResponderPagina />} />
                    <Route path="/relatorio/:token" element={<RelatorioPublicoPagina />} />
                  </Route>
                  <Route element={<RotaProtegida />}>
                    <Route element={<AppLayout />}>
                      <Route index element={<InicioPagina />} />
                      <Route path="/empresas" element={<EmpresasPagina />} />
                      <Route path="/empresas/nova" element={<EmpresaFormPagina />} />
                      <Route path="/empresas/:id" element={<EmpresaPagina />} />
                      <Route path="/empresas/:id/editar" element={<EmpresaFormPagina />} />
                      <Route path="/questionarios" element={<QuestionariosPagina />} />
                      <Route path="/questionarios/:id" element={<QuestionarioEditorPagina />} />
                      <Route path="/questionarios/:id/previa" element={<QuestionarioPreviaPagina />} />
                      <Route path="/avaliacoes" element={<AvaliacoesPagina />} />
                      <Route path="/mais" element={<MaisPagina />} />
                      <Route element={<RotaAdmin />}>
                        <Route path="/configuracoes" element={<ConfiguracoesPagina />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<NaoEncontrada />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </AuthProvider>
        </ToastProvider>
      </TemaProvider>
    </QueryClientProvider>
  );
}
