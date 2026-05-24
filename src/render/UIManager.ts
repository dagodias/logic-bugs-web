/**
 * UIManager.ts — Renderiza UI fora da grade (telas, HUD com botões, modais).
 *
 * Telas:
 *   - inicial — boas-vindas + começar/selecionar
 *   - selecao — grade de cards das fases (com cadeado/check)
 *   - jogo — palco (título + HUD + grade) e botões de ação
 *   - vitoria — modal sobre o jogo
 *
 * Separação: UIManager cuida do que NÃO é a grade do tabuleiro
 * (Renderer faz isso). Telas e modal vivem no `containerUI`.
 */

import type { Game } from '../core/Game';
import type { LevelManager } from '../systems/LevelManager';
import type { FaseDef } from '../types';
import type { QuemSouResposta } from '../systems/RankingService';
import { entrarModoImersivo } from '../systems/MobileImersivo';
import { iniciarAtmosfera, pararAtmosfera } from '../systems/Atmosfera';

export interface DadosTelaVitoria {
  faseNome: string;
  movimentos: number;
  otimo?: number;
  temProximaFase: boolean;
  melhor?: number;
}

export interface DadosHud {
  podeDesfazer: boolean;
}

export class UIManager {
  protected containerUI: HTMLElement;
  protected jogo: Game;
  private niveis: LevelManager;
  private telaAtual: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private btnDesfazer: HTMLButtonElement | null = null;
  private btnAmpliar: HTMLButtonElement | null = null;
  private chipLogin: HTMLElement | null = null;

