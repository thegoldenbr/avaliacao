# PROJECT_STYLE.md
# Design system deste projeto. Edite à vontade.
# Gerado em: 2026-09-26

## Projeto
name: Radar de Desempenho (nome provisório)
description: Sistema para uma empresa avaliar outras empresas com questionários de nota 0 a 10 e apresentar os resultados em dashboards individuais.
tone: profissional, minimalista, confiável

## Stack
framework: HTML + JavaScript (módulos ES, sem build) — decisão de 2026-09-26, para servir direto no GitHub Pages
typescript: não
component_library: CSS próprio (css/app.css), derivado dos mockups
icons: Lucide (SVGs embutidos em js/icones.js)
animations: CSS (sutil, respeitando prefers-reduced-motion)

## Cores
primary: "#2B4ACB"
primary_hover: "#223CA6"
background: "#F8FAFC"
surface: "#FFFFFF"
border: "#E2E8F0"
text_primary: "#0F172A"
text_secondary: "#536074"   # ajustado de #64748B para atingir contraste AA (>= 4,5:1) sobre o background
accent: "#2B4ACB"
success: "#047857"
error: "#B91C1C"
warning: "#B45309"

## Dark Mode
dark_mode: both
dark_background: "#0F172A"
dark_surface: "#1E293B"
dark_border: "#334155"
dark_text_primary: "#F1F5F9"
dark_text_secondary: "#94A3B8"
dark_primary: "#8EA2FF"

## Tipografia
font_heading: "Figtree — local (fonts/)"
font_body: "Figtree — local (fonts/)"
font_mono: "IBM Plex Mono — local (@fontsource), uso raro (não instalada ainda)"
# Decisão (2026-09-26): opção B, Figtree. A opção A (IBM Plex Sans) segue nos mockups só para comparação.

## Layout & Tokens
border_radius: modern
density: balanced

## Componentes Específicos do Domínio
- EscalaNota: 11 botões (0–10), ≥ 44×44 px, quebram em 2 linhas no celular; estados padrão, foco e selecionado; nada pré-selecionado.
- BadgeFaixa: rótulo + ícone da faixa (Crítico, Atenção, Bom, Excelente); nunca só cor.
- NotaDestaque: nota com uma casa decimal em números tabulares, faixa e variação ▲▼ opcional.
- RadarDesempenho: eixos = grupos, escala fixa 0–10; séries atual, anterior, meta e média.
- BarraPergunta: barra horizontal 0–10 na cor da faixa, com a nota ao lado.
- CartaoRecomendacao: título, descrição, prioridade (alta/média/baixa) e horizonte (curto/médio/longo).
- Faixas: Crítico (vermelho), Atenção (âmbar), Bom (verde-oliva), Excelente (verde), em tons com contraste AA em cada tema.
