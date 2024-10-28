import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001
  },
  build: {
    lib: {
      entry: "./src/index.ts", // Entry file for your library
      name: 'Xpell',         // Name of the global variable for UMD builds
      formats: ['es', 'umd', 'cjs'], // Output formats
      fileName: format => `xpell-js.${format}.js` // File name format for different builds
    },
    target: 'modules',
    minify: true, // Minify the output
    outDir: "dist", // Output directory
    rollupOptions: {
      output: {
        globals: {},  // Add any external libraries here if needed
        exports: 'named', // Export all named exports
      }
    }
  },
  resolve: {
    alias: {
      'xpell': resolve(__dirname, 'node_modules/xpell-js') // Alias for internal use
    }
  },
  plugins: [
    dts({
      outputDir: ['types'], // Output directory for type definitions
      exclude: ['src/ignore', 'public'], // Exclude certain directories from typings
      staticImport: true,
      skipDiagnostics: false,
      logDiagnostics: true,
      rollupTypes: true,
      insertTypesEntry: true
    })
  ]
});
