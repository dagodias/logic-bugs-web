/**
 * Renderer.ts — Renderiza o GameState como DOM (CSS Grid).
 *
 * Abordagem: cada célula vira um <div> filho de um container CSS Grid.
 * Vantagens vs. Canvas:
 *   - Inspecionável no DevTools
 *   - Suporta CSS animations triviais
 *   - Acessibilidade gratuita (focusable, aria-*)
 *   - Sem precisar de loop de render
 *
 * Trade-off: limite de ~3000 células antes de degradar (não é problema
 * pra puzzle 2D com grades <= 30×30).
 *
 * Quando precisar de efeitos especiais (partículas, glow), migrar pra
 * PixiJS. Mas pra protótipo, DOM basta e sobra.
 */

import type { GameState } from '../core/GameState';

/**
 * Limites de viewport em celulas. Em desktop mostramos a fase INTEIRA
 * (Berusky max 32x21); em mobile clipamos com camera follow pra caber.
 */
const VIEWPORT_DESKTOP_COLS = 32;
const VIEWPORT_DESKTOP_ROWS = 21;
const VIEWPORT_MOBILE_COLS = 10;
const VIEWPORT_MOBILE_ROWS = 8;
const MOBILE_BREAKPOINT_PX = 500;

export class Renderer {
  private containerJogo: HTMLElement;
  private elementoPalco: HTMLElement | null = null;
  private elementoViewport: HTMLElement | null = null;
  private elementoGrade: HTMLElement | null = null;
  private elementoTitulo: HTMLElement | null = null;
  private elementoHistoria: HTMLElement | null = null;
  private elementoHud: HTMLElement | null = null;
  /** Callback disparado ao clicar numa miniatura de jogador no HUD. */
  private aoClicarJogador: ((idx: number) => void) | null = null;
  /** Handler de resize pra recalcular viewport quando a tela muda. */
  private handlerResize: (() => void) | null = null;
  /** Estado mais recente — guardado pra recalcular camera em resize. */
  private ultimoEstado: GameState | null = null;
  /** Fase atualmente renderizada (id) — usado pra detectar troca e recriar grade. */
  private faseRenderizadaId: number | null = null;
  /** Cache: "x,y" -> string que descreve o conteudo renderizado da celula.
      Permite skip de re-renderizar celulas que nao mudaram. */
  private cacheCelulas: Map<string, string> = new Map();

  constructor(containerJogo: HTMLElement) {
    this.containerJogo = containerJogo;
  }

  /** Game registra aqui o handler de troca de jogador via UI. */
  setAoClicarJogador(cb: (idx: number) => void): void {
    this.aoClicarJogador = cb;
  }

  /** O elemento `.palco` (criado on-demand). UIManager usa pra anexar HUD-ações. */
  get palco(): HTMLElement | null {
    return this.elementoPalco;
  }

  /**
   * Renderiza o estado completo. Chamado uma vez por movimento (não em loop).
   * Por enquanto faz re-render completo; otimizar pra diff se necessário.
   */
  renderizar(estado: GameState): void {
    this.garantirEstrutura();
    this.ultimoEstado = estado;

    if (this.elementoTitulo && estado.fase) {
      this.elementoTitulo.textContent = estado.fase.nome || `Fase ${estado.fase.id}`;
    }
    if (this.elementoHistoria && estado.fase) {
      const pista = estado.fase.pista;
      this.elementoHistoria.innerHTML = pista
        ? `<p class="historia-fase-pista">${pista}</p>`
        : `<p class="historia-fase-vazia">Em breve: uma história envolvendo esta fase.</p>`;
    }

    this.atualizarHud(estado);

    const grade = this.elementoGrade!;
    grade.style.setProperty('--cols', `${estado.largura}`);
    grade.style.setProperty('--rows', `${estado.altura}`);

    // Render diferencial: se trocou de fase, recria tudo. Se nao, so
    // atualiza celulas que mudaram (evita disparar animacao 'entidade-pop'
    // em todo render e o efeito de pisca-pisca que isso causa).
    const idFaseAtual = estado.fase?.id ?? null;
    if (this.faseRenderizadaId !== idFaseAtual) {
      grade.replaceChildren();
      this.cacheCelulas.clear();
      this.faseRenderizadaId = idFaseAtual;
      for (let y = 0; y < estado.altura; y++) {
        for (let x = 0; x < estado.largura; x++) {
          grade.appendChild(this.criarCelula(estado, x, y));
          this.cacheCelulas.set(`${x},${y}`, this.descreverCelula(estado, x, y));
        }
      }
    } else {
      // Mesma fase: atualiza so o que mudou
      for (let y = 0; y < estado.altura; y++) {
        for (let x = 0; x < estado.largura; x++) {
          const key = `${x},${y}`;
          const novo = this.descreverCelula(estado, x, y);
          if (this.cacheCelulas.get(key) !== novo) {
            const idxFilho = y * estado.largura + x;
            const antiga = grade.children[idxFilho] as HTMLElement | undefined;
            const nova = this.criarCelula(estado, x, y);
            if (antiga) grade.replaceChild(nova, antiga);
            else grade.appendChild(nova);
            this.cacheCelulas.set(key, novo);
          }
        }
      }
    }

    this.atualizarViewport(estado);
  }

