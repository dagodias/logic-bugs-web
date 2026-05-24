/**
 * GameState.ts — Estado mutável da partida em curso.
 *
 * É o "modelo" (no sentido MVC). Sistemas leem e modificam esse estado.
 * Renderer apenas LÊ esse estado pra produzir a tela.
 *
 * Toda mutação significativa do estado deve passar pelo HistoryManager
 * antes (snapshot) pra permitir undo.
 */

import type { Celula, Entidade, FaseDef, SnapshotEstado, TipoTile } from '../types';
import {
  CHAR_TO_TILE,
  TIPOS_ENTIDADE,
  TIPOS_TERRENO,
  TIPOS_EMPURRAVEIS,
  TIPOS_COLETAVEIS,
  jogadorIdxFromChar,
  gatewayIdxFromChar,
  chaveColoridaIdxFromChar,
  portaColoridaIdxFromChar,
} from '../data/tileTypes';

export class GameState {
  /** Definição da fase atual (imutável durante a partida). */
  fase!: FaseDef;
  /** Grade 2D atual (matriz de células). */
  grade!: Celula[][];
  /** Map de entidades por id pra acesso O(1). */
  entidades: Map<string, Entidade> = new Map();
  /** Contador de movimentos do jogador. */
  movimentos: number = 0;
  /**
   * Itens coletados na fase. Cada string é o id da entidade original
   * (ex: 'chave_5_3'). Permite distinguir chaves de coletáveis via
   * `id.startsWith('chave_')`.
   */
  inventario: string[] = [];
  /** Total de coletáveis (C) que existiam na fase original. */
  totalColetaveis: number = 0;
  /** Total de chaves (K) que existiam na fase original. */
  totalChaves: number = 0;
  /** Se a fase já foi completada. */
  completou: boolean = false;
  /**
   * Indice (0-4) do jogador atualmente sob controle do input.
   * Berusky permite ate 5 personagens, controlados um por vez via Tab/1-5.
   * Sempre aponta pra um jogador valido (clamp no carregarFase / trocarJogador).
   */
  jogadorAtivoIdx: number = 0;

  /**
   * Chaves globais ja coletadas (inclui as ja usadas em portas).
   * Saida abre quando todas as chaves do mapa foram coletadas — uma vez
   * coletada, uma chave continua contando aqui mesmo que tenha sido
   * consumida em uma porta (vira 'chave_X_usada' no inventario).
   */
  get chavesColetadas(): number {
    return this.inventario.filter(
      (id) => id.startsWith('chave_') && !id.startsWith('chave_colorida_'),
    ).length;
  }

  /**
   * Chaves globais ainda disponiveis pra abrir portas (nao usadas).
   * Diferente de chavesColetadas: nao conta as ja gastas em portas.
   */
  get chavesDisponiveis(): number {
    return this.inventario.filter(
      (id) =>
        id.startsWith('chave_') &&
        !id.startsWith('chave_colorida_') &&
        !id.endsWith('_usada'),
    ).length;
  }

  /** Coletáveis (gemas/itens) pegos até agora. */
  get coletaveisColetados(): number {
    return this.inventario.filter((id) => id.startsWith('coletavel_')).length;
  }

  /** Picaretas disponiveis no inventario (cada uma quebra 1 pedra). */
  get picaretas(): number {
    return this.inventario.filter((id) => id.startsWith('picareta_')).length;
  }

  /** Conta chaves coloridas de uma cor especifica no inventario. */
  contarChavesColoridas(idx: number): number {
    const prefixo = `chave_colorida_${idx}_`;
    return this.inventario.filter((id) => id.startsWith(prefixo)).length;
  }

  /** Largura da grade em células. */
  get largura(): number {
    return this.grade[0]?.length ?? 0;
  }

  /** Altura da grade em células. */
  get altura(): number {
    return this.grade.length;
  }

