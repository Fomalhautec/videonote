import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';
  return {
    plugins: [
      react(),
      ...(isElectron ? [
        electron([
          { entry: 'electron/main.ts', vite: { build: { outDir: 'dist-electron', rollupOptions: { external: ['electron'] } } } },
          { entry: 'electron/preload.ts', onstart(args) { args.reload(); }, vite: { build: { outDir: 'dist-electron', rollupOptions: { external: ['electron'] } } } },
        ]),
        electronRenderer(),
      ] : []),
    ],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    optimizeDeps: { include: ['jspdf'] },
    build: {
      commonjsOptions: { include: [/node_modules/], transformMixedEsModules: true },
      rollupOptions: { external: ['docx'] },
    },
  };
});
