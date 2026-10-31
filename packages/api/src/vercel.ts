import { createApp } from './server.js';

/**
 * Entrypoint da Vercel Services (framework express, §16.2): exporta o app
 * Express como default. Init no load do módulo (uma vez por instância Fluid);
 * falha de init não fica em cache — a próxima invocação refaz o cold start.
 */
const created = await createApp();

export default created.app;