  /**
   * String compacta que captura tudo que afeta o visual de uma celula.
   * Se duas chamadas retornam a mesma string, a celula NAO precisa re-renderizar.
   */
  private descreverCelula(estado: GameState, x: number, y: number): string {
    const c = estado.grade[y][x];
    let s = c.terreno;
    if (c.terrenoMeta !== undefined) s += `:${c.terrenoMeta}`;
    if (c.entidadeId) {
      const ent = estado.entidades.get(c.entidadeId);
      if (ent) {
        s += `|${ent.tipo}`;
        if (ent.idx !== undefined) s += `:${ent.idx}`;
        if (ent.tipo === 'jogador' && ent.idx === estado.jogadorAtivoIdx) s += `*`;
      }
    }
    return s;
  }

  /**
   * Calcula tamanho de viewport (em celulas) e posicao de camera baseado
   * no tamanho da fase + dimensoes da tela + posicao do jogador ativo.
   * Berusky usa grade 32x21; sem clipping nao caberia em mobile.
   */
  private atualizarViewport(estado: GameState): void {
    const viewport = this.elementoViewport;
    const grade = this.elementoGrade;
    if (!viewport || !grade) return;

    const ehMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
    const viewCols = Math.min(estado.largura, ehMobile ? VIEWPORT_MOBILE_COLS : VIEWPORT_DESKTOP_COLS);
    const viewRows = Math.min(estado.altura, ehMobile ? VIEWPORT_MOBILE_ROWS : VIEWPORT_DESKTOP_ROWS);

    viewport.style.setProperty('--view-cols', String(viewCols));
    viewport.style.setProperty('--view-rows', String(viewRows));

    // Camera: centraliza no jogador ativo, clamped pra nao sair da grade
    const ativo = estado.obterJogadorAtivo();
    let camX = 0;
    let camY = 0;
    if (ativo && (estado.largura > viewCols || estado.altura > viewRows)) {
      camX = ativo.posicao.x - Math.floor(viewCols / 2);
      camY = ativo.posicao.y - Math.floor(viewRows / 2);
      camX = Math.max(0, Math.min(camX, estado.largura - viewCols));
      camY = Math.max(0, Math.min(camY, estado.altura - viewRows));
    }
    grade.style.setProperty('--cam-x', String(camX));
    grade.style.setProperty('--cam-y', String(camY));
  }

