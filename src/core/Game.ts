/**
 * Game.ts — Orquestrador central do jogo.
 *
 * Responsabilidades:
 *   - Inicializa todos os sistemas (Input, Render, Collision, etc.)
 *   - Mantém referência ao GameState
 *   - Coordena o ciclo: input → atualização → render
 *   - Gerencia transições entre telas (menu / seleção / jogo)
 *   - Expõe API pública pra UI e debug
 *
 * NÃO faz: lógica de jogo direta. Delega aos sistemas.
 */

import type { Direcao } from '../types';
import { GameState } from './GameState';
import { Renderer } from '../render/Renderer';
import { InputManager } from '../systems/InputManager';
import { EntitySystem } from '../systems/EntitySystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { HistoryManager } from './HistoryManager';
import { LevelManager } from '../systems/LevelManager';
import { AudioManager } from '../systems/AudioManager';
import { RankingService, type QuemSouResposta } from '../systems/RankingService';
import { UIManager } from '../render/UIManager';

type Tela = 'menu' | 'jogo' | 'selecao' | 'ranking';

export class Game {
  private containerRaiz: HTMLElement;
  private estado!: GameState;
  private renderer!: Renderer;
  private input!: InputManager;
  private entidades!: EntitySystem;
  private colisao!: CollisionSystem;
  private ui!: UIManager;
  private historico!: HistoryManager;
  private niveis!: LevelManager;
  audio!: AudioManager;
  ranking!: RankingService;
  quemSou: QuemSouResposta = { logado: false };
  private tela: Tela = 'menu';
  private inicioFaseTs: number = 0;
  /** Contador de movimentos bloqueados seguidos — dispara dica do R apos 3. */
  private bloqueadosSeguidos: number = 0;
  private readonly LIMITE_BLOQUEADOS_PRA_DICA = 3;

  constructor(containerRaiz: HTMLElement) {
    this.containerRaiz = containerRaiz;
  }

  /**
   * Inicializa todos os sistemas e abre a tela inicial.
   * Chamar uma única vez no boot.
   */
  iniciar(): void {
    this.estado = new GameState();
    this.renderer = new Renderer(this.containerRaiz);
    this.entidades = new EntitySystem();
    this.colisao = new CollisionSystem();
    this.historico = new HistoryManager();
    this.niveis = new LevelManager();
    this.audio = new AudioManager();
    this.ranking = new RankingService();
    this.ui = new UIManager(this.containerRaiz, this, this.niveis);
    this.input = new InputManager(this);

    this.renderer.setAoClicarJogador((idx) => this.trocarJogador(idx));

    this.input.iniciar();
    this.voltarAoMenu();

    // Consulta estado de login em background (nao bloqueia boot)
    this.ranking.quemSou().then((r) => {
      this.quemSou = r;
      this.niveis.setLiberarTudo(!!r.admin);
      this.ui.atualizarHudLogin?.(r);
      if (r.admin && this.tela === 'selecao') {
        this.ui.mostrarSelecaoFases();
      }
    });

    console.log('[Game] Boot. Setas/WASD mover · Tab/1-5 troca jogador · Z desfazer · R reiniciar.');
  }

  // ==========================================================================
  // Navegação entre telas
  // ==========================================================================

  /** Volta ao menu inicial. Limpa estado de jogo. */
  voltarAoMenu(): void {
    this.tela = 'menu';
    this.historico.limpar();
    this.renderer.destruir();
    this.ui.mostrarTelaInicial();
  }

  /** Abre tela de seleção de fases. */
  mostrarSelecaoFases(): void {
    this.tela = 'selecao';
    this.renderer.destruir();
    this.ui.mostrarSelecaoFases();
  }

  /** Joga a primeira fase desbloqueada e ainda não completa (ou a 1). */
  iniciarPrimeiraJogavel(): void {
    let alvo = 1;
    for (const fase of this.niveis.todas) {
      if (this.niveis.estaDesbloqueada(fase.id) && !this.niveis.estaCompleta(fase.id)) {
        alvo = fase.id;
        break;
      }
      if (this.niveis.estaCompleta(fase.id)) alvo = fase.id + 1;
    }
    if (!this.niveis.obter(alvo)) alvo = 1;
    this.carregarFase(alvo);
  }

  // ==========================================================================
  // Loop de jogo
  // ==========================================================================

  /**
   * Move o jogador na direção dada.
   * Consulta CollisionSystem → shake ou aplica via EntitySystem.
   * Empilha snapshot pra undo.
   */
  moverJogador(direcao: Direcao): void {
    if (this.tela !== 'jogo' || this.estado.completou) return;

    const resultado = this.colisao.avaliarMovimento(this.estado, direcao);

    if (resultado.tipo === 'bloqueado') {
      this.renderer.shakeJogador();
      this.audio.bump();
      this.bloqueadosSeguidos++;
      if (this.bloqueadosSeguidos >= this.LIMITE_BLOQUEADOS_PRA_DICA) {
        this.ui.mostrarDicaReiniciar?.();
      }
      return;
    }
    // Movimento valido: zera contador de tentativas frustradas + esconde dica.
    if (this.bloqueadosSeguidos > 0) {
      this.bloqueadosSeguidos = 0;
      this.ui.esconderDicaReiniciar?.();
    }

    this.historico.empilhar(this.estado.serializar());

    // Snapshot pra detectar coleta apos aplicar (anima o "0/1 -> 1/1").
    const antesCol = this.estado.coletaveisColetados;
    const antesKey = this.estado.chavesColetadas;

    this.entidades.aplicar(this.estado, resultado);
    this.estado.movimentos++;
    this.rerenderizar();

    if (this.estado.coletaveisColetados > antesCol) {
      this.ui.flashColeta?.('coletavel', this.estado.coletaveisColetados, this.estado.totalColetaveis);
    } else if (this.estado.chavesColetadas > antesKey) {
      this.ui.flashColeta?.('chave', this.estado.chavesColetadas, this.estado.totalChaves);
    }

    // Som correspondente ao tipo de movimento
    switch (resultado.tipo) {
      case 'permitido':
        this.audio.passo();
        break;
      case 'empurrar_bloco':
      case 'empurrar_tnt':
        this.audio.empurrarBloco();
        break;
      case 'explodir_tnt':
        this.renderer.flashExplosao([resultado.posTnt, resultado.posBloco]);
        this.audio.explosao();
        break;
      case 'quebrar_pedra':
        this.audio.quebrarPedra();
        break;
      case 'coletar':
        this.audio.coletar();
        break;
      case 'abrir_porta':
      case 'abrir_porta_colorida':
        this.audio.abrirPorta();
        break;
      case 'sair_fase':
        // vitoria toca em aoCompletarFase
        break;
    }

    console.log(`[Game] mov ${this.estado.movimentos} → ${direcao} (${resultado.tipo})`);

    if (this.estado.completou) {
      this.aoCompletarFase();
    }
  }

