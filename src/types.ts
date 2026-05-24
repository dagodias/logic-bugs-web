/**
 * types.ts — Tipos compartilhados entre todos os módulos do jogo.
 *
 * Mantenha aqui APENAS tipos que cruzam fronteiras de módulos.
 * Tipos internos de cada módulo ficam no próprio arquivo.
 */

// ============================================================================
// Coordenadas e direções
// ============================================================================

/** Coordenada na grade (em células, não pixels). Origem (0,0) é topo-esquerdo. */
export interface CelulaCoord {
  x: number;
  y: number;
}

/** Direção cardinal de movimento. */
export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita';

/** Vetor de deslocamento por direção (dx, dy). */
export const DELTA_POR_DIRECAO: Record<Direcao, CelulaCoord> = {
  cima:     { x:  0, y: -1 },
  baixo:    { x:  0, y:  1 },
  esquerda: { x: -1, y:  0 },
  direita:  { x:  1, y:  0 },
};

// ============================================================================
// Tipos de tile (células do mapa)
// ============================================================================

/**
 * Tipos de tile que podem existir numa célula.
 * Caractere correspondente está em `data/tileTypes.ts`.
 */
export type TipoTile =
  | 'vazio'           // .
  | 'parede'          // #
  | 'jogador'         // P, 1-5
  | 'bloco'           // B (empurrável)
  | 'tnt'             // T (empurrável; explode bloco adjacente)
  | 'pedra'           // S (bloqueia até ser quebrada com picareta)
  | 'picareta'        // M (coletável; quebra uma pedra)
  | 'chave'           // K
  | 'chave_colorida'  // F-J (só player de mesma cor coleta; abre porta colorida)
  | 'porta'           // D
  | 'porta_colorida'  // V-Z (só player de mesma cor abre, consumindo chave colorida)
  | 'porta_unica'     // O (passagem livre; fecha após qualquer jogador atravessar)
  | 'porta_unica_fechada' // estado interno após uso — nao aparece em mapa
  | 'gateway'         // a-e (color gateway; só jogador da cor correspondente passa)
  | 'coletavel'       // C
  | 'saida';          // E

/** Uma célula da grade. Cada célula pode ter terreno + entidade em cima. */
export interface Celula {
  /** Tipo do terreno (vazio, parede, saída, porta). */
  terreno: TipoTile;
  /** Entidade que está em cima (jogador, bloco, chave, coletável). null se vazia. */
  entidadeId: string | null;
  /**
   * Metadado associado ao terreno (so usado por terrenos parametrizados).
   * Exemplos: 'gateway' → indice 0-4 do jogador autorizado a passar.
   */
  terrenoMeta?: number;
}

// ============================================================================
// Entidades dinâmicas (jogador, blocos, coletáveis)
// ============================================================================

/** Entidade dinâmica — algo que pode mover ou ser interagido. */
export interface Entidade {
  id: string;
  tipo: TipoTile;
  posicao: CelulaCoord;
  empurravel: boolean;
  coletavel: boolean;
  /**
   * Indice 0-4 quando entidade e jogador (Berusky: ate 5 personagens por fase).
   * undefined pra outros tipos.
   */
  idx?: number;
  /** Dados extras específicos do tipo (ex: cor da chave/porta). */
  meta?: Record<string, unknown>;
}

// ============================================================================
// Fase (level)
// ============================================================================

/**
 * Definição de uma fase em formato JSON-friendly.
 * `mapa` é array de strings, cada string uma linha, cada caractere uma célula.
 */
export interface FaseDef {
  id: number;
  nome: string;
  dificuldade: 'tutorial' | 'facil' | 'medio' | 'dificil' | 'expert';
  mapa: string[];
  /** Movimentos mínimos pra resolver (referência pra rankings). */
  movimentosOtimos?: number;
  /** Pista textual opcional pra mostrar antes da fase começar. */
  pista?: string;
}

// ============================================================================
// Estado do jogo (snapshot que o HistoryManager copia pra undo)
// ============================================================================

/** Snapshot serializável do estado da fase em um instante. */
export interface SnapshotEstado {
  faseId: number;
  grade: Celula[][];
  entidades: Entidade[];
  movimentos: number;
  inventario: string[];  // ids de itens coletados (ex: chaves)
  jogadorAtivoIdx: number;
}

// ============================================================================
// Eventos do jogo (pra desacoplar sistemas)
// ============================================================================

/** Tipos de evento que o jogo emite. UIManager / Renderer escutam. */
export type TipoEvento =
  | 'jogador_moveu'
  | 'bloco_empurrado'
  | 'tnt_empurrada'
  | 'tnt_explodiu'
  | 'item_coletado'
  | 'porta_aberta'
  | 'fase_completa'
  | 'fase_reiniciada'
  | 'movimento_desfeito'
  | 'movimento_invalido';

export interface Evento {
  tipo: TipoEvento;
  payload?: Record<string, unknown>;
}
