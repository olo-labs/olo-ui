/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['src/**/*.test.{ts,tsx}'],
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8082',
                changeOrigin: true,
            },
            '/runtime-api': {
                target: 'http://localhost:7080',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/runtime-api/, '/api'); },
            },
        },
    },
});
