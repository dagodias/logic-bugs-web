/**
 * AudioManager.ts — Sons sutis via Web Audio API sintetica (sem assets).
 *
 * Decisao de design: sons gerados em tempo real com OscillatorNode + envelope.
 *   Vantagens: 0 bytes adicionais no bundle, sem latencia de carregamento,
 *   estetica retro/bleep que combina com puzzle minimalista.
 *
 * AudioContext so e criado no primeiro user gesture (politica do browser).
 * Toggle on/off persiste em localStorage.
 */

const STORAGE_KEY = 'logicbugs:audio';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private habilitado: boolean = true;

  constructor() {
    // Le preferencia salva (default ligado)
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo === 'off') this.habilitado = false;
    } catch {
      // localStorage indisponivel — segue com default
    }
  }

  get estaHabilitado(): boolean {
    return this.habilitado;
  }

  alternar(): boolean {
    this.habilitado = !this.habilitado;
    try {
      localStorage.setItem(STORAGE_KEY, this.habilitado ? 'on' : 'off');
    } catch {
      /* noop */
    }
    return this.habilitado;
  }

  /**
   * Inicializa AudioContext no primeiro user gesture. Chame em qualquer
   * handler de input — repetir e seguro (idempotente).
   */
  private garantirContexto(): AudioContext | null {
    if (!this.habilitado) return null;
    if (this.ctx) {
      // Browsers as vezes suspendem o contexto sem aviso
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5; // headroom geral pra mistura nao saturar
      this.master.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Primitivas de sintese
  // ==========================================================================

  /**
   * Toca um oscilador com envelope ADSR simplificado.
   */
  private bip(opts: {
    freq: number;
    duracao: number;
    tipo?: OscillatorType;
    vol?: number;
    ataque?: number;
    decay?: number;
    freqFinal?: number;
  }): void {
    const ctx = this.garantirContexto();
    if (!ctx || !this.master) return;

    const { freq, duracao, tipo = 'sine', vol = 0.1, ataque = 0.005, decay = 0.04, freqFinal } = opts;
    const agora = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, agora);
    if (freqFinal !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqFinal), agora + duracao);
    }

    // Envelope: ataque rapido, decay exponencial pra zero
    gain.gain.setValueAtTime(0.0001, agora);
    gain.gain.exponentialRampToValueAtTime(vol, agora + ataque);
    gain.gain.exponentialRampToValueAtTime(0.0001, agora + ataque + decay + duracao);

    osc.connect(gain).connect(this.master);
    osc.start(agora);
    osc.stop(agora + ataque + decay + duracao + 0.05);
  }

  /** Ruido branco curto + filtro pra sons percussivos (passo, bump, explosao). */
  private ruido(opts: { duracao: number; vol?: number; corte?: number; tipoFiltro?: BiquadFilterType }): void {
    const ctx = this.garantirContexto();
    if (!ctx || !this.master) return;

    const { duracao, vol = 0.1, corte = 800, tipoFiltro = 'lowpass' } = opts;
    const agora = ctx.currentTime;
    const tamanhoBuf = Math.floor(ctx.sampleRate * duracao);
    const buffer = ctx.createBuffer(1, tamanhoBuf, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < tamanhoBuf; i++) {
      // Ruido branco com fade exponencial
      const t = i / tamanhoBuf;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * t);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filtro = ctx.createBiquadFilter();
    filtro.type = tipoFiltro;
    filtro.frequency.value = corte;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, agora);

    src.connect(filtro).connect(gain).connect(this.master);
    src.start(agora);
    src.stop(agora + duracao + 0.05);
  }

  // ==========================================================================
  // Sons do jogo
  // ==========================================================================

  passo(): void {
    // Sutil "tap" — ruido bem curto, filtrado, volume baixo
    this.ruido({ duracao: 0.04, vol: 0.04, corte: 600 });
  }

  bump(): void {
    // Movimento bloqueado: tom grave curto + ruido
    this.bip({ freq: 110, duracao: 0.06, tipo: 'square', vol: 0.06, decay: 0.05, freqFinal: 70 });
  }

  empurrarBloco(): void {
    // Som de "arrastar" — ruido com filtro mais aberto
    this.ruido({ duracao: 0.1, vol: 0.06, corte: 1200 });
  }

  coletar(): void {
    // Ding ascendente C5 -> G5
    this.bip({ freq: 523, duracao: 0.06, tipo: 'sine', vol: 0.08, decay: 0.06, freqFinal: 784 });
  }

  abrirPorta(): void {
    // Click suave + tom curto
    this.bip({ freq: 440, duracao: 0.1, tipo: 'triangle', vol: 0.07, decay: 0.08, freqFinal: 660 });
  }

  quebrarPedra(): void {
    // Click curto + ruido percussivo
    this.ruido({ duracao: 0.18, vol: 0.09, corte: 2200, tipoFiltro: 'bandpass' });
  }

  explosao(): void {
    // TNT: ruido com decay longo + tom grave
    this.ruido({ duracao: 0.4, vol: 0.16, corte: 1800, tipoFiltro: 'lowpass' });
    this.bip({ freq: 80, duracao: 0.2, tipo: 'sawtooth', vol: 0.1, decay: 0.18, freqFinal: 40 });
  }

  trocarJogador(): void {
    // Click sutil pra feedback de troca
    this.bip({ freq: 1200, duracao: 0.03, tipo: 'triangle', vol: 0.05, decay: 0.04 });
  }

  vitoria(): void {
    // Arpejo C maior: C5 - E5 - G5 - C6
    const ctx = this.garantirContexto();
    if (!ctx) return;
    const notas = [523, 659, 784, 1047];
    notas.forEach((freq, i) => {
      setTimeout(() => this.bip({ freq, duracao: 0.18, tipo: 'triangle', vol: 0.1, decay: 0.15 }), i * 90);
    });
  }
}
