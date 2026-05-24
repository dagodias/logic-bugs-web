# Créditos

## Logic Bugs Web

Copyright (C) 2026 Dagoberto Dias — <dagodias@gmail.com>

Logic Bugs Web é um remake/port para a Web (TypeScript + Vite) inspirado
no jogo **Berusky** da Anakreon. As 120 fases originais do Berusky foram
importadas direto dos arquivos `.lv3` binários e re-empacotadas em
estruturas TypeScript via parser próprio (`tools/berusky/import-levels.mjs`).
As 6 fases de Aprendizado (tutoriais) são autorais e introduzem uma
mecânica por fase.

Como o jogo incorpora obras GPL (as 120 fases originais e seu game design),
o conjunto inteiro é distribuído sob os mesmos termos — veja [`LICENSE`](LICENSE).

---

## Berusky (obra original)

> Berusky © AnakreoN, 2007
> Distribuído sob GNU General Public License v2 (ou, à sua escolha,
> qualquer versão posterior).
>
> Site oficial: <https://www.anakreon.cz/berusky1.html>
> Contato: anakreon@anakreon.cz

### Equipe original do Berusky

| Função                          | Autor |
|---------------------------------|-------|
| Código (engine original em C++) | Martin "Komat" Stránský — <stransky@anakreon.cz> |
| Regras de jogo & Level design   | Luboš "Shobul" Doležal — <dolezall@brno.ferona.cz> |
| Gráficos in-game                | Jan "Riva" Halfar — <jan.halfar@pixellive.net> |
| Gráficos de menu & logos        | Václav "Mega" Hlobil — <mega@megadesign.cz> |
| Sons & música                   | Martin Linda — <amorph@seznam.cz> |
| Tradução para inglês            | Radek Biba — <rbiba@redhat.com> |
| Revisão de idioma               | Michal "Mipo" Policky |
| Testes de fases                 | Ondřej Souček |

### Colaboradores originais

Michal "Kofola" Šimoník · Pavel Doležal · Milan Hamrík · Jan Chalupa ·
Igor Blaha · Patrik Sýkora · Eva Sýkorová · Milan Crha · Mary Stránská

---

## O que veio do Berusky (sujeito à GPL v2+)

- **Game design das 120 fases** — toda a sequência de puzzles, posições
  de blocos, picaretas, TNT, chaves, portas, color gateways. Importadas
  via parser binário a partir do data pack original.
- **Regras de jogo** — empurrar caixas, TNT que explode em cruz,
  picareta que destrói pedra, one-pass door, color gateway, chaves e
  portas coloridas, vitória com 5 chaves + saída livre.

## O que é autoral do Logic Bugs Web (também GPL v2+ porque a obra é um todo)

- **Engine em TypeScript** — Renderer DOM/CSS Grid, GameState, sistema
  de colisão, EntitySystem, HistoryManager (desfazer), InputManager,
  LevelManager, AudioManager, camera follow, render diferencial.
- **Sons** — sintetizados em tempo real via Web Audio API (sem usar os
  assets de som originais do Berusky).
- **Gráficos** — emoji + CSS (sem usar os sprites originais do Berusky).
- **6 fases de Aprendizado** — tutoriais autorais.
- **Sistema de ranking** integrado ao EnsinoSocial.
- **Layout, UX, animações, sistema de pontuação**.

## Modificações relevantes ao porte

Por exigência da GPL v2 §2(a), declaro as alterações principais:

- 2026-05-12 — Port completo do engine C++/SDL original para
  TypeScript/DOM rodando em navegador.
- 2026-05-12 — Conversão das 120 fases `.lv3` (formato binário) para
  estruturas TypeScript via parser próprio.
- 2026-05-12 a 2026-05-15 — Adição de 6 tutoriais autorais, sons
  sintéticos, camera follow, render diferencial, sistema de ranking
  server-side, animações, anti-cheat em 3 camadas.

---

## Aviso legal

Este software é fornecido "COMO ESTÁ", sem garantia de qualquer tipo.
Veja [`LICENSE`](LICENSE) para os termos completos.

Berusky é marca/projeto da Anakreon. Logic Bugs Web não é afiliado nem
endossado oficialmente pela Anakreon — é um remake feito por respeito ao
trabalho original, sob os termos da licença GPL v2+ na qual o Berusky
foi liberado.
