/**
 * CollisionSystem.ts — Determina se um movimento é válido.
 *
 * Princípio: PURO (sem efeitos colaterais). Recebe estado + movimento
 * proposto, retorna um veredito ("válido", "bloqueado por parede",
 * "empurrar bloco", "porta fechada", etc.). Quem aplica o resultado é
 * o EntitySystem.
 *
 * Separar colisão de aplicação facilita teste unitário (puro = fácil de
 * testar).
 */

import type { CelulaCoord, Direcao } from '../types';
import { DELTA_POR_DIRECAO } from '../types';
import type { GameState } from '../core/GameState';

/**
 * Resultado de uma tentativa de movimento.
 * Cada caso representa uma regra de gameplay diferente.
 */
export type ResultadoMovimento =
  | { tipo: 'permitido'; destino: CelulaCoord }
  | { tipo: 'empurrar_bloco'; destinoJogador: CelulaCoord; destinoBloco: CelulaCoord; idBloco: string }
  | { tipo: 'empurrar_tnt'; destinoJogador: CelulaCoord; destinoTnt: CelulaCoord; idTnt: string }
  | { tipo: 'explodir_tnt'; destinoJogador: CelulaCoord; posTnt: CelulaCoord; posBloco: CelulaCoord; idTnt: string; idBloco: string }
  | { tipo: 'quebrar_pedra'; destino: CelulaCoord; idPedra: string }
  | { tipo: 'coletar'; destino: CelulaCoord; idItem: string }
  | { tipo: 'abrir_porta'; destino: CelulaCoord; idPorta: string }
  | { tipo: 'abrir_porta_colorida'; destino: CelulaCoord; cor: number }
  | { tipo: 'sair_fase'; destino: CelulaCoord }
  | { tipo: 'bloqueado'; motivo: 'parede' | 'fora_grade' | 'bloco_sem_espaco' | 'porta_trancada' | 'sem_picareta' | 'entidade' };

