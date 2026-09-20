import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        // UI components (Canvas, NodeComponent, App) are covered by E2E tests,
        // not unit tests — thresholds reflect unit-testable business logic only.
        lines: 25,
        functions: 30,
        branches: 30,
        statements: 25,
      },
    },
  },
});
