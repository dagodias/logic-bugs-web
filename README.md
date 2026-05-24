# Logic Bugs Web

> Jogo de puzzle 2D em grade, inspirado nos princípios de jogabilidade
> do Berusky, reimaginado como experiência Web moderna e educativa.
>
> **Não é um clone.** É um estudo dos princípios + criação autoral nova.
>
> 🎮 **Jogue agora:** https://games.ensinosocial.com.br/logic-bugs/

---

## Estado atual

✅ **v3 no ar** desde 2026-05-15.
**126 fases jogáveis** = 6 fases de Aprendizado (tutorial autoral, uma
mecânica por fase) + 120 fases originais do Berusky importadas direto
dos arquivos `.lv3` binários.

Todas as 7 mecânicas Berusky implementadas: TNT, multi-personagem (até 5
insetos com Tab/1-5), pedra+picareta, one-pass door, color gateway,
chaves+portas coloridas. Sons sutis sintetizados via Web Audio API.
Camera follow pra grades 32×21 que não cabem na tela.

**Novidades v3:**
- **Ranking server-side** integrado com EnsinoSocial (cookie cross-subdomain) — top global, top por fase, "minhas fases", com pódio top-3 + paginação
- **Anti-cheat em 3 camadas**: cleanup do localStorage no boot + gate de submit + validação server-side com `movimentos_otimos`
- **Layout lateral** também em mobile landscape (≥640px) — antes era topbar+bottombar achatando a grade
- **Animações** mais envolventes: modal de vitória com bounce/confetti, flash de coleta de gema no centro
- **Dica de Reiniciar** com banner + botão pulsante quando o jogador trava (3 shakes consecutivos)
- **Chip de login persistente** no topo direito (smart: só foto se for própria, foto+nome se for genérica)

Próximos passos sugeridos: solver/validador pra preencher `movimentosOtimos` das 104 fases Berusky restantes, replay validation pra anti-cheat completo, sistema de ligas semanal, modo daily challenge.

---

## Como rodar (depois do `npm install`)

```bash
# 1. Instalar dependências (uma vez)
npm install

# 2. Servidor de desenvolvimento (hot reload)
npm run dev
# Abre em http://localhost:5173

# 3. Build de produção
npm run build
# Arquivos prontos pra deploy em dist/

# 4. Verificação de tipos
npm run typecheck

# 5. Testes
npm test
```

---

## Stack resumida

- **TypeScript 5** + **Vite 5** — tipagem + dev server rápido
- **DOM + CSS Grid** — render da grade, inspecionável no DevTools
- **Render diferencial** — só atualiza células que mudaram (anti-piscar)
- **Web Audio API** — sons sintéticos gerados em tempo real (zero assets)
- **localStorage** — progresso anônimo (limpa recordes inválidos no boot)
- **Backend EnsinoSocial** (PHP/MySQL) — ranking server-side via `fetch` cross-origin com cookie de sessão `.ensinosocial.com.br` (`SameSite=Lax`); fallback `navigator.sendBeacon` no submit
- **Sem framework** — vanilla TS, sem React/Vue
- **Hospedagem:** Nginx no Hetzner + Let's Encrypt SSL
- **Bundle:** ~35 KB gzipped no wire (cresceu ~7 KB com animações + RankingService)
- **Vitest** — preparado pra testes (ainda sem)

---

## Estrutura

```
logic-bugs-web/
├── src/
│   ├── main.ts                Entry point
│   ├── types.ts               Tipos compartilhados
│   ├── core/                  Game, GameState, HistoryManager
│   ├── systems/               InputManager, CollisionSystem, EntitySystem,
│   │                          LevelManager, AudioManager
│   ├── render/                Renderer (com render diff + camera follow), UIManager
│   └── data/
│       ├── levels.ts          Tutoriais autorais + import LEVELS_BERUSKY
│       ├── levels-berusky.ts  120 fases Berusky importadas dos .lv3 originais
│       └── tileTypes.ts       Mapeamento char→tile
├── public/                    Sprites SVG estáticos
├── styles/                    CSS
├── tests/                     Testes (Vitest)
├── index.html                 HTML raiz
└── package.json / tsconfig.json / vite.config.ts
```

---

## Filosofia

3 princípios que guiam toda decisão:

1. **Pensar antes de programar.** Plano claro evita retrabalho.
2. **Separação de responsabilidades.** Cada módulo tem 1 propósito
   declarado nas docstrings. Quem mistura coisas, vira spaghetti.
3. **Pequenos passos verificáveis.** Cada fase de implementação entrega
   algo testável. Sem big bang.

---

## Licença

Distribuído sob **GNU General Public License v2 ou posterior**
(GPL-2.0-or-later) — veja [`LICENSE`](LICENSE).

As 120 fases originais do Berusky foram importadas direto dos arquivos
`.lv3` da Anakreon, que são GPL v2+. Por força do *copyleft*, o conjunto
inteiro (engine TypeScript autoral + fases importadas) é distribuído sob
os mesmos termos. Créditos completos da equipe original e separação
entre obra original e autoral em [`CREDITS.md`](CREDITS.md).

> Berusky © AnakreoN — Martin Stránský & Luboš Doležal — <https://www.anakreon.cz/berusky1.html>

---

## Inspirações

- **Berusky / Beruska** — princípios de puzzle 2D em grade (foco do estudo)
- **Sokoban** — empurrar caixas, raiz do gênero
- **Stephen's Sausage Roll** — referência moderna em puzzles minimalistas
- **Baba Is You** — referência em ensinar mecânicas por descoberta

---

## Status — v2 entregue

### v1 (2026-05-11/12): 13 fases de fundação

| Bloco | Status |
|-------|--------|
| Fases 0-1 — Esqueleto + estudo Berusky | ✅ |
| Fases 2-5 — Renderer, movimento, colisão, empurrar | ✅ |
| Fases 6-8 — Coletáveis, portas, vitória | ✅ |
| Fase 9 — Reiniciar + desfazer | ✅ |
| Fase 10 — UI completa (menu, seleção, HUD) | ✅ |
| Fase 11 — Polish visual | ✅ |
| Fase 12 — Mobile/touch + 15 fases curadas | ✅ |
| Fase 13 — Deploy em produção | ✅ |

### v2 (2026-05-12): Berusky completo

| Épico | Cobertura | Status |
|-------|-----------|--------|
| **A** — Pesquisa & parser binário `.lv3` | 120 fases parseadas | ✅ |
| **B1** — TNT (empurrar + explodir caixa) | +14 fases | ✅ |
| **B2** — Multi-personagem (Tab/1-5, até 5 insetos) | +15 fases | ✅ |
| **B3** — Pedra + picareta | +48 fases | ✅ |
| **B4** — One-pass door (fecha após uso) | +12 fases | ✅ |
| **B5** — Color gateway (só passa cor correta) | +9 fases | ✅ |
| **B6** — Chaves + portas coloridas | +16 fases | ✅ |
| **C** — Camera follow + cell adaptativo | grades 32×21 cabem | ✅ |
| **D** — Importação das 120 fases originais | 120 FaseDef geradas | ✅ |
| **E** — UI agrupada por levelset | `<details>` colapsáveis | ✅ |
| **+ áudio** | Web Audio sintético, 9 sons | ✅ |
| **+ render diferencial** | Anti-piscar | ✅ |

**🌐 No ar:** https://games.ensinosocial.com.br/logic-bugs/
