import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import checker from 'vite-plugin-checker';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    checker({
      vueTsc: {
        tsconfigPath: './tsconfig.app.json',
      },
    }),
  ],
  // typescript: {
  //   typeCheck: true,
  //   strict: true,
  //   tsConfig: {
  //     compilerOptions: {
  //       strict: true,
  //       allowJs: false,
  //     },
  //   },
  // },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
