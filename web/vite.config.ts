import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev, "/api" goes to the Go backend (go run ./cmd/api in ../backend).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
});