  /** Desfaz o último movimento. No-op se pilha vazia ou fase completa. */
  desfazer(): void {
    if (this.tela !== 'jogo' || this.estado.completou) return;
    const snap = this.historico.desempilhar();
    if (!snap) return;
    this.estado.restaurar(snap);
    this.rerenderizar();
    console.log(`[Game] desfazer (${this.historico.tamanho} restantes)`);
  }

  /** Reinicia a fase atual do zero. */
  reiniciarFase(): void {
    if (!this.estado?.fase) return;
    this.carregarFase(this.estado.fase.id);
  }

  /**
   * Avanca pro proximo jogador na ordem (Tab no Berusky).
   * No-op se so tem 1 jogador na fase.
   */
  proximoJogador(): void {
    if (this.tela !== 'jogo' || this.estado.completou) return;
    if (this.estado.listarJogadores().length <= 1) return;
    this.estado.proximoJogador();
    this.rerenderizar();
    this.audio.trocarJogador();
  }

  /**
   * Troca direto pro jogador de indice dado (teclas 1-5 no Berusky).
   * No-op se o indice nao existe.
   */
  trocarJogador(idx: number): void {
    if (this.tela !== 'jogo' || this.estado.completou) return;
    const antes = this.estado.jogadorAtivoIdx;
    this.estado.trocarJogador(idx);
    if (this.estado.jogadorAtivoIdx !== antes) {
      this.rerenderizar();
      this.audio.trocarJogador();
    }
  }

  /** Avança pra próxima fase (ou volta ao menu se acabou). */
  proximaFase(): void {
    if (!this.estado?.fase) return;
    const prox = this.niveis.obterProxima(this.estado.fase.id);
    if (!prox) {
      this.voltarAoMenu();
      return;
    }
    this.carregarFase(prox.id);
  }

  /** Carrega uma fase específica por id (entra na tela "jogo"). */
  carregarFase(id: number): void {
    const fase = this.niveis.obter(id);
    if (!fase) {
      console.warn(`[Game] Fase ${id} não encontrada.`);
      return;
    }
    if (!this.niveis.estaDesbloqueada(id)) {
      console.warn(`[Game] Fase ${id} bloqueada.`);
      return;
    }
    this.tela = 'jogo';
    this.ui.esconderModal();
    this.ui.esconderDicaReiniciar?.();
    this.bloqueadosSeguidos = 0;
    this.renderer.destruir();
    this.historico.limpar();
    this.estado.carregarFase(fase);
    this.inicioFaseTs = Date.now();
    this.renderer.renderizar(this.estado);
    if (this.renderer.palco) {
      this.ui.prepararPalco(this.renderer.palco);
      this.ui.montarHudAcoes(this.renderer.palco, { podeDesfazer: false });
    }
  }

  // ==========================================================================
  // Internos
  // ==========================================================================

  private rerenderizar(): void {
    this.renderer.renderizar(this.estado);
    if (this.renderer.palco) {
      this.ui.montarHudAcoes(this.renderer.palco, {
        podeDesfazer: this.historico.podeDesfazer,
      });
    }
  }

  /** Disparado quando o jogador entra na saída com requisitos cumpridos. */
  private aoCompletarFase(): void {
    const fase = this.estado.fase;
    const tempoSegundos = Math.max(1, Math.round((Date.now() - this.inicioFaseTs) / 1000));
    this.niveis.registrarConclusao(fase.id, this.estado.movimentos);
    this.audio.vitoria();

    // Submit pro ranking (fire-and-forget + sendBeacon backup)
    // Nao envia se a conclusao for impossivel (movs < otimo) — evita poluir
    // o ranking publico com dados corrompidos / cheats.
    if (this.quemSou.logado && this.niveis.conclusaoValida(fase.id, this.estado.movimentos)) {
      const payload = {
        faseId: fase.id,
        movimentos: this.estado.movimentos,
        tempoSegundos,
        completou: true,
      };
      this.ranking.submeterConclusao(payload).catch(() => {
        // Backup via beacon caso fetch falhe
        this.ranking.enviarBeacon(payload);
      });
    }

    const melhor = this.niveis.melhorMovs(fase.id);
    const temProxima = !!this.niveis.obterProxima(fase.id);
    this.ui.mostrarTelaVitoria({
      faseNome: `${fase.id}. ${fase.nome}`,
      movimentos: this.estado.movimentos,
      otimo: fase.movimentosOtimos,
      melhor,
      temProximaFase: temProxima,
    });
  }
}
