# Design system — Radar de Desempenho

Documento de apoio ao [`PROJECT_STYLE.md`](../PROJECT_STYLE.md). Os mockups em [`mockups/`](../mockups/index.html) usam exatamente estes tokens (`mockups/assets/mockup.css`). Na Fase 1 eles viram variáveis CSS mapeadas no Tailwind.

## Princípios

- Hierarquia pela tipografia e pelo espaço; sem gradientes, sem sombras decorativas, sem rótulos em caixa alta.
- Cartão só quando agrupa algo de fato. Listas separadas por linhas finas são o padrão.
- O elemento marcante é a **nota geral com o radar**. O resto é silencioso.
- Nada comunicado só por cor: faixas têm ícone e rótulo; séries do radar têm estilos de linha diferentes.
- Movimento só em resposta a ações e num único momento marcante (o radar se abrindo no dashboard). `prefers-reduced-motion` desliga tudo.

## Tokens de cor

Sempre via variável (`--color-*`), nunca hex no componente.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--color-primary` | `#2B4ACB` | `#8EA2FF` | Ações, foco, série atual do radar |
| `--color-primary-hover` | `#223CA6` | `#A9B8FF` | Hover do botão primário |
| `--color-on-primary` | `#FFFFFF` | `#0B1230` | Texto sobre o primário (calculado em runtime para a cor configurável) |
| `--color-background` | `#F8FAFC` | `#0F172A` | Fundo da página |
| `--color-surface` | `#FFFFFF` | `#1E293B` | Barras, cartões, campos |
| `--color-surface-alt` | `#F1F5F9` | `#172136` | Hover, trilhos de barra |
| `--color-border` | `#E2E8F0` | `#334155` | Divisores |
| `--color-border-strong` | `#CBD5E1` | `#475569` | Bordas de campos e botões |
| `--color-text` | `#0F172A` | `#F1F5F9` | Texto principal |
| `--color-text-muted` | `#536074` | `#A3B1C6` | Texto secundário |
| `--color-success` / `error` / `warning` | `#047857` / `#B91C1C` / `#B45309` | `#34D399` / `#F87171` / `#FBBF24` | Estados |

**Ajustes em relação ao proposto no prompt** (contraste AA, 4,5:1):
- `text_secondary` claro: `#64748B` dava ~4,3:1 sobre `#F8FAFC`; usamos `#536074` (~6:1).
- `text_secondary` escuro: `#94A3B8` sobre a superfície `#1E293B` fica no limite; usamos `#A3B1C6`.
- No escuro, `success`, `error` e `warning` são versões mais claras dos tons do tema claro.

### Faixas de classificação

Classificação pela nota **já arredondada** (uma casa). Cada faixa tem cor, ícone e rótulo.

| Faixa | Intervalo padrão | Ícone | Claro | Escuro |
|---|---|---|---|---|
| Crítico | 0,0–4,9 | círculo com X | `#B91C1C` | `#F87171` |
| Atenção | 5,0–6,9 | triângulo de alerta | `#B45309` | `#FBBF24` |
| Bom | 7,0–8,4 | círculo com check | `#4D7C0F` (verde-oliva) | `#A3D13F` |
| Excelente | 8,5–10 | estrela | `#047857` | `#34D399` |

Séries do radar: **atual** (primário, sólida, com preenchimento leve), **anterior** (cinza, tracejada), **meta** (âmbar, pontilhada), **média** (violeta, traço-ponto).

## Tipografia

| Papel | Opção A (proposta) | Opção B (alternativa) |
|---|---|---|
| Títulos e corpo | IBM Plex Sans | Figtree |
| Mono (raro) | IBM Plex Mono | — |

Ambas carregadas localmente no projeto (`@fontsource`); nos mockups vêm do Google Fonts só por conveniência. **Você escolhe A ou B** ao aprovar. Escala: corpo 16 px, títulos 26 / 20 / 17 px, pesos 400, 500, 600. Números sempre com `font-variant-numeric: tabular-nums`. Nota em destaque: 72 px, peso 600.

## Espaçamento, forma e densidade

- Raio: 10 px (cartões), 8 px (controles), pílula nas etiquetas. Densidade "balanceada".
- Espaços em múltiplos de 4 px: `.5rem` entre itens próximos, `1rem` entre blocos, `2–3rem` entre seções.
- Texto corrido dos relatórios: máx. 75 caracteres por linha (`.leitura`).

## Responsivo

| Largura | Comportamento |
|---|---|
| < 720 px | Uma coluna; tabelas viram listas (rótulo antes do valor); navegação inferior fixa com 5 itens |
| 720–1023 px | Duas colunas onde couber |
| ≥ 1024 px | Barra lateral de 248 px (recolhível na implementação) e conteúdo até 1100 px |
| ≥ 1100 px | Editor do relatório com pré-visualização ao lado |

Sem rolagem horizontal em 360, 390, 768, 1024 e 1440 px (verificado por script nos mockups). Barras fixas respeitam `env(safe-area-inset-*)`.

## Componentes do domínio

- **EscalaNota** — 11 botões (0–10), 48 × 51 px em 390 px, espaçamento de 8 px; 6 + 5 em duas linhas no celular e uma linha a partir de 640 px. Nada pré-selecionado. `role="radiogroup"` com `role="radio"`. Selecionado: fundo primário. Rótulos dos extremos abaixo.
- **BadgeFaixa** — ícone + rótulo, na cor da faixa; fundo levemente tingido quando em destaque.
- **NotaDestaque** — número com uma casa, "de 10", faixa e variação (▲ verde / ▼ vermelho, sempre com sinal e texto).
- **RadarDesempenho** — SVG, eixos = grupos, anéis em 2/4/6/8/10, escala fixa 0–10; rótulos curtos; toque/hover mostra o valor; legenda com amostra do estilo de linha; tabela equivalente oculta (`sr-only`) para leitores de tela. Com menos de 3 grupos, barras horizontais.
- **BarraPergunta** — barra 0–10 na cor da faixa, nota ao lado; enunciado acima.
- **CartaoRecomendacao** — barra lateral na cor da prioridade + etiquetas de prioridade (com ícone), horizonte e grupo.
- **Botões** — primário, secundário (contorno), fantasma, perigo (contorno vermelho). Altura mínima 44 px. Rótulos com verbos ("Publicar relatório").
- **Campos** — rótulo sempre visível, ajuda abaixo, erro junto ao campo com ícone e texto (“o que aconteceu e como resolver”). Fonte 16 px.
- **Estados** — skeleton no carregamento; vazio com ícone + explicação + ação; botão com spinner durante ação assíncrona.

## Acessibilidade

Foco visível de 3 px; alvos ≥ 44 px; contraste AA nos dois temas; hierarquia de títulos; `aria-live`/`role="alert"` nos avisos; tabela equivalente do radar; ícones decorativos com `aria-hidden`.

## Do que fugimos de propósito

Cartões idênticos para tudo, rótulos em caixa alta acima de títulos, gradientes, setas “→” em botões, animação de entrada em cada seção.

## Observações sobre os mockups

- Páginas estáticas (HTML/CSS). Um pequeno `mockup.js` só injeta ícones Lucide, o menu da área interna e desenha o radar a partir dos dados; a versão real usa React e Recharts.
- O **PDF** é sempre em papel branco, independentemente do tema.
- Estilos `style="…"` inline aparecem em poucos pontos dos mockups por conveniência; não serão usados no código real.