export class CollisionSystem {
  /**
   * Avalia o que aconteceria se o jogador tentasse se mover na direção dada.
   * Não muda o estado — só analisa.
   *
   * Fases 4-5: trata 'permitido', 'empurrar_bloco' e 'bloqueado'
   * (parede, fora_grade, bloco_sem_espaco, entidade).
   * Fases 6-8 adicionam: coletar, abrir_porta, sair_fase.
   */
  avaliarMovimento(estado: GameState, direcao: Direcao): ResultadoMovimento {
    const jogador = estado.obterJogadorAtivo();
    if (!jogador) return { tipo: 'bloqueado', motivo: 'fora_grade' };

    const delta = DELTA_POR_DIRECAO[direcao];
    const destino: CelulaCoord = {
      x: jogador.posicao.x + delta.x,
      y: jogador.posicao.y + delta.y,
    };

    if (!this.dentroGrade(estado, destino)) {
      return { tipo: 'bloqueado', motivo: 'fora_grade' };
    }

    const celula = estado.grade[destino.y][destino.x];

    if (celula.terreno === 'parede' || celula.terreno === 'porta_unica_fechada') {
      // Berusky one-pass door no estado _Z bloqueia tudo (game_logic.cpp:606-609)
      return { tipo: 'bloqueado', motivo: 'parede' };
    }

    if (celula.terreno === 'porta') {
      if (estado.chavesDisponiveis <= 0) {
        return { tipo: 'bloqueado', motivo: 'porta_trancada' };
      }
      return { tipo: 'abrir_porta', destino, idPorta: this.idPorta(destino) };
    }

    if (celula.terreno === 'porta_colorida') {
      // Berusky: porta colorida N abre SO pelo jogador idx N com chave colorida N.
      const cor = celula.terrenoMeta;
      if (cor === undefined || jogador.idx !== cor) {
        return { tipo: 'bloqueado', motivo: 'parede' };
      }
      if (estado.contarChavesColoridas(cor) <= 0) {
        return { tipo: 'bloqueado', motivo: 'porta_trancada' };
      }
      return { tipo: 'abrir_porta_colorida', destino, cor };
    }

    if (celula.terreno === 'gateway') {
      // Berusky color gateway: so jogador de cor igual passa, sem precisar chave.
      // Boxes ficam no default break (nao passam) — ja garantido pela checagem
      // de empurrar_bloco que exige terreno 'vazio' atras.
      if (celula.terrenoMeta === jogador.idx) {
        return { tipo: 'permitido', destino };
      }
      return { tipo: 'bloqueado', motivo: 'parede' };
    }

    if (celula.terreno === 'saida') {
      // Berusky state_keys_enough(): saida abre quando TODAS as chaves K foram
      // coletadas. Mantemos coletaveis (C) como gate extra pras fases tutorial.
      const todasChaves = estado.chavesColetadas >= estado.totalChaves;
      const todosColetaveis = estado.coletaveisColetados >= estado.totalColetaveis;
      if (todasChaves && todosColetaveis) {
        return { tipo: 'sair_fase', destino };
      }
    }

    if (celula.entidadeId) {
      const ent = estado.entidades.get(celula.entidadeId);

      if (ent?.tipo === 'pedra') {
        // Berusky: pedra so e atravessada com picareta (consome 1 do inventario)
        if (estado.picaretas > 0) {
          return { tipo: 'quebrar_pedra', destino, idPedra: ent.id };
        }
        return { tipo: 'bloqueado', motivo: 'sem_picareta' };
      }

      if (ent?.tipo === 'tnt') {
        // TNT empurra como bloco se atras esta vazio; se atras tem bloco, DETONA.
        // Berusky game_logic.cpp:382-398 — qualquer outra coisa atras = bloqueio.
        const atrasTnt: CelulaCoord = {
          x: destino.x + delta.x,
          y: destino.y + delta.y,
        };

        if (!this.dentroGrade(estado, atrasTnt)) {
          return { tipo: 'bloqueado', motivo: 'bloco_sem_espaco' };
        }

        const celulaAtras = estado.grade[atrasTnt.y][atrasTnt.x];
        const entAtras = celulaAtras.entidadeId
          ? estado.entidades.get(celulaAtras.entidadeId)
          : undefined;

        if (celulaAtras.terreno === 'vazio' && !celulaAtras.entidadeId) {
          return {
            tipo: 'empurrar_tnt',
            destinoJogador: destino,
            destinoTnt: atrasTnt,
            idTnt: ent.id,
          };
        }

        if (entAtras?.tipo === 'bloco' && celulaAtras.terreno === 'vazio') {
          return {
            tipo: 'explodir_tnt',
            destinoJogador: destino,
            posTnt: destino,
            posBloco: atrasTnt,
            idTnt: ent.id,
            idBloco: entAtras.id,
          };
        }

        return { tipo: 'bloqueado', motivo: 'bloco_sem_espaco' };
      }

      if (ent?.empurravel) {
        const destinoBloco: CelulaCoord = {
          x: destino.x + delta.x,
          y: destino.y + delta.y,
        };

        if (!this.podeReceberBloco(estado, destinoBloco)) {
          return { tipo: 'bloqueado', motivo: 'bloco_sem_espaco' };
        }

        return {
          tipo: 'empurrar_bloco',
          destinoJogador: destino,
          destinoBloco,
          idBloco: ent.id,
        };
      }

      if (ent?.tipo === 'chave_colorida') {
        // Berusky: jogador idx N so pega chave colorida N. Outros nao atravessam.
        if (ent.idx === jogador.idx) {
          return { tipo: 'coletar', destino, idItem: ent.id };
        }
        return { tipo: 'bloqueado', motivo: 'entidade' };
      }

      if (ent?.coletavel) {
        return { tipo: 'coletar', destino, idItem: ent.id };
      }

      return { tipo: 'bloqueado', motivo: 'entidade' };
    }

    return { tipo: 'permitido', destino };
  }

  private dentroGrade(estado: GameState, pos: CelulaCoord): boolean {
    return pos.x >= 0 && pos.x < estado.largura && pos.y >= 0 && pos.y < estado.altura;
  }

  /** Portas são terreno (sem entidade), então o id é sintético da coordenada. */
  private idPorta(pos: CelulaCoord): string {
    return `porta_${pos.x}_${pos.y}`;
  }

  /** Bloco pode parar APENAS em terreno vazio (sem porta/saída/parede, sem entidade). */
  private podeReceberBloco(estado: GameState, pos: CelulaCoord): boolean {
    if (!this.dentroGrade(estado, pos)) return false;
    const c = estado.grade[pos.y][pos.x];
    if (c.terreno !== 'vazio') return false;
    if (c.entidadeId) return false;
    return true;
  }
}
