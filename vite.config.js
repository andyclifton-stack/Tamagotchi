import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Tamagotchi/',
  server: {
    port: 5175
  },
  test: {
    environment: 'node'
  }
});
