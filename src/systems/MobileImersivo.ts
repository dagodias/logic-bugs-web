/**
 * MobileImersivo.ts — Detecta mobile e força tela cheia + orientação paisagem.
 *
 * Em devices touch, o ideal é:
 *   - Rodar em fullscreen (sem barra do browser)
 *   - Travar orientação em landscape
 *   - Mostrar overlay quando o usuário gira pra portrait
 *
 * Limitações conhecidas:
 *   - iOS Safari NÃO suporta screen.orientation.lock — só Android + PWA
 *   - Fullscreen + lock requerem user gesture (chamar dentro de click)
 *
 * Estratégia: tentar travar; se falhar, o overlay-rotacao no DOM
 * cuida do feedback via media query CSS.
 */

export function ehTouch(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function estaPortrait(): boolean {
  return window.matchMedia('(orientation: portrait)').matches;
}

/** Tenta entrar em fullscreen + travar landscape. Silencioso em caso de erro. */
export async function entrarModoImersivo(): Promise<void> {
  if (!ehTouch()) return;

  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
    }
  } catch {
    /* fullscreen pode falhar (gesto inválido, suporte ausente) — segue */
  }

  try {
    const so = screen.orientation as ScreenOrientation & {
      lock?: (o: 'landscape' | 'portrait' | 'any' | 'natural') => Promise<void>;
    };
    if (so?.lock) {
      await so.lock('landscape');
    }
  } catch {
    /* lock pode falhar (iOS Safari, permissão) — overlay-rotacao pega o caso */
  }
}
