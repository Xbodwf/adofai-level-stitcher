import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import legacy from "@vitejs/plugin-legacy"
import htmlPostBuildPlugin from "./no-attr"
import absoluteToRelativePathPlugin from "./absolute-to-relative-path"

const base = "./"
// https://vite.dev/config/
export default defineConfig({
  base: base, // Set base explicitly for Vite
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "not IE 11"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
    }),
    absoluteToRelativePathPlugin(base), // Add the new plugin before htmlPostBuildPlugin
    htmlPostBuildPlugin(base),
  ],
})