/**
 * levels.ts — Catálogo de fases.
 *
 * 2 fases tutorial pequenas + 120 fases originais do Berusky importadas
 * (`levels-berusky.ts`, auto-gerado por `tools/berusky/import-levels.mjs`).
 *
 * Legenda dos caracteres do mapa:
 *   .  piso vazio
 *   #  parede
 *   P / 1-5  jogador (idx 0-4)
 *   B  bloco empurrável
 *   T  TNT (empurrável; detona caixa adjacente)
 *   S  pedra (precisa picareta)
 *   M  picareta (coletável)
 *   K  chave global (Berusky: precisa coletar TODAS pra saída abrir)
 *   F-J  chaves coloridas (idx 0-4)
 *   V-Z  portas coloridas (idx 0-4)
 *   D  porta com chave (legacy, não usada nas fases Berusky)
 *   O  porta one-pass (fecha após primeiro passe)
 *   a-e  color gateway (só jogador da cor passa, sem chave)
 *   C  coletável genérico (gema)
 *   E  saída
 */

import type { FaseDef } from '../types';
import { LEVELS_AUTORAL } from './levels-autoral';
import { LEVELS_BERUSKY } from './levels-berusky';

/**
 * Catalogo completo: aprendizado autoral (ids 1000+) primeiro,
 * seguido pelas 120 fases Berusky importadas (ids 3-122).
 * O aprendizado vem primeiro pra ser a "entrada padrao" do jogo.
 */
export const LEVELS: FaseDef[] = [...LEVELS_AUTORAL, ...LEVELS_BERUSKY];
