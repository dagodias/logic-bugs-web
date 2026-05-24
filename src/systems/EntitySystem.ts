/**
 * EntitySystem.ts — Aplica mudanças no estado de entidades.
 *
 * Quem decide SE o movimento é válido = CollisionSystem.
 * Quem APLICA o movimento ao estado = EntitySystem.
 *
 * Essa separação evita acoplar regra (validação) com efeito (mutação).
 */

import type { CelulaCoord } from '../types';
import type { GameState } from '../core/GameState';
import type { ResultadoMovimento } from './CollisionSystem';

export class EntitySystem {
  /**
   * Aplica um ResultadoMovimento ao estado, mutando-o.
   * O Game salva snapshot ANTES de chamar isso (Fase 9 — undo).
   *
   * Casos tratados nesta fase:
   *   - 'permitido': move jogador
   *   - 'empurrar_bloco': move bloco, depois jogador
   *
   * Fases 6-8 vão tratar: 'coletar', 'abrir_porta', 'sair_fase'.
   * Casos 'bloqueado' não deveriam chegar aqui — o Game filtra antes.
   */
  aplicar(estado: GameState, resultado: ResultadoMovimento): void {
    const jogador = estado.obterJogadorAtivo();
    if (!jogador) return;

    const origem: CelulaCoord = { x: jogador.posicao.x, y: jogador.posicao.y };

    switch (resultado.tipo) {
      case 'permitido':
        this.moverEntidade(estado, jogador.id, resultado.destino);
        break;

      case 'empurrar_bloco':
        this.moverEntidade(estado, resultado.idBloco, resultado.destinoBloco);
        this.moverEntidade(estado, jogador.id, resultado.destinoJogador);
        break;

      case 'empurrar_tnt':
        this.moverEntidade(estado, resultado.idTnt, resultado.destinoTnt);
        this.moverEntidade(estado, jogador.id, resultado.destinoJogador);
        break;

      case 'explodir_tnt':
        this.removerEntidade(estado, resultado.idTnt);
        this.removerEntidade(estado, resultado.idBloco);
        this.moverEntidade(estado, jogador.id, resultado.destinoJogador);
        break;

      case 'quebrar_pedra':
        this.consumirPicareta(estado);
        this.removerEntidade(estado, resultado.idPedra);
        this.moverEntidade(estado, jogador.id, resultado.destino);
        break;

      case 'coletar':
        this.coletarItem(estado, resultado.idItem);
        this.moverEntidade(estado, jogador.id, resultado.destino);
        break;

      case 'abrir_porta':
        this.consumirChave(estado);
        this.abrirCelula(estado, resultado.destino);
        this.moverEntidade(estado, jogador.id, resultado.destino);
        break;

      case 'abrir_porta_colorida':
        this.consumirChaveColorida(estado, resultado.cor);
        this.abrirCelula(estado, resultado.destino);
        this.moverEntidade(estado, jogador.id, resultado.destino);
        break;

      case 'sair_fase':
        this.moverEntidade(estado, jogador.id, resultado.destino);
        estado.completou = true;
        break;

      case 'bloqueado':
        return;
    }

    // Berusky one-pass door: ao SAIR de uma celula porta_unica, ela fecha.
    // Verifica se a celula que o jogador acabou de deixar era porta_unica aberta.
    this.fecharPortaUnicaSeSaiu(estado, origem, jogador.posicao);
  }

  /**
   * Se a celula `origem` era 'porta_unica' aberta E o jogador nao esta mais la,
   * fecha a porta. Berusky game_logic.cpp:317-335 — fecha apos qualquer player atravessar.
   */
  private fecharPortaUnicaSeSaiu(estado: GameState, origem: CelulaCoord, atual: CelulaCoord): void {
    if (origem.x === atual.x && origem.y === atual.y) return;
    const celulaOrigem = estado.grade[origem.y]?.[origem.x];
    if (celulaOrigem?.terreno === 'porta_unica') {
      celulaOrigem.terreno = 'porta_unica_fechada';
    }
  }

  /**
   * Marca a primeira chave nao-usada como usada (Berusky: 1 chave → 1 porta).
   * Nao remove do inventario: assim 'chavesColetadas' (gate da saida) continua
   * contando ela, mas 'chavesDisponiveis' (gate de portas) nao.
   */
  private consumirChave(estado: GameState): void {
    const idx = estado.inventario.findIndex(
      (id) =>
        id.startsWith('chave_') &&
        !id.startsWith('chave_colorida_') &&
        !id.endsWith('_usada'),
    );
    if (idx >= 0) estado.inventario[idx] = estado.inventario[idx] + '_usada';
  }

  /** Remove a primeira picareta do inventário (1 picareta → 1 pedra). */
  private consumirPicareta(estado: GameState): void {
    const idx = estado.inventario.findIndex((id) => id.startsWith('picareta_'));
    if (idx >= 0) estado.inventario.splice(idx, 1);
  }

  /** Remove a primeira chave colorida da cor dada (1 chave → 1 porta). */
  private consumirChaveColorida(estado: GameState, cor: number): void {
    const prefixo = `chave_colorida_${cor}_`;
    const idx = estado.inventario.findIndex((id) => id.startsWith(prefixo));
    if (idx >= 0) estado.inventario.splice(idx, 1);
  }

  /** Converte terreno 'porta' em 'vazio' (porta aberta = passável e sem ícone). */
  private abrirCelula(estado: GameState, pos: CelulaCoord): void {
    const celula = estado.grade[pos.y]?.[pos.x];
    if (celula) celula.terreno = 'vazio';
  }

  /**
   * Remove uma entidade do mapa SEM adicionar ao inventário.
   * Usado pra destruir TNT/blocos via explosão.
   */
  private removerEntidade(estado: GameState, idEntidade: string): void {
    const ent = estado.entidades.get(idEntidade);
    if (!ent) return;
    const { x, y } = ent.posicao;
    if (estado.grade[y]?.[x]) {
      estado.grade[y][x].entidadeId = null;
    }
    estado.entidades.delete(idEntidade);
  }

  /** Remove entidade do mapa e adiciona ao inventário do estado. */
  private coletarItem(estado: GameState, idItem: string): void {
    const ent = estado.entidades.get(idItem);
    if (!ent) return;

    const { x, y } = ent.posicao;
    if (estado.grade[y]?.[x]) {
      estado.grade[y][x].entidadeId = null;
    }
    estado.entidades.delete(idItem);
    estado.inventario.push(idItem);
  }

  /**
   * Move uma entidade pra uma nova posição.
   * Atualiza a grade (limpa origem, marca destino).
   *
   * Não valida nada — caller é responsável por garantir que destino
   * está dentro da grade. Se já existe entidade no destino, ela é
   * sobrescrita (caller deve ter validado antes).
   */
  moverEntidade(estado: GameState, idEntidade: string, destino: CelulaCoord): void {
    const ent = estado.entidades.get(idEntidade);
    if (!ent) return;

    const origem = ent.posicao;

    if (estado.grade[origem.y]?.[origem.x]) {
      estado.grade[origem.y][origem.x].entidadeId = null;
    }

    ent.posicao = { x: destino.x, y: destino.y };

    if (estado.grade[destino.y]?.[destino.x]) {
      estado.grade[destino.y][destino.x].entidadeId = idEntidade;
    }
  }
}
