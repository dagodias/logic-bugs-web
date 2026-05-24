/**
 * HistoryManager.ts — Pilha de snapshots pra "Desfazer".
 *
 * Antes de cada movimento válido, salva um snapshot do GameState.
 * `desfazer()` restaura o snapshot mais recente.
 *
 * Considerações:
 *   - Snapshot é DEEP COPY do estado — não pode compartilhar referência.
 *   - Limite de profundidade configurável (default 20, conforme IDEIA-DO-JOGO).
 *     Por design não é infinito: força o jogador a planejar, não fazer
 *     brute force.
 *   - Reiniciar fase limpa o histórico.
 */

import type { SnapshotEstado } from '../types';

const PROFUNDIDADE_MAXIMA_PADRAO = 20;

export class HistoryManager {
  private pilha: SnapshotEstado[] = [];
  readonly profundidadeMaxima: number;

  constructor(profundidadeMaxima: number = PROFUNDIDADE_MAXIMA_PADRAO) {
    this.profundidadeMaxima = profundidadeMaxima;
  }

  /** Empilha um novo snapshot. Trunca o mais antigo se exceder o limite. */
  empilhar(snapshot: SnapshotEstado): void {
    this.pilha.push(snapshot);
    if (this.pilha.length > this.profundidadeMaxima) {
      this.pilha.shift();
    }
  }

  /** Retorna e remove o snapshot mais recente. null se pilha vazia. */
  desempilhar(): SnapshotEstado | null {
    return this.pilha.pop() ?? null;
  }

  /** Limpa toda a pilha (chamar ao reiniciar/trocar fase). */
  limpar(): void {
    this.pilha = [];
  }

  /** Quantos passos é possível desfazer agora. */
  get tamanho(): number {
    return this.pilha.length;
  }

  get podeDesfazer(): boolean {
    return this.pilha.length > 0;
  }
}
