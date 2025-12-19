/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",
    
    // Global test setup
    globals: true,
    
    // Include patterns for test files
    include: [
      "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    
    // Exclude patterns
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/client/**", // Client tests would need different environment
    ],
    
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["server/**/*.ts"],
      exclude: [
        "server/**/*.test.ts",
        "server/**/*.spec.ts",
        "server/index.ts",
        "server/vite.ts",
      ],
    },
    
    // Timeout for tests (10 seconds)
    testTimeout: 10000,
    
    // Hook timeout (10 seconds)
    hookTimeout: 10000,
    
    // Reporter options
    reporters: ["verbose"],
    
    // Mock clear/restore behavior
    clearMocks: true,
    restoreMocks: true,
  },
  
  // Path resolution (matches vite.config.ts)
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server"),
    },
  },
});

