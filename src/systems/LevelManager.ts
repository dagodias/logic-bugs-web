/**
 * LevelManager.ts — Gerencia o catálogo de fases.
 *
 * Carrega definições de `data/levels.ts`, fornece fase por id,
 * controla progressão (qual fase é a próxima), persiste em localStorage
 * a fase atingida e os melhores movimentos por fase.
 *
 * Formato salvo:
 *   { fasesCompletas: number[], melhoresMovs: Record<number, number> }
 *
 * "Completas" = fases zeradas com sucesso. A fase 1 sempre é jogável
 * (não precisa estar em "completas"). Fase N só desbloqueia se N-1
 * está em "completas".
 */

import type { FaseDef } from '../types';
import { LEVELS } from '../data/levels';

const CHAVE_LOCALSTORAGE = 'logicbugs:progresso';

interface Progresso {
  fasesCompletas: number[];
  melhoresMovs: Record<number, number>;
}

export class LevelManager {
  private fases: FaseDef[];
  private progresso: Progresso;
  private liberarTudo = false;

  constructor() {
    this.fases = LEVELS;
    this.progresso = this.lerProgresso();
    this.limparRecordesInvalidos();
  }

  /** Modo destravado (admin) — todas as fases ficam jogaveis. */
  setLiberarTudo(v: boolean): void {
    this.liberarTudo = v;
  }

  /**
   * Remove recordes em localStorage que sejam menores que o `movimentosOtimos`
   * da fase — sao impossiveis humanamente (residuo de versoes antigas buggy
   * ou cheat via DevTools).
   */
  private limparRecordesInvalidos(): void {
    let mudou = false;
    for (const fase of this.fases) {
      if (fase.movimentosOtimos === undefined) continue;
      const rec = this.progresso.melhoresMovs[fase.id];
      if (rec !== undefined && rec < fase.movimentosOtimos) {
        delete this.progresso.melhoresMovs[fase.id];
        mudou = true;
        console.warn(
          `[LevelManager] Recorde invalido removido da fase ${fase.id} ` +
            `(${rec} < otimo ${fase.movimentosOtimos})`,
        );
      }
    }
    if (mudou) this.salvar();
  }

  /** Quantas fases existem no total. */
  get total(): number {
    return this.fases.length;
  }

  /** Todas as fases (referência ao catálogo). */
  get todas(): readonly FaseDef[] {
    return this.fases;
  }

  /** Retorna definição da fase pelo id (1-indexed). */
  obter(id: number): FaseDef | undefined {
    return this.fases.find((f) => f.id === id);
  }

  /**
   * Retorna proxima fase apos a atual, ou undefined se for a ultima.
   * Usa indice no array pra suportar ids nao-sequenciais (locais 1-33 +
   * Berusky 100-219, por exemplo). Pula fases ocultas (grupo Bonus) pra
   * a progressao seguir a ordem visivel ao jogador (Aprendizado -> Simples
   * -> Medio -> Dificil), sem cair no Bonus 01 quando termina Aprendizado.
   */
  obterProxima(idAtual: number): FaseDef | undefined {
    const i = this.fases.findIndex((f) => f.id === idAtual);
    if (i < 0) return undefined;
    for (let j = i + 1; j < this.fases.length; j++) {
      if (!this.eOculta(this.fases[j].id)) return this.fases[j];
    }
    return undefined;
  }

  // ==========================================================================
  // Progresso persistido (localStorage)
  // ==========================================================================

  /**
   * Fase pode ser jogada? Exige a anterior *visivel* completa. Fases
   * ocultas (Bonus: ids 3-12 e >=118) sao puladas pra nao travar a
   * progressao quando o grupo esta escondido da UI.
   */
  estaDesbloqueada(id: number): boolean {
    const i = this.fases.findIndex((f) => f.id === id);
    if (i < 0) return false;
    if (this.liberarTudo) return true;
    for (let j = i - 1; j >= 0; j--) {
      const ant = this.fases[j];
      if (this.eOculta(ant.id)) continue;
      return this.progresso.fasesCompletas.includes(ant.id);
    }
    return true;
  }

  private eOculta(id: number): boolean {
    return id < 13 || id >= 118;
  }

  /** Fase já foi zerada alguma vez. */
  estaCompleta(id: number): boolean {
    return this.progresso.fasesCompletas.includes(id);
  }

  /** Melhor número de movimentos pra fase (undefined se nunca zerou). */
  melhorMovs(id: number): number | undefined {
    return this.progresso.melhoresMovs[id];
  }

  /**
   * Registra fase como completa e o número de movimentos.
   * Atualiza o melhor se for menor que o anterior.
   * Persiste em localStorage.
   */
  registrarConclusao(id: number, movimentos: number): void {
    if (!this.progresso.fasesCompletas.includes(id)) {
      this.progresso.fasesCompletas.push(id);
    }

    // Validacao anti-cheat: nunca aceita valor abaixo do otimo conhecido.
    const fase = this.obter(id);
    if (
      fase?.movimentosOtimos !== undefined &&
      movimentos < fase.movimentosOtimos
    ) {
      console.warn(
        `[LevelManager] Conclusao com ${movimentos} movs descartada ` +
          `(otimo da fase ${id} = ${fase.movimentosOtimos}).`,
      );
      this.salvar();
      return;
    }

    const atual = this.progresso.melhoresMovs[id];
    if (atual === undefined || movimentos < atual) {
      this.progresso.melhoresMovs[id] = movimentos;
    }
    this.salvar();
  }

  /**
   * Retorna `true` se o numero de movimentos esta dentro do humanamente
   * possivel pra fase (>= ótimo). Usado pelo Game pra decidir se envia
   * a tentativa pro servidor.
   */
  conclusaoValida(id: number, movimentos: number): boolean {
    const fase = this.obter(id);
    if (movimentos <= 0) return false;
    if (fase?.movimentosOtimos !== undefined && movimentos < fase.movimentosOtimos) {
      return false;
    }
    return true;
  }

  /** Reseta progresso (debug/dev). */
  resetarProgresso(): void {
    this.progresso = { fasesCompletas: [], melhoresMovs: {} };
    localStorage.removeItem(CHAVE_LOCALSTORAGE);
  }

  // ==========================================================================
  // Internos
  // ==========================================================================

  private lerProgresso(): Progresso {
    try {
      const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
      if (!bruto) return { fasesCompletas: [], melhoresMovs: {} };
      const parsed = JSON.parse(bruto);
      return {
        fasesCompletas: Array.isArray(parsed?.fasesCompletas) ? parsed.fasesCompletas : [],
        melhoresMovs:
          parsed?.melhoresMovs && typeof parsed.melhoresMovs === 'object'
            ? parsed.melhoresMovs
            : {},
      };
    } catch {
      return { fasesCompletas: [], melhoresMovs: {} };
    }
  }

  private salvar(): void {
    try {
      localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(this.progresso));
    } catch {
      /* localStorage indisponível — segue sem persistir */
    }
  }
}