  /**
   * Carrega uma definição de fase, montando grade e entidades.
   * Chamado pelo LevelManager ao iniciar/reiniciar uma fase.
   */
  carregarFase(fase: FaseDef): void {
    this.fase = fase;
    this.grade = [];
    this.entidades.clear();
    this.movimentos = 0;
    this.inventario = [];
    this.totalColetaveis = 0;
    this.totalChaves = 0;
    this.completou = false;

    const largura = fase.mapa[0]?.length ?? 0;
    const idxsJogadores: number[] = [];

    for (let y = 0; y < fase.mapa.length; y++) {
      const linha = fase.mapa[y];
      const linhaGrade: Celula[] = [];

      for (let x = 0; x < largura; x++) {
        const char = linha[x] ?? '.';
        const tipo: TipoTile = CHAR_TO_TILE[char] ?? 'vazio';

        let terreno: TipoTile = 'vazio';
        let entidadeId: string | null = null;
        let terrenoMeta: number | undefined;

        if (TIPOS_TERRENO.includes(tipo)) {
          terreno = tipo;
          if (tipo === 'gateway') terrenoMeta = gatewayIdxFromChar(char);
          if (tipo === 'porta_colorida') terrenoMeta = portaColoridaIdxFromChar(char);
        } else if (TIPOS_ENTIDADE.includes(tipo)) {
          let idx: number | undefined;
          if (tipo === 'jogador') idx = jogadorIdxFromChar(char) ?? 0;
          else if (tipo === 'chave_colorida') idx = chaveColoridaIdxFromChar(char);
          const sufixo = idx !== undefined ? `${idx}_${x}_${y}` : `${x}_${y}`;
          const id = `${tipo}_${sufixo}`;
          this.entidades.set(id, {
            id,
            tipo,
            posicao: { x, y },
            empurravel: TIPOS_EMPURRAVEIS.includes(tipo),
            coletavel: TIPOS_COLETAVEIS.includes(tipo),
            idx,
          });
          entidadeId = id;

          if (tipo === 'coletavel') this.totalColetaveis++;
          if (tipo === 'chave') this.totalChaves++;
          if (tipo === 'jogador' && idx !== undefined) idxsJogadores.push(idx);
        }

        linhaGrade.push({ terreno, entidadeId, terrenoMeta });
      }

      this.grade.push(linhaGrade);
    }

    // Comeca controlando o jogador de menor indice presente na fase
    this.jogadorAtivoIdx = idxsJogadores.length ? Math.min(...idxsJogadores) : 0;
  }

  /**
   * Serializa o estado atual pra um snapshot (cópia profunda).
   * Usado pelo HistoryManager pra undo.
   */
  serializar(): SnapshotEstado {
    return {
      faseId: this.fase?.id ?? 0,
      grade: this.grade.map((linha) => linha.map((c) => ({ ...c }))),
      entidades: Array.from(this.entidades.values()).map((e) => ({
        ...e,
        posicao: { ...e.posicao },
        meta: e.meta ? { ...e.meta } : undefined,
      })),
      movimentos: this.movimentos,
      inventario: [...this.inventario],
      jogadorAtivoIdx: this.jogadorAtivoIdx,
    };
  }

  /**
   * Restaura estado a partir de um snapshot.
   * Usado pelo HistoryManager ao desfazer.
   */
  restaurar(snapshot: SnapshotEstado): void {
    this.grade = snapshot.grade.map((linha) => linha.map((c) => ({ ...c })));
    this.entidades.clear();
    for (const ent of snapshot.entidades) {
      this.entidades.set(ent.id, {
        ...ent,
        posicao: { ...ent.posicao },
        meta: ent.meta ? { ...ent.meta } : undefined,
      });
    }
    this.movimentos = snapshot.movimentos;
    this.inventario = [...snapshot.inventario];
    this.jogadorAtivoIdx = snapshot.jogadorAtivoIdx ?? 0;
  }

  /** Procura uma entidade do tipo dado (pra achar o jogador, por exemplo). */
  buscarEntidadePorTipo(tipo: TipoTile): Entidade | undefined {
    for (const ent of this.entidades.values()) {
      if (ent.tipo === tipo) return ent;
    }
    return undefined;
  }

  /**
   * Retorna o jogador atualmente ativo (controlado pelo input).
   * Se o ativo nao existe mais (foi removido?), faz fallback pro primeiro jogador.
   */
  obterJogadorAtivo(): Entidade | undefined {
    for (const ent of this.entidades.values()) {
      if (ent.tipo === 'jogador' && ent.idx === this.jogadorAtivoIdx) return ent;
    }
    return this.listarJogadores()[0];
  }

  /** Retorna todos os jogadores presentes na fase, ordenados por idx. */
  listarJogadores(): Entidade[] {
    const list: Entidade[] = [];
    for (const ent of this.entidades.values()) {
      if (ent.tipo === 'jogador') list.push(ent);
    }
    return list.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));
  }

  /**
   * Troca pro proximo jogador (ordenado por idx, circular).
   * No-op se so tem 1 jogador.
   */
  proximoJogador(): void {
    const jogadores = this.listarJogadores();
    if (jogadores.length <= 1) return;
    const atualPos = jogadores.findIndex((j) => j.idx === this.jogadorAtivoIdx);
    const proxPos = (atualPos + 1) % jogadores.length;
    this.jogadorAtivoIdx = jogadores[proxPos].idx ?? 0;
  }

  /**
   * Tenta ativar o jogador de indice dado. No-op se nao existir.
   */
  trocarJogador(idx: number): void {
    const alvo = this.listarJogadores().find((j) => j.idx === idx);
    if (alvo) this.jogadorAtivoIdx = idx;
  }
}
