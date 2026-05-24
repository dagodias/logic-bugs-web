/**
 * RankingService.ts — Cliente da API de ranking do EnsinoSocial.
 *
 * O jogo vive em games.ensinosocial.com.br, mas o backend vive em
 * ensinosocial.com.br. Cookie de sessao tem domain=.ensinosocial.com.br
 * + SameSite=Lax, entao a sessao e compartilhada sem CORS-credentials magic.
 *
 * Endpoints (em ensinosocial.com.br/?a=logicbugs.api):
 *   GET  ?op=quem-sou
 *   GET  ?op=ranking-global&limite=N&offset=N
 *   GET  ?op=ranking-fase&fase=ID&limite=N&offset=N
 *   POST ?op=concluir-fase    body JSON { fase_id, movimentos, tempo_segundos, completou }
 */

const HOST = location.hostname;

const API_BASE: string = (() => {
  if (HOST === 'localhost' || HOST === '127.0.0.1') {
    return 'http://localhost:8888';
  }
  // games.ensinosocial.com.br → ensinosocial.com.br
  return 'https://ensinosocial.com.br';
})();

const RANKING_URL = `${API_BASE}/logicbugs/ranking`;

export interface QuemSouResposta {
  logado: boolean;
  admin?: boolean;
  usuario?: { id: number; nome: string; avatar: string };
}

export interface MinhaPosicao {
  posicao: number;
  fases_completas: number;
  total_movimentos: number;
  total_tempo_segundos: number;
  total_participantes: number;
}

export interface ItemRankingGlobal {
  posicao: number;
  usuario_id: number;
  nome: string;
  avatar: string;
  fases_completas: number;
  total_movimentos: number;
  total_tempo_segundos: number;
}

export interface ItemRankingFase {
  posicao: number;
  usuario_id: number;
  nome: string;
  avatar: string;
  melhor_movimentos: number;
  melhor_tempo_segundos: number;
  tentativas: number;
  concluido_em: string | null;
}

export interface ResultadoConclusao {
  sucesso: boolean;
  completou?: boolean;
  flag_suspeito?: boolean;
  novo_recorde?: boolean;
  erro?: string;
}

export class RankingService {
  private quemSouCache: QuemSouResposta | null = null;
  private quemSouPromise: Promise<QuemSouResposta> | null = null;

  /** URL publica do ranking (pra abrir em nova aba). */
  get rankingUrl(): string {
    return RANKING_URL;
  }

  /** URL de login com redirect pro ranking apos autenticar. */
  get loginUrl(): string {
    return `${API_BASE}/login?redirect=${encodeURIComponent('/logicbugs/ranking')}`;
  }

  // -----------------------------------------------------------------
  // Auth state
  // -----------------------------------------------------------------

  /** Consulta o backend pra saber se ha sessao ativa. Cacheado. */
  async quemSou(forcarRefresh = false): Promise<QuemSouResposta> {
    if (!forcarRefresh && this.quemSouCache) return this.quemSouCache;
    if (this.quemSouPromise) return this.quemSouPromise;

    this.quemSouPromise = this.fetchJson<QuemSouResposta>('GET', { op: 'quem-sou' })
      .then((r) => {
        this.quemSouCache = r;
        this.quemSouPromise = null;
        return r;
      })
      .catch(() => {
        this.quemSouPromise = null;
        return { logado: false } as QuemSouResposta;
      });

    return this.quemSouPromise;
  }

  // -----------------------------------------------------------------
  // Submit de conclusao (granular, ao terminar cada fase)
  // -----------------------------------------------------------------

  /**
   * Envia conclusao de uma fase pro backend.
   * Usa fetch normal. Se aba estiver fechando, fallback automatico em
   * sendBeacon via tentarSubmeterBackup().
   */
  async submeterConclusao(payload: {
    faseId: number;
    movimentos: number;
    tempoSegundos: number;
    completou: boolean;
  }): Promise<ResultadoConclusao> {
    const body = {
      fase_id: payload.faseId,
      movimentos: payload.movimentos,
      tempo_segundos: payload.tempoSegundos,
      completou: payload.completou ? 1 : 0,
    };

    try {
      const r = await fetch(`${API_BASE}/?a=logicbugs.api&op=concluir-fase`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) return { sucesso: false, erro: `http_${r.status}` };
      return await r.json();
    } catch (e) {
      return { sucesso: false, erro: 'network' };
    }
  }

  /**
   * Backup via sendBeacon - garante delivery mesmo se aba fechar.
   * Chame em conjunto com submeterConclusao() pra robustez maxima.
   * sendBeacon aceita Blob com Content-Type configuravel.
   */
  enviarBeacon(payload: {
    faseId: number;
    movimentos: number;
    tempoSegundos: number;
    completou: boolean;
  }): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
    const body = JSON.stringify({
      fase_id: payload.faseId,
      movimentos: payload.movimentos,
      tempo_segundos: payload.tempoSegundos,
      completou: payload.completou ? 1 : 0,
    });
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(`${API_BASE}/?a=logicbugs.api&op=concluir-fase`, blob);
  }

  // -----------------------------------------------------------------
  // Leitura
  // -----------------------------------------------------------------

  async rankingGlobal(limite = 50, offset = 0): Promise<{
    items: ItemRankingGlobal[];
    total: number;
    minha_posicao: MinhaPosicao | null;
    logado: boolean;
  }> {
    return this.fetchJson('GET', { op: 'ranking-global', limite, offset });
  }

  async rankingFase(
    faseId: number,
    limite = 50,
    offset = 0,
  ): Promise<{
    items: ItemRankingFase[];
    total: number;
    fase: { id: number; nome: string; levelset: string } | null;
  }> {
    return this.fetchJson('GET', { op: 'ranking-fase', fase: faseId, limite, offset });
  }

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------

  private async fetchJson<T>(
    metodo: 'GET' | 'POST',
    params: Record<string, string | number>,
  ): Promise<T> {
    const url = new URL(`${API_BASE}/`);
    url.searchParams.set('a', 'logicbugs.api');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

    const r = await fetch(url.toString(), {
      method: metodo,
      credentials: 'include',
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  }
}