  constructor(containerUI: HTMLElement, jogo: Game, niveis: LevelManager) {
    this.containerUI = containerUI;
    this.jogo = jogo;
    this.niveis = niveis;
    this.criarChipLogin();
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove('modo-ampliado');
      }
      this.atualizarBtnAmpliar();
    });
    // Botão flutuante de fechar fullscreen (declarado em index.html)
    const btnFechar = document.querySelector<HTMLButtonElement>('.btn-fechar-fs');
    btnFechar?.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      document.body.classList.remove('modo-ampliado');
      this.atualizarBtnAmpliar();
    });
  }

  // ==========================================================================
  // Telas
  // ==========================================================================

  mostrarTelaInicial(): void {
    this.limparTela();
    const tela = document.createElement('div');
    tela.className = 'tela tela-inicial';
    tela.appendChild(this.criarHero());
    tela.appendChild(this.criarSecaoAprender());
    tela.appendChild(this.criarSecaoMecanicas());
    tela.appendChild(this.criarSecaoStats());
    tela.appendChild(this.criarSecaoCtaFinal());
    this.containerUI.appendChild(tela);
    this.telaAtual = tela;
    iniciarAtmosfera(tela);
    // Foco no botão começar — primeiro tick pra evitar scroll inesperado
    Promise.resolve().then(() => {
      const btn = tela.querySelector<HTMLButtonElement>('.btn-primario-hero');
      btn?.focus({ preventScroll: true });
    });
  }

  /**
   * Hero: o "above the fold". Selo + título + tagline + mini-demo + CTAs.
   * Ocupa ~100vh em desktop pra dar drama; mobile flexa pra caber.
   */
  private criarHero(): HTMLElement {
    const hero = document.createElement('section');
    hero.className = 'tela-inicial-hero';

    const selo = document.createElement('div');
    selo.className = 'hero-selo revelar';
    selo.innerHTML = '<span class="hero-selo-ponto" aria-hidden="true"></span>Puzzle · Lógica · Floresta';
    hero.appendChild(selo);

    const titulo = document.createElement('h1');
    titulo.className = 'hero-titulo revelar';
    titulo.innerHTML = 'Logic <span class="hero-titulo-bug">Bugs</span>';
    hero.appendChild(titulo);

    const tagline = document.createElement('p');
    tagline.className = 'hero-tagline revelar';
    tagline.innerHTML = 'Pequenos engenheiros. <strong>Grandes labirintos.</strong>';
    hero.appendChild(tagline);

    const dica = document.createElement('p');
    dica.className = 'hero-dica revelar';
    dica.textContent = 'pense antes de mover';
    hero.appendChild(dica);

    const demo = this.criarHeroDemo();
    demo.classList.add('revelar');
    hero.appendChild(demo);

    const acoes = document.createElement('div');
    acoes.className = 'hero-acoes revelar';

    const btnComecar = document.createElement('button');
    btnComecar.type = 'button';
    btnComecar.className = 'btn-primario-hero';
    btnComecar.textContent = '▶  Começar a aventura';
    btnComecar.addEventListener('click', () => {
      void entrarModoImersivo();
      this.jogo.iniciarPrimeiraJogavel();
    });
    acoes.appendChild(btnComecar);

    const btnSelecionar = document.createElement('button');
    btnSelecionar.type = 'button';
    btnSelecionar.className = 'btn-secundario-hero';
    btnSelecionar.textContent = 'Selecionar fase';
    btnSelecionar.addEventListener('click', () => {
      void entrarModoImersivo();
      this.mostrarSelecaoFases();
    });
    acoes.appendChild(btnSelecionar);

    const btnRanking = document.createElement('a');
    btnRanking.className = 'btn-secundario-hero';
    btnRanking.href = this.jogo.ranking?.rankingUrl ?? '#';
    btnRanking.target = '_blank';
    btnRanking.rel = 'noopener';
    btnRanking.textContent = '🏆 Ranking';
    acoes.appendChild(btnRanking);

    hero.appendChild(acoes);

    // Indicador de scroll
    const cue = document.createElement('button');
    cue.type = 'button';
    cue.className = 'hero-scroll-cue';
    cue.setAttribute('aria-label', 'Rolar para saber mais');
    cue.innerHTML = `
      <span class="hero-scroll-cue-label">descobrir mais</span>
      <svg viewBox="0 0 20 24" aria-hidden="true">
        <rect x="3" y="2" width="14" height="20" rx="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="10" cy="9" r="1.6" fill="currentColor">
          <animate attributeName="cy" values="6;14;6" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0;1" dur="1.8s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `;
    cue.addEventListener('click', () => {
      const proxima = hero.nextElementSibling as HTMLElement | null;
      proxima?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    hero.appendChild(cue);

    return hero;
  }

  /**
   * Seção "Você vai aprender": 3 cards horizontais com ícones SVG próprios.
   * Linguagem do jogador, não do educador (respeita pilar "aprendizado invisível").
   */
  private criarSecaoAprender(): HTMLElement {
    const sec = document.createElement('section');
    sec.className = 'hero-secao secao-aprender';
    sec.innerHTML = `
      <header class="secao-header revelar">
        <p class="secao-sobretitulo">o que você desenvolve</p>
        <h2 class="secao-titulo">Pensamento que rende <em>mais</em> que o jogo</h2>
        <p class="secao-subtitulo">Sem aulas. Só puzzles que pedem o melhor da sua cabeça.</p>
      </header>

      <div class="cards-aprender">
        <article class="card-aprender revelar">
          <div class="card-aprender-icone" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <defs>
                <radialGradient id="ica1" cx="50%" cy="40%" r="55%">
                  <stop offset="0%" stop-color="#fde047"/>
                  <stop offset="60%" stop-color="#f59e0b"/>
                  <stop offset="100%" stop-color="#7a3a06" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <circle cx="32" cy="32" r="22" fill="url(#ica1)" opacity="0.35"/>
              <path d="M14 32 Q24 22 32 32 Q40 42 50 32" stroke="#fbbf24" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <path d="M14 32 Q24 22 32 32" stroke="#fef3c7" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
              <circle cx="14" cy="32" r="3" fill="#fef3c7"/>
              <circle cx="32" cy="32" r="3.5" fill="#fbbf24"/>
              <circle cx="50" cy="32" r="3" fill="#7a3a06" opacity="0.6"/>
              <path d="M48 28 L52 32 L48 36" stroke="#fbbf24" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="card-aprender-titulo">Antecipar</h3>
          <p class="card-aprender-texto">
            Cada caixa empurrada pode <strong>abrir um caminho</strong>
            — ou fechar pra sempre. Você aprende a enxergar o efeito
            antes de mover.
          </p>
        </article>

        <article class="card-aprender revelar">
          <div class="card-aprender-icone" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <defs>
                <radialGradient id="ica2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#bef264"/>
                  <stop offset="60%" stop-color="#65a30d"/>
                  <stop offset="100%" stop-color="#1a4a0d" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <circle cx="32" cy="32" r="22" fill="url(#ica2)" opacity="0.35"/>
              <circle cx="32" cy="32" r="14" fill="none" stroke="#65a30d" stroke-width="1.8" opacity="0.5"/>
              <circle cx="32" cy="32" r="8"  fill="none" stroke="#84cc16" stroke-width="1.5" opacity="0.7"/>
              <circle cx="32" cy="32" r="3"  fill="#bef264"/>
              <path d="M10 32 L20 32" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
              <path d="M44 32 L54 32" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
              <path d="M32 10 L32 20" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
              <path d="M32 44 L32 54" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
              <path d="M52 32 L48 30 L48 34 Z" fill="#a3e635"/>
              <path d="M12 32 L16 30 L16 34 Z" fill="#a3e635"/>
            </svg>
          </div>
          <h3 class="card-aprender-titulo">Planejar</h3>
          <p class="card-aprender-texto">
            A ordem dos passos importa. Qual chave primeiro? Qual caixa
            agora? Cada fase é um <strong>quebra-cabeça de prioridade</strong>.
          </p>
        </article>

        <article class="card-aprender revelar">
          <div class="card-aprender-icone" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <defs>
                <radialGradient id="ica3" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stop-color="#fda4af"/>
                  <stop offset="60%" stop-color="#b91c1c"/>
                  <stop offset="100%" stop-color="#450a0a" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <circle cx="32" cy="32" r="22" fill="url(#ica3)" opacity="0.25"/>
              <path d="M48 32 A16 16 0 1 1 32 16" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M48 32 L45 28 L51 27 Z" fill="#fb923c"/>
              <path d="M22 26 L26 30 L34 22" stroke="#fbbf24" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="32" cy="32" r="2.5" fill="#fbbf24" opacity="0.7"/>
            </svg>
          </div>
          <h3 class="card-aprender-titulo">Refinar</h3>
          <p class="card-aprender-texto">
            Travou? <strong>R reinicia em meio segundo.</strong> O erro
            vira informação. Você refina a estratégia até a fase ceder.
          </p>
        </article>
      </div>
    `;
    return sec;
  }

  /**
   * Seção "Dentro do labirinto": 6 mecânicas com sprite + nome curto.
   */
  private criarSecaoMecanicas(): HTMLElement {
    const sec = document.createElement('section');
    sec.className = 'hero-secao secao-mecanicas';
    const mecanicas: Array<{ sprite: string; nome: string; desc: string }> = [
      { sprite: 'bloco',     nome: 'Empurrar',     desc: 'Caixas em grade. Um movimento de cada vez.' },
      { sprite: 'chave',     nome: 'Chaves',       desc: 'Pegue todas pra liberar a saída.' },
      { sprite: 'porta',     nome: 'Portas',       desc: 'Cinco cores. Cada chave abre a sua.' },
      { sprite: 'tnt',       nome: 'TNT',          desc: 'Empurre na caixa certa. Cuidado com a cadeia.' },
      { sprite: 'pedra',     nome: 'Pedra',        desc: 'Quebre com picareta. Recurso escasso.' },
      { sprite: 'inseto-1',  nome: 'Multi-inseto', desc: 'Até cinco insetos. Cada um faz uma parte.' },
    ];

    let cardsHtml = '';
    for (const m of mecanicas) {
      cardsHtml += `
        <article class="card-mecanica revelar">
          <div class="card-mecanica-sprite">
            <img src="${import.meta.env.BASE_URL}sprites/${m.sprite}.svg" alt="" loading="lazy">
          </div>
          <h3 class="card-mecanica-nome">${m.nome}</h3>
          <p class="card-mecanica-desc">${m.desc}</p>
        </article>
      `;
    }

    sec.innerHTML = `
      <header class="secao-header revelar">
        <p class="secao-sobretitulo">o que você encontra</p>
        <h2 class="secao-titulo">7 mecânicas. <em>Profundidade infinita.</em></h2>
        <p class="secao-subtitulo">Regras simples que se combinam de jeitos surpreendentes.</p>
      </header>
      <div class="grid-mecanicas">
        ${cardsHtml}
      </div>
    `;
    return sec;
  }

  /**
   * Seção stats: 3 números grandes (122 fases · 7 mecânicas · ∞ caminhos)
   * + linha de bibliografia ("Inspirado no Berusky 2002, reconstruído pra browser").
   */
  private criarSecaoStats(): HTMLElement {
    const sec = document.createElement('section');
    sec.className = 'hero-secao secao-stats';
    sec.innerHTML = `
      <div class="stats-grid revelar">
        <div class="stat">
          <div class="stat-numero">122</div>
          <div class="stat-label">fases jogáveis</div>
        </div>
        <div class="stat-separador" aria-hidden="true"></div>
        <div class="stat">
          <div class="stat-numero">7</div>
          <div class="stat-label">mecânicas</div>
        </div>
        <div class="stat-separador" aria-hidden="true"></div>
        <div class="stat">
          <div class="stat-numero">∞</div>
          <div class="stat-label">caminhos possíveis</div>
        </div>
      </div>
      <p class="stats-rodape revelar">
        Inspirado no <strong>Berusky</strong> (2002, República Tcheca) — reconstruído pra navegador moderno em 2026.
        Funciona em qualquer celular, sem instalação.
      </p>
    `;
    return sec;
  }

  /**
   * CTA final: pergunta provocativa + botão grande + dica de mobile.
   */
  private criarSecaoCtaFinal(): HTMLElement {
    const sec = document.createElement('section');
    sec.className = 'hero-secao secao-cta-final';
    sec.innerHTML = `
      <h2 class="cta-final-titulo revelar">
        Pronto pra <em>travar</em> nas primeiras fases?
      </h2>
      <p class="cta-final-texto revelar">
        A fase 1 é fácil. A fase 30, nem tanto. Você decide até onde vai.
      </p>
    `;
    const acoes = document.createElement('div');
    acoes.className = 'hero-acoes revelar';

    const btnComecar = document.createElement('button');
    btnComecar.type = 'button';
    btnComecar.className = 'btn-primario-hero';
    btnComecar.textContent = '▶  Começar agora';
    btnComecar.addEventListener('click', () => {
      void entrarModoImersivo();
      this.jogo.iniciarPrimeiraJogavel();
    });
    acoes.appendChild(btnComecar);

    const btnSelecionar = document.createElement('button');
    btnSelecionar.type = 'button';
    btnSelecionar.className = 'btn-secundario-hero';
    btnSelecionar.textContent = 'Selecionar fase';
    btnSelecionar.addEventListener('click', () => {
      void entrarModoImersivo();
      this.mostrarSelecaoFases();
    });
    acoes.appendChild(btnSelecionar);
    sec.appendChild(acoes);

    const rodape = document.createElement('p');
    rodape.className = 'cta-final-rodape revelar';
    rodape.innerHTML = 'Funciona no celular · Sem login · <strong>Grátis pra sempre</strong>';
    sec.appendChild(rodape);

    return sec;
  }

  /**
   * Cria a mini-demo do hero: grade 5×3 com inseto que resolve um puzzle
   * curto (coleta chave → abre porta → chega na saída) em loop de 10s.
   * Tudo em CSS — não consome o motor de jogo nem o Renderer.
   */
  private criarHeroDemo(): HTMLElement {
    const demo = document.createElement('div');
    demo.className = 'hero-demo';
    demo.setAttribute('aria-label', 'Pré-visualização animada do jogo');
    demo.setAttribute('role', 'img');

    const grade = document.createElement('div');
    grade.className = 'hd-grade';
    for (let i = 0; i < 15; i++) {
      const cell = document.createElement('div');
      cell.className = 'hd-cell';
      grade.appendChild(cell);
    }
    demo.appendChild(grade);

    const ent = document.createElement('div');
    ent.className = 'hd-entidades';
    const base = import.meta.env.BASE_URL;

    const saida = document.createElement('img');
    saida.className = 'hd-saida';
    saida.src = `${base}sprites/saida.svg`;
    saida.alt = '';
    ent.appendChild(saida);

    const porta = document.createElement('img');
    porta.className = 'hd-porta';
    porta.src = `${base}sprites/porta.svg`;
    porta.alt = '';
    ent.appendChild(porta);

    const pop = document.createElement('div');
    pop.className = 'hd-pop';
    ent.appendChild(pop);

    const chave = document.createElement('img');
    chave.className = 'hd-chave';
    chave.src = `${base}sprites/chave.svg`;
    chave.alt = '';
    ent.appendChild(chave);

    const inseto = document.createElement('img');
    inseto.className = 'hd-inseto';
    inseto.src = `${base}sprites/inseto-0.svg`;
    inseto.alt = '';
    ent.appendChild(inseto);

    demo.appendChild(ent);
    return demo;
  }

  mostrarSelecaoFases(): void {
    this.limparTela();
    const tela = document.createElement('div');
    tela.className = 'tela tela-selecao';

    const topo = document.createElement('div');
    topo.className = 'tela-topo';
    const btnVoltar = document.createElement('button');
    btnVoltar.type = 'button';
    btnVoltar.className = 'btn-icone';
    btnVoltar.setAttribute('aria-label', 'Voltar');
    btnVoltar.textContent = '←';
    btnVoltar.addEventListener('click', () => this.mostrarTelaInicial());
    topo.appendChild(btnVoltar);
    const titTopo = document.createElement('h2');
    titTopo.className = 'tela-subtitulo';
    titTopo.textContent = 'Selecionar fase';
    topo.appendChild(titTopo);
    tela.appendChild(topo);

    // Agrupa fases por levelset / coleção
    const grupos = this.agruparFases(this.niveis.todas);

    // Decide qual grupo abrir por padrao: o primeiro com fase nao-completa.
    let grupoDefaultIdx = grupos.findIndex(g =>
      g.fases.some(f => !this.niveis.estaCompleta(f.id))
    );
    if (grupoDefaultIdx < 0) grupoDefaultIdx = 0;

    for (let i = 0; i < grupos.length; i++) {
      const g = grupos[i];
      const completas = g.fases.filter(f => this.niveis.estaCompleta(f.id)).length;
      const total = g.fases.length;

      const details = document.createElement('details');
      details.className = 'grupo-fases';
      if (i === grupoDefaultIdx) details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'grupo-summary';
      const labelEl = document.createElement('span');
      labelEl.className = 'grupo-label';
      labelEl.textContent = g.label;
      summary.appendChild(labelEl);
      const progEl = document.createElement('span');
      progEl.className = 'grupo-progresso' + (completas === total ? ' completo' : '');
      progEl.textContent = `${completas}/${total}${completas === total ? ' ✓' : ''}`;
      summary.appendChild(progEl);
      details.appendChild(summary);

      const grade = document.createElement('div');
      grade.className = 'fases-grid';
      for (const fase of g.fases) {
        grade.appendChild(this.cardFase(fase));
      }
      details.appendChild(grade);

      tela.appendChild(details);
    }

    this.containerUI.appendChild(tela);
    this.telaAtual = tela;
  }

  /**
   * Agrupa as fases em colecoes pra UI de selecao.
   * Logic Bugs locais (ids 1-99) ficam num grupo; fases Berusky importadas
   * (ids 100+) sao divididas por levelset.
   */
  private agruparFases(fases: readonly FaseDef[]): Array<{ codigo: string; label: string; fases: FaseDef[] }> {
    const grupos: Array<{ codigo: string; label: string; fases: FaseDef[] }> = [
      { codigo: 'autoral', label: 'Aprendizado', fases: [] },
      { codigo: 's1', label: 'Nível Simples', fases: [] },
      { codigo: 's2', label: 'Nível Médio', fases: [] },
      { codigo: 's3', label: 'Nível Difícil', fases: [] },
      { codigo: 'bonus', label: 'Bônus', fases: [] },
    ];
    // Numeracao: aprendizado 1000+, depois levelsets Berusky contiguos.
    // Recordacoes (s0 = 3-12) e Bonus (s4 = 118-122) viram um grupo so 'bonus'.
    // s1=50 (13-62), s2=35 (63-97), s3=20 (98-117)
    for (const f of fases) {
      if (f.id >= 1000) grupos[0].fases.push(f);
      else if (f.id < 13) grupos[4].fases.push(f);   // Recordacoes -> bonus
      else if (f.id < 63) grupos[1].fases.push(f);
      else if (f.id < 98) grupos[2].fases.push(f);
      else if (f.id < 118) grupos[3].fases.push(f);
      else grupos[4].fases.push(f);                  // Bonus original
    }
    return grupos.filter(g => g.fases.length > 0 && g.codigo !== 'bonus');
  }

  /** Monta o palco do jogo (título + HUD + grade) — chamado pelo Renderer. */
  prepararPalco(palco: HTMLElement): void {
    this.limparTela();
    this.telaAtual = palco;
  }

  /** Adiciona/atualiza botões de ação como filho direto do palco.
   *  CSS posiciona conforme breakpoint: coluna lateral em desktop, bottom bar em mobile. */
  montarHudAcoes(palco: HTMLElement, dados: DadosHud): void {
    let acoes = palco.querySelector<HTMLElement>('.hud-acoes');
    if (!acoes) {
      acoes = document.createElement('div');
      acoes.className = 'hud-acoes';

      const btnDesfazer = document.createElement('button');
      btnDesfazer.type = 'button';
      btnDesfazer.className = 'btn-icone';
      btnDesfazer.setAttribute('aria-label', 'Desfazer (Z)');
      btnDesfazer.title = 'Desfazer (Z)';
      btnDesfazer.textContent = '↩';
      btnDesfazer.addEventListener('click', () => this.jogo.desfazer());
      acoes.appendChild(btnDesfazer);
      this.btnDesfazer = btnDesfazer;

      const btnReiniciar = document.createElement('button');
      btnReiniciar.type = 'button';
      btnReiniciar.className = 'btn-icone btn-reiniciar';
      btnReiniciar.setAttribute('aria-label', 'Reiniciar (R)');
      btnReiniciar.title = 'Reiniciar (R)';
      btnReiniciar.textContent = '🔄';
      btnReiniciar.addEventListener('click', () => this.jogo.reiniciarFase());
      acoes.appendChild(btnReiniciar);

      const btnAudio = document.createElement('button');
      btnAudio.type = 'button';
      btnAudio.className = 'btn-icone btn-audio';
      const atualizaIcone = () => {
        const on = this.jogo.audio.estaHabilitado;
        btnAudio.textContent = on ? '🔊' : '🔇';
        btnAudio.title = on ? 'Som ligado (clique pra desligar)' : 'Som desligado (clique pra ligar)';
        btnAudio.setAttribute('aria-label', btnAudio.title);
      };
      atualizaIcone();
      btnAudio.addEventListener('click', () => {
        this.jogo.audio.alternar();
        atualizaIcone();
      });
      acoes.appendChild(btnAudio);

      const btnAmpliar = document.createElement('button');
      btnAmpliar.type = 'button';
      btnAmpliar.className = 'btn-icone btn-ampliar';
      btnAmpliar.addEventListener('click', () => {
        const fsAtivo = !!document.fullscreenElement;
        if (fsAtivo) {
          // Sair: exitFullscreen sincroniza modo-ampliado via fullscreenchange
          document.exitFullscreen?.().catch(() => {
            document.body.classList.remove('modo-ampliado');
            this.atualizarBtnAmpliar();
          });
        } else {
          // Entrar: aplica modo-ampliado imediatamente + tenta fullscreen real
          document.body.classList.add('modo-ampliado');
          this.atualizarBtnAmpliar();
          document.documentElement.requestFullscreen?.().catch(() => {
            /* fullscreen pode falhar (ex.: iframe sem allow) — modo-ampliado já está aplicado */
          });
        }
      });
      acoes.appendChild(btnAmpliar);
      this.btnAmpliar = btnAmpliar;
      this.atualizarBtnAmpliar();

      const btnMenu = document.createElement('button');
      btnMenu.type = 'button';
      btnMenu.className = 'btn-icone';
      btnMenu.setAttribute('aria-label', 'Voltar ao menu');
      btnMenu.title = 'Menu';
      btnMenu.textContent = '☰';
      btnMenu.addEventListener('click', () => this.jogo.voltarAoMenu());
      acoes.appendChild(btnMenu);

      palco.appendChild(acoes);
    }

    if (this.btnDesfazer) {
      this.btnDesfazer.disabled = !dados.podeDesfazer;
    }
  }

  // ==========================================================================
  // Modal de vitória
  // ==========================================================================

  mostrarTelaVitoria(dados: DadosTelaVitoria): void {
    this.esconderModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Fase ${dados.faseNome} completa`);

    const card = document.createElement('div');
    card.className = 'modal-card';

    const titulo = document.createElement('h2');
    titulo.className = 'modal-titulo';
    titulo.textContent = 'Fase completa!';
    card.appendChild(titulo);

    const sub = document.createElement('p');
    sub.className = 'modal-subtitulo';
    sub.textContent = dados.faseNome;
    card.appendChild(sub);

    const stats = document.createElement('div');
    stats.className = 'modal-stats';
    stats.appendChild(this.statBox(dados.movimentos, 'movimentos'));
    if (typeof dados.otimo === 'number') {
      stats.appendChild(this.statBox(dados.otimo, 'ótimo'));
    }
    if (typeof dados.melhor === 'number') {
      stats.appendChild(this.statBox(dados.melhor, 'recorde'));
    }
    card.appendChild(stats);

    const acoes = document.createElement('div');
    acoes.className = 'modal-acoes';

    const btnReiniciar = document.createElement('button');
    btnReiniciar.type = 'button';
    btnReiniciar.textContent = 'Jogar de novo';
    btnReiniciar.addEventListener('click', () => {
      this.esconderModal();
      this.jogo.reiniciarFase();
    });
    acoes.appendChild(btnReiniciar);

    if (dados.temProximaFase) {
      const btnProx = document.createElement('button');
      btnProx.type = 'button';
      btnProx.className = 'btn-primario';
      btnProx.textContent = 'Próxima fase';
      btnProx.addEventListener('click', () => {
        this.esconderModal();
        this.jogo.proximaFase();
      });
      acoes.appendChild(btnProx);
      Promise.resolve().then(() => btnProx.focus());
    } else {
      const btnMenu = document.createElement('button');
      btnMenu.type = 'button';
      btnMenu.className = 'btn-primario';
      btnMenu.textContent = 'Menu';
      btnMenu.addEventListener('click', () => {
        this.esconderModal();
        this.jogo.voltarAoMenu();
      });
      acoes.appendChild(btnMenu);

      const fim = document.createElement('p');
      fim.className = 'modal-fim';
      fim.textContent = 'Você zerou o jogo!';
      card.appendChild(fim);
      Promise.resolve().then(() => btnMenu.focus());
    }

    card.appendChild(acoes);
    overlay.appendChild(card);
    this.containerUI.appendChild(overlay);
    this.modal = overlay;
  }

  esconderModal(): void {
    if (this.modal?.parentElement) {
      this.modal.parentElement.removeChild(this.modal);
    }
    this.modal = null;
  }

  // ==========================================================================
  // Internos
  // ==========================================================================

  /** Remove a tela ativa (e modal) do DOM. Chamado antes de trocar. */
  private limparTela(): void {
    this.esconderModal();
    pararAtmosfera();
    if (this.telaAtual?.parentElement) {
      this.telaAtual.parentElement.removeChild(this.telaAtual);
    }
    this.telaAtual = null;
    this.btnDesfazer = null;
    this.btnAmpliar = null;
  }

  /**
   * Cria o chip persistente de login no canto superior direito.
   * Vive no body (nao no containerUI) pra sobreviver a troca de telas.
   */
  private criarChipLogin(): void {
    if (this.chipLogin) return;
    const chip = document.createElement('div');
    chip.className = 'chip-login';
    chip.style.cssText =
      'position:fixed;top:12px;right:12px;z-index:50;display:flex;align-items:center;gap:8px;' +
      'padding:6px 12px;border-radius:999px;font:600 13px/1.2 system-ui,sans-serif;' +
      'background:rgba(28,28,32,0.85);color:#fff;border:1px solid rgba(255,255,255,0.15);' +
      'backdrop-filter:blur(8px);text-decoration:none;cursor:pointer;transition:transform .2s;';
    chip.textContent = '⏳';
    chip.addEventListener('mouseenter', () => (chip.style.transform = 'scale(1.04)'));
    chip.addEventListener('mouseleave', () => (chip.style.transform = 'scale(1)'));
    document.body.appendChild(chip);
    this.chipLogin = chip;
  }

  /**
   * Dica visual que aparece quando o jogador trava (varios shakes seguidos).
   * Cria um banner com instrucao "aperte R" e destaca o botao Reiniciar
   * com pulsing amarelo. Some quando o jogador faz movimento valido ou reinicia.
   */
  mostrarDicaReiniciar(): void {
    // Destaca o botao Reiniciar com classe especial
    const btn = document.querySelector<HTMLButtonElement>('.btn-reiniciar');
    btn?.classList.add('btn-reiniciar-destaque');

    // Cria banner se ainda nao existe
    if (document.querySelector('.dica-reiniciar')) return;
    const banner = document.createElement('div');
    banner.className = 'dica-reiniciar';
    banner.innerHTML = `
      <span class="dica-reiniciar-icone">💡</span>
      <div class="dica-reiniciar-texto">
        <strong>Travado?</strong>
        Aperte <kbd>R</kbd> ou clique em <span class="dica-reiniciar-emoji">🔄</span> pra reiniciar a fase.
      </div>
    `;
    document.body.appendChild(banner);
  }

  esconderDicaReiniciar(): void {
    document.querySelectorAll('.btn-reiniciar-destaque').forEach((b) =>
      b.classList.remove('btn-reiniciar-destaque'),
    );
    document.querySelector('.dica-reiniciar')?.remove();
  }

  /**
   * Flash visual quando o jogador coleta uma gema ou chave.
   * Mostra um overlay grande "💎 1/4" no centro por ~700ms.
   * O proposito e dar satisfacao + reforco visual do progresso.
   */
  flashColeta(tipo: 'coletavel' | 'chave', atual: number, total: number): void {
    const flash = document.createElement('div');
    flash.className = 'coleta-flash';
    const emoji = tipo === 'coletavel' ? '💎' : '🔑';
    flash.innerHTML = `
      <span class="coleta-flash-emoji">${emoji}</span>
      <span class="coleta-flash-contador">${atual}/${total}</span>
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 750);
  }

  /** Chamado pelo Game quando quemSou() retorna do backend. */
  atualizarHudLogin(quemSou: QuemSouResposta): void {
    if (!this.chipLogin) return;
    this.chipLogin.innerHTML = '';
    if (quemSou.logado && quemSou.usuario) {
      const nome = quemSou.usuario.nome || 'Aluno';
      const temAvatarProprio = !quemSou.usuario.avatar.includes('ui-avatars.com');

      const img = document.createElement('img');
      img.src = quemSou.usuario.avatar;
      img.alt = '';
      img.style.cssText = 'width:22px;height:22px;border-radius:50%;object-fit:cover;';
      this.chipLogin.appendChild(img);

      // Avatar proprio = so a foto (chip enxuto). Avatar generico (iniciais
      // do UI Avatars) = mostra primeiro nome pra dar contexto.
      if (!temAvatarProprio) {
        const span = document.createElement('span');
        span.textContent = nome.split(' ')[0];
        this.chipLogin.appendChild(span);
      }
      this.chipLogin.title = `Logado como ${nome} — clique pra ver o ranking`;
      this.chipLogin.onclick = () => window.open(this.jogo.ranking.rankingUrl, '_blank', 'noopener');
    } else {
      this.chipLogin.textContent = '🔑 Entrar pra rankear';
      this.chipLogin.title = 'Faça login no Ensino Social pra entrar no ranking';
      this.chipLogin.onclick = () => window.open(this.jogo.ranking.loginUrl, '_blank', 'noopener');
    }
  }

  private atualizarBtnAmpliar(): void {
    if (!this.btnAmpliar) return;
    const ativo = document.body.classList.contains('modo-ampliado');
    this.btnAmpliar.textContent = ativo ? '⛶' : '⛶';
    this.btnAmpliar.title = ativo ? 'Reduzir' : 'Ampliar';
    this.btnAmpliar.setAttribute('aria-label', this.btnAmpliar.title);
    this.btnAmpliar.classList.toggle('ativo', ativo);
  }

  private cardFase(fase: FaseDef): HTMLElement {
    const desbloqueada = this.niveis.estaDesbloqueada(fase.id);
    const completa = this.niveis.estaCompleta(fase.id);
    const melhor = this.niveis.melhorMovs(fase.id);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card-fase';
    card.classList.toggle('card-fase-bloqueada', !desbloqueada);
    card.classList.toggle('card-fase-completa', completa);
    card.disabled = !desbloqueada;

    const nomeEl = document.createElement('div');
    nomeEl.className = 'card-fase-nome';
    nomeEl.textContent = fase.nome;
    card.appendChild(nomeEl);

    const meta = document.createElement('div');
    meta.className = 'card-fase-meta';
    if (!desbloqueada) {
      meta.textContent = '🔒';
    } else if (completa) {
      meta.innerHTML = `✓ <span class="card-fase-recorde">${melhor} movs</span>`;
    }
    card.appendChild(meta);

    if (desbloqueada) {
      card.addEventListener('click', () => this.jogo.carregarFase(fase.id));
    }
    return card;
  }

  private statBox(num: number, label: string): HTMLElement {
    const box = document.createElement('div');
    box.className = 'modal-stat';
    const n = document.createElement('span');
    n.className = 'modal-stat-num';
    n.textContent = `${num}`;
    const l = document.createElement('span');
    l.className = 'modal-stat-label';
    l.textContent = label;
    box.appendChild(n);
    box.appendChild(l);
    return box;
  }
}
