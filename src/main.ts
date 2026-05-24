/**
 * main.ts — Entry point do Logic Bugs Web.
 *
 * Responsável apenas por:
 *   1. Encontrar o container raiz (#app)
 *   2. Instanciar Game
 *   3. Iniciar o jogo
 *
 * Toda lógica está nos módulos. Esse arquivo deve permanecer curto.
 */

import { Game } from './core/Game';

const containerRaiz = document.getElementById('app');
if (!containerRaiz) {
  throw new Error('Container raiz #app não encontrado no DOM.');
}

const jogo = new Game(containerRaiz);
jogo.iniciar();

// Expor o jogo no window pra debug em desenvolvimento (typecheck-safe).
if (import.meta.env.DEV) {
  (window as unknown as { __jogo: Game }).__jogo = jogo;
  console.log('[Logic Bugs] Jogo iniciado. Acesso debug: window.__jogo');
}
