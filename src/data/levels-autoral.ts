/**
 * levels-autoral.ts — Aprendizado do Logic Bugs.
 *
 * Tutorial enxuto: 9 fases que apresentam uma mecanica nova por fase
 * (mover, planejar, coletar, empurrar, cadeia, chave+porta, TNT, picareta,
 * porta unica). Cada fase tem pegadinha — caminho obvio falha.
 *
 * IDs em 1000+ pra nao colidir com fases Berusky (3-122) nem tutoriais
 * legados (1-2). Grade pequena (7x4 a 10x7) pra visualizar inteiro sem
 * camera follow.
 *
 * Legenda dos caracteres do mapa em data/levels.ts.
 */

import type { FaseDef } from '../types';

export const LEVELS_AUTORAL: FaseDef[] = [
  // -------------------------------------------------------------
  // 1. Andar e virar (mover + uma curva)
  // -------------------------------------------------------------
  {
    id: 1000,
    nome: 'Primeiros Passos',
    dificuldade: 'tutorial',
    mapa: [
      '#######',
      '#P....#',
      '#####.#',
      '#####E#',
      '#######',
    ],
    movimentosOtimos: 6,
    pista: 'Use setas, WASD ou deslize. Faca a curva e chegue na saida.',
  },

  // -------------------------------------------------------------
  // 3. Coletar
  // -------------------------------------------------------------
  {
    id: 1002,
    nome: 'Pegue Antes',
    dificuldade: 'facil',
    mapa: [
      '##########',
      '#P.......E#'.slice(0, 10),
      '#........#',
      '###.######',
      '#........#',
      '#.......C#',
      '##########',
    ],
    movimentosOtimos: 28,
    pista: 'A saida nao abre se voce esquecer a gema. Procure no caminho.',
  },

  // -------------------------------------------------------------
  // 4. Empurrar
  // -------------------------------------------------------------
  {
    id: 1004,
    nome: 'Empurre Pra Abrir',
    dificuldade: 'facil',
    mapa: [
      '########',
      '#P.....#',
      '#####B##',
      '#......#',
      '#......E',
      '########',
    ],
    movimentosOtimos: 9,
    pista: 'Empurre o bloco ate aparecer o atalho la em cima.',
  },

  // -------------------------------------------------------------
  // 5. Chave + Porta — chave longe, forca tentar a porta primeiro
  // -------------------------------------------------------------
  {
    id: 1006,
    nome: 'A Chave e a Porta',
    dificuldade: 'facil',
    mapa: [
      '###########',
      '#P...D...E#',
      '####.######',
      '#.........#',
      '#........K#',
      '###########',
    ],
    movimentosOtimos: 24,
    pista: 'Tente atravessar a porta primeiro. Vai travar — a chave esta no outro lado.',
  },

  // -------------------------------------------------------------
  // 6. TNT + Picareta + Pedra (combinacao destrutiva)
  // -------------------------------------------------------------
  {
    id: 1011,
    nome: 'Detona e Quebra',
    dificuldade: 'facil',
    mapa: [
      '##########',
      '#P.T.B...#',
      '####.#####',
      '#..M..S.E#',
      '##########',
    ],
    movimentosOtimos: 12,
    pista: 'Empurre a TNT contra o bloco. Pegue a picareta. Quebre a pedra.',
  },

  // -------------------------------------------------------------
  // 9. Porta unica
  // -------------------------------------------------------------
  {
    id: 1016,
    nome: 'Porta Unica',
    dificuldade: 'facil',
    mapa: [
      '#########',
      '#P..O...#',
      '####.####',
      '#.......#',
      '#......E#',
      '#########',
    ],
    movimentosOtimos: 5,
    pista: 'A porta clara fecha apos voce passar. Atravesse so quando tiver certeza.',
  },
];
