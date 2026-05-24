/**
 * Atmosfera.ts — Efeitos ambientais da tela inicial.
 *
 * Responsabilidades:
 *   1. Reveal on scroll: elementos com classe .revelar ganham .revelado quando
 *      entram na viewport (via IntersectionObserver).
 *   2. Parallax leve no cenário de fundo (silhuetas + vagalumes) acompanhando
 *      o scroll da tela inicial — efeito de profundidade.
 *   3. Respeita prefers-reduced-motion: pula parallax e revela tudo de uma vez.
 *
 * Lifecycle: iniciarAtmosfera(raiz) ao montar a tela inicial,
 *            pararAtmosfera() ao destruir.
 */

let observer: IntersectionObserver | null = null;
let onScroll: (() => void) | null = null;
let rafId = 0;

const reduzMovimento = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function iniciarAtmosfera(raiz: HTMLElement): void {
  pararAtmosfera();

  // Marca o body pra CSS poder ajustar #app (justify-content etc)
  document.body.classList.add('home-ativa');

  // ---- Reveal on scroll ----
  const alvos = raiz.querySelectorAll<HTMLElement>('.revelar');

  if (reduzMovimento() || !('IntersectionObserver' in window)) {
    // Sem animação: revela tudo imediatamente
    alvos.forEach(el => el.classList.add('revelado'));
  } else {
    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revelado');
            observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );
    alvos.forEach(el => observer!.observe(el));
  }

  // ---- Parallax do cenário ----
  // Vagalumes drift lento; silhuetas frente/fundo. Aplica via CSS variables
  // que cascateiam pro .cenario-fundo (definido em main.css).
  if (reduzMovimento()) return;

  const cenario = document.querySelector<HTMLElement>('.cenario-fundo');
  if (!cenario) return;

  onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset || 0;
      // Valores pequenos pra não competir com o conteúdo
      cenario.style.setProperty('--par-bg',   `${y * -0.08}px`);
      cenario.style.setProperty('--par-mid',  `${y * -0.18}px`);
      cenario.style.setProperty('--par-front',`${y * -0.32}px`);
      rafId = 0;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function pararAtmosfera(): void {
  document.body.classList.remove('home-ativa');

  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (onScroll) {
    window.removeEventListener('scroll', onScroll);
    onScroll = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  // Reseta o parallax pra não vazar pra outras telas
  const cenario = document.querySelector<HTMLElement>('.cenario-fundo');
  if (cenario) {
    cenario.style.removeProperty('--par-bg');
    cenario.style.removeProperty('--par-mid');
    cenario.style.removeProperty('--par-front');
  }
}
