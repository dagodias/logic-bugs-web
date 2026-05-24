/**
 * tileTypes.ts — Mapeamento de caractere → tipo de tile.
 *
 * As fases são definidas em arrays de strings; cada caractere vira um tipo.
 * Manter esse mapa em um lugar só evita inconsistências.
 */

import type { TipoTile } from '../types';

/** Caractere usado no array de strings de uma fase → tipo lógico. */
export const CHAR_TO_TILE: Record<string, TipoTile> = {
  '.': 'vazio',
  '#': 'parede',
  'P': 'jogador',  // legacy: equivalente a '1' (jogador indice 0)
  '1': 'jogador',  // multi-player: indice 0 (vermelho)
  '2': 'jogador',  // indice 1
  '3': 'jogador',  // indice 2
  '4': 'jogador',  // indice 3
  '5': 'jogador',  // indice 4
  'B': 'bloco',
  'T': 'tnt',
  'S': 'pedra',
  'M': 'picareta',
  'K': 'chave',
  'D': 'porta',
  'O': 'porta_unica',
  // Color gateways (a-e): so jogador de cor correspondente atravessa
  'a': 'gateway',  // idx 0
  'b': 'gateway',  // idx 1
  'c': 'gateway',  // idx 2
  'd': 'gateway',  // idx 3
  'e': 'gateway',  // idx 4
  // Chaves coloridas (F-J): so player de mesma cor coleta
  'F': 'chave_colorida',  // idx 0
  'G': 'chave_colorida',  // idx 1
  'H': 'chave_colorida',  // idx 2
  'I': 'chave_colorida',  // idx 3
  'J': 'chave_colorida',  // idx 4
  // Portas coloridas (V-Z): so player de mesma cor abre consumindo chave colorida
  'V': 'porta_colorida',  // idx 0
  'W': 'porta_colorida',  // idx 1
  'X': 'porta_colorida',  // idx 2
  'Y': 'porta_colorida',  // idx 3
  'Z': 'porta_colorida',  // idx 4
  'C': 'coletavel',
  'E': 'saida',
};

/**
 * Para chars de gateway ('a'..'e'), retorna o indice de cor 0-4.
 * Retorna undefined pra outros chars.
 */
export function gatewayIdxFromChar(char: string): number | undefined {
  if (char >= 'a' && char <= 'e') return char.charCodeAt(0) - 'a'.charCodeAt(0);
  return undefined;
}

/**
 * Para chars de chave colorida ('F'..'J'), retorna o indice 0-4.
 * Mapeia 1-pra-1 com o indice do jogador autorizado a coletar.
 */
export function chaveColoridaIdxFromChar(char: string): number | undefined {
  if (char >= 'F' && char <= 'J') return char.charCodeAt(0) - 'F'.charCodeAt(0);
  return undefined;
}

/**
 * Para chars de porta colorida ('V'..'Z'), retorna o indice 0-4.
 */
export function portaColoridaIdxFromChar(char: string): number | undefined {
  if (char >= 'V' && char <= 'Z') return char.charCodeAt(0) - 'V'.charCodeAt(0);
  return undefined;
}

/**
 * Pra chars de jogador ('P', '1'..'5'), retorna o indice 0-4.
 * Retorna undefined pra outros chars.
 */
export function jogadorIdxFromChar(char: string): number | undefined {
  if (char === 'P') return 0;
  if (char >= '1' && char <= '5') return char.charCodeAt(0) - '1'.charCodeAt(0);
  return undefined;
}

/** Inverso: tipo → caractere (útil pra debug/serialização). */
export const TILE_TO_CHAR: Record<TipoTile, string> = {
  vazio: '.',
  parede: '#',
  jogador: 'P',
  bloco: 'B',
  tnt: 'T',
  pedra: 'S',
  picareta: 'M',
  chave: 'K',
  porta: 'D',
  porta_colorida: 'V', // depende de terrenoMeta pra cor real
  porta_unica: 'O',
  porta_unica_fechada: 'o', // runtime only
  gateway: 'a', // depende de terrenoMeta pra cor real
  chave_colorida: 'F', // depende de idx
  coletavel: 'C',
  saida: 'E',
};

/** Tipos que ocupam terreno (vão pra Celula.terreno). */
export const TIPOS_TERRENO: TipoTile[] = ['vazio', 'parede', 'porta', 'porta_colorida', 'porta_unica', 'porta_unica_fechada', 'gateway', 'saida'];

/** Tipos que são entidades dinâmicas (vão pra Celula.entidadeId). */
export const TIPOS_ENTIDADE: TipoTile[] = ['jogador', 'bloco', 'tnt', 'pedra', 'picareta', 'chave', 'chave_colorida', 'coletavel'];

/** Tipos empurráveis. */
export const TIPOS_EMPURRAVEIS: TipoTile[] = ['bloco', 'tnt'];

/** Tipos coletáveis. */
export const TIPOS_COLETAVEIS: TipoTile[] = ['chave', 'chave_colorida', 'picareta', 'coletavel'];