  /**
   * Dispara animação de shake no jogador (feedback de movimento inválido).
   * Reaplica a classe pra reiniciar a animação mesmo em pressões repetidas.
   */
  shakeJogador(): void {
    const el = this.elementoGrade?.querySelector<HTMLElement>('.entidade-jogador.jogador-ativo, .entidade-jogador');
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  /**
   * Cria flashes de explosao temporarios nas posicoes dadas.
   * Usado quando TNT detona — TNT e bloco ja foram removidos do estado,
   * mas o jogador precisa de feedback visual de "explodiu aqui".
   */
  flashExplosao(posicoes: Array<{ x: number; y: number }>): void {
    if (!this.elementoGrade) return;
    for (const pos of posicoes) {
      const celula = this.elementoGrade.querySelector<HTMLElement>(
        `[data-x="${pos.x}"][data-y="${pos.y}"]`,
      );
      if (!celula) continue;
      const flash = document.createElement('div');
      flash.className = 'blast';
      flash.textContent = '💥';
      celula.appendChild(flash);
      // Remove apos animacao (300ms + folga)
      setTimeout(() => flash.remove(), 360);
    }
  }

  /** Limpa o palco do DOM. Chamado ao trocar pra outra tela (menu, seleção). */
  destruir(): void {
    if (this.elementoPalco?.parentElement) {
      this.elementoPalco.parentElement.removeChild(this.elementoPalco);
    }
    this.elementoPalco = null;
    this.elementoViewport = null;
    this.elementoGrade = null;
    this.elementoTitulo = null;
    this.elementoHistoria = null;
    this.elementoHud = null;
    this.ultimoEstado = null;
    this.faseRenderizadaId = null;
    this.cacheCelulas.clear();
    if (this.handlerResize) {
      window.removeEventListener('resize', this.handlerResize);
      this.handlerResize = null;
    }
  }

  /** Monta a estrutura (título + HUD + grade) na primeira chamada. */
  private garantirEstrutura(): void {
    if (this.elementoGrade && this.elementoPalco?.isConnected) return;

    const palco = document.createElement('div');
    palco.className = 'palco';

    const cabecalho = document.createElement('div');
    cabecalho.className = 'cabecalho-fase';
    palco.appendChild(cabecalho);

    const titulo = document.createElement('h1');
    titulo.className = 'titulo-fase';
    cabecalho.appendChild(titulo);

    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    cabecalho.appendChild(hud);

    // Slot lateral (desktop) pra pista textual da fase atual.
    // Renderer.renderizar preenche com fase.pista, ou fallback se ausente.
    const historia = document.createElement('div');
    historia.className = 'historia-fase';
    palco.appendChild(historia);
    this.elementoHistoria = historia;

    const viewport = document.createElement('div');
    viewport.className = 'viewport';
    palco.appendChild(viewport);

    const grade = document.createElement('div');
    grade.className = 'grade';
    grade.setAttribute('role', 'grid');
    viewport.appendChild(grade);

    this.containerJogo.appendChild(palco);
    this.elementoPalco = palco;
    this.elementoTitulo = titulo;
    this.elementoHud = hud;
    this.elementoViewport = viewport;
    this.elementoGrade = grade;

    // Recalcula viewport ao redimensionar a janela (rotacao mobile, resize desktop)
    if (!this.handlerResize) {
      this.handlerResize = () => {
        if (this.ultimoEstado) this.atualizarViewport(this.ultimoEstado);
      };
      window.addEventListener('resize', this.handlerResize);
    }
  }

  /** Atualiza HUD com movimentos, chaves, coletáveis e mini-jogadores. */
  private atualizarHud(estado: GameState): void {
    const hud = this.elementoHud;
    if (!hud) return;

    hud.replaceChildren();

    hud.appendChild(this.criarHudItem('👣', String(estado.movimentos)));

    if (estado.totalChaves > 0) {
      hud.appendChild(this.criarHudItem('🔑', `${estado.chavesColetadas}/${estado.totalChaves}`));
    }
    if (estado.totalColetaveis > 0) {
      hud.appendChild(this.criarHudItem('💎', `${estado.coletaveisColetados}/${estado.totalColetaveis}`));
    }
    if (estado.picaretas > 0) {
      hud.appendChild(this.criarHudItem('⛏️', String(estado.picaretas)));
    }

    // Miniaturas dos jogadores (so renderiza se tiver mais de 1)
    const jogadores = estado.listarJogadores();
    if (jogadores.length > 1) {
      const wrap = document.createElement('span');
      wrap.className = 'hud-jogadores';
      for (const j of jogadores) {
        const idx = j.idx ?? 0;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `hud-jogador jogador-idx-${idx}` + (idx === estado.jogadorAtivoIdx ? ' jogador-ativo' : '');
        btn.dataset.idx = String(idx);
        btn.setAttribute('aria-label', `jogador ${idx + 1}`);
        btn.title = `Jogador ${idx + 1} (tecla ${idx + 1})`;
        btn.addEventListener('click', () => {
          if (this.aoClicarJogador) this.aoClicarJogador(idx);
        });
        wrap.appendChild(btn);
      }
      hud.appendChild(wrap);
    }
  }

  private criarHudItem(icone: string, valor: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'hud-item';
    const ic = document.createElement('span');
    ic.className = 'hud-icone';
    ic.textContent = icone;
    span.appendChild(ic);
    span.appendChild(document.createTextNode(valor));
    return span;
  }

  /** Cria o div de uma célula com terreno + entidade (se houver). */
  private criarCelula(estado: GameState, x: number, y: number): HTMLElement {
    const celula = estado.grade[y][x];
    const div = document.createElement('div');
    div.className = `celula terreno-${celula.terreno}`;
    div.dataset.x = `${x}`;
    div.dataset.y = `${y}`;
    if (celula.terrenoMeta !== undefined) {
      div.dataset.meta = String(celula.terrenoMeta);
    }
    div.setAttribute('role', 'gridcell');

    if (celula.entidadeId) {
      const ent = estado.entidades.get(celula.entidadeId);
      if (ent) {
        const divEnt = document.createElement('div');
        const classes = ['entidade', `entidade-${ent.tipo}`];
        if (ent.tipo === 'jogador' && ent.idx !== undefined) {
          classes.push(`jogador-idx-${ent.idx}`);
          if (ent.idx === estado.jogadorAtivoIdx) classes.push('jogador-ativo');
        }
        if (ent.tipo === 'chave_colorida' && ent.idx !== undefined) {
          classes.push(`cor-idx-${ent.idx}`);
        }
        divEnt.className = classes.join(' ');
        divEnt.setAttribute('aria-label', ent.tipo);
        div.appendChild(divEnt);
      }
    }

    return div;
  }
}
