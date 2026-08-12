import { resolve } from "node:path";
import dts from "vite-plugin-dts";
import { defineConfig } from "vite";

export default defineConfig(() => {
  const DEV_ALIAS = process.env.XPELL_DEV_ALIAS === "1";

  return {
    server: { port: 3001 },

    build: {
      lib: {
        entry: "./src/index.ts",
        name: "XpellUI",
        formats: ["es", "cjs"], // drop UMD unless you really need it
        fileName: (format) => `xpell-ui.${format}.js`,
      },
      target: "es2022",
      minify: true,
      outDir: "dist",
      rollupOptions: {
        external: ["xpell-core","animate.css"], // keep animate.css here only if it's a peer dep + you really want it external
        output: {
          exports: "named",
          codeSplitting: false,
        },
      },
    },

    resolve: {
      alias: DEV_ALIAS
        ? { "xpell-ui": resolve(import.meta.dirname, "src/index.ts") }
        : {},
    },

    plugins: [
      dts({
        tsconfigPath: "./tsconfig.types.json",
        outputDir: "dist/types",
        insertTypesEntry: true,
        rollupTypes: false,
        staticImport: true,
        skipDiagnostics: false,
        logDiagnostics: true,
        exclude: ["public", "examples", "example", "**/dist", "**/types"],
      }), 
    ],
  };
});
