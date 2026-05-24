/**
 * InputManager.ts — Captura entrada do usuário e despacha pro Game.
 *
 * Origens de input suportadas:
 *   - Teclado (setas + WASD + R/Z pra reiniciar/desfazer)
 *   - Touch (swipe em mobile — Fase 12)
 *   - Botões da UI (clicar em "desfazer", "reiniciar", etc.)
 *
 * NÃO toma decisão de jogo — só TRADUZ input em comando e delega ao Game.
 */

import type { Direcao } from '../types';
import type { Game } from '../core/Game';

const TECLA_PARA_DIRECAO: Record<string, Direcao> = {
  ArrowUp: 'cima',
  ArrowDown: 'baixo',
  ArrowLeft: 'esquerda',
  ArrowRight: 'direita',
  w: 'cima',
  s: 'baixo',
  a: 'esquerda',
  d: 'direita',
  W: 'cima',
  S: 'baixo',
  A: 'esquerda',
  D: 'direita',
};

const TECLAS_PREVENIR_DEFAULT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  ' ',
  'Tab',
]);

/** Pixels mínimos pra um swipe ser considerado um movimento. */
const SWIPE_MIN_PX = 24;

export class InputManager {
  protected jogo: Game;
  private listenersAtivos: boolean = false;
  private handlerKeydown: ((e: KeyboardEvent) => void) | null = null;
  private handlerTouchStart: ((e: TouchEvent) => void) | null = null;
  private handlerTouchEnd: ((e: TouchEvent) => void) | null = null;
  private touchOrigem: { x: number; y: number } | null = null;

  constructor(jogo: Game) {
    this.jogo = jogo;
  }

  /** Inicia a escuta de eventos do teclado/touch. */
  iniciar(): void {
    if (this.listenersAtivos) return;

    this.handlerKeydown = (e) => this.aoTeclar(e);
    window.addEventListener('keydown', this.handlerKeydown);

    this.handlerTouchStart = (e) => this.aoTouchStart(e);
    this.handlerTouchEnd = (e) => this.aoTouchEnd(e);
    window.addEventListener('touchstart', this.handlerTouchStart, { passive: true });
    window.addEventListener('touchend', this.handlerTouchEnd, { passive: true });

    this.listenersAtivos = true;
  }

  /** Para de escutar — usado ao destruir/desmontar o jogo. */
  parar(): void {
    if (!this.listenersAtivos) return;
    if (this.handlerKeydown) {
      window.removeEventListener('keydown', this.handlerKeydown);
      this.handlerKeydown = null;
    }
    if (this.handlerTouchStart) {
      window.removeEventListener('touchstart', this.handlerTouchStart);
      this.handlerTouchStart = null;
    }
    if (this.handlerTouchEnd) {
      window.removeEventListener('touchend', this.handlerTouchEnd);
      this.handlerTouchEnd = null;
    }
    this.listenersAtivos = false;
  }

  // ==========================================================================
  // Handlers privados
  // ==========================================================================

  protected aoTeclar(evento: KeyboardEvent): void {
    if (evento.repeat) return;

    if (TECLAS_PREVENIR_DEFAULT.has(evento.key)) {
      evento.preventDefault();
    }

    if (evento.key === 'z' || evento.key === 'Z') {
      evento.preventDefault();
      this.jogo.desfazer();
      return;
    }

    if (evento.key === 'Tab') {
      evento.preventDefault();
      this.jogo.proximoJogador();
      return;
    }

    // Teclas '1'..'5' trocam direto pro jogador de indice 0..4
    if (evento.key >= '1' && evento.key <= '5') {
      const idx = evento.key.charCodeAt(0) - '1'.charCodeAt(0);
      this.jogo.trocarJogador(idx);
      return;
    }

    const direcao = this.mapearTeclaParaDirecao(evento.key);
    if (direcao) {
      this.jogo.moverJogador(direcao);
      return;
    }

    if (evento.key === 'r' || evento.key === 'R') {
      this.jogo.reiniciarFase();
    }
  }

  protected mapearTeclaParaDirecao(tecla: string): Direcao | null {
    return TECLA_PARA_DIRECAO[tecla] ?? null;
  }

  // ==========================================================================
  // Touch (swipe)
  // ==========================================================================

  private aoTouchStart(evento: TouchEvent): void {
    if (evento.touches.length !== 1) {
      this.touchOrigem = null;
      return;
    }
    const t = evento.touches[0];
    this.touchOrigem = { x: t.clientX, y: t.clientY };
  }

  private aoTouchEnd(evento: TouchEvent): void {
    const origem = this.touchOrigem;
    this.touchOrigem = null;
    if (!origem) return;
    const t = evento.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - origem.x;
    const dy = t.clientY - origem.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Tap (sem distância suficiente) — ignora, deixa cliques em botões funcionarem
    if (Math.max(absDx, absDy) < SWIPE_MIN_PX) return;

    const direcao: Direcao =
      absDx > absDy ? (dx > 0 ? 'direita' : 'esquerda') : dy > 0 ? 'baixo' : 'cima';

    this.jogo.moverJogador(direcao);
  }
}
