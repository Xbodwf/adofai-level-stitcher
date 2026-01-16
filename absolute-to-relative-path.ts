import type { Plugin } from "vite"

/**
 * Vite plugin to convert absolute paths in CSS/JSX/TSX to relative paths
 * This ensures that when files are opened directly (double-click HTML),
 * all asset references work correctly
 */
function absoluteToRelativePathPlugin(base = "."): Plugin {
  return {
    name: "absolute-to-relative-path",
    enforce: "post",
    apply: "build",

    generateBundle(_options, bundle) {
      // Process all chunks (JS/JSX/TSX compiled output)
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === "chunk") {
          // Replace absolute paths starting with / to relative paths
          let code = chunk.code

          // Match common asset import patterns in built code
          // Example: "/assets/logo.png" -> "./assets/logo.png"
          code = code.replace(
            /(['"`])\/(?!\/|https?:\/\/)([\w\-/.]+\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|mp3|mp4|webm|pdf))\1/gi,
            (match, quote, assetPath) => {
              return `${quote}${base === "." ? "./" : base + "/"}${assetPath}${quote}`
            },
          )

          chunk.code = code
        } else if (chunk.type === "asset" && fileName.endsWith(".css")) {
          // Process CSS files
          let css = chunk.source as string

          // Replace url() references: url(/assets/...) -> url(./assets/...)
          css = css.replace(/url$$(['"`]?)\/(?!\/|https?:\/\/)([\w\-/.]+)\1$$/gi, (match, quote, assetPath) => {
            const prefix = base === "." ? "./" : base + "/"
            return `url(${quote}${prefix}${assetPath}${quote})`
          })

          // Replace @import with absolute paths
          css = css.replace(/@import\s+(['"`])\/(?!\/|https?:\/\/)([\w\-/.]+)\1/gi, (match, quote, importPath) => {
            const prefix = base === "." ? "./" : base + "/"
            return `@import ${quote}${prefix}${importPath}${quote}`
          })

          chunk.source = css
        }
      }
    },

    // Also transform during the transform hook for development consistency
    transform(code, id) {
      // Only process CSS, JSX, TSX files
      if (!/\.(css|jsx|tsx)$/.test(id)) {
        return null
      }

      // For CSS files
      if (id.endsWith(".css")) {
        let transformedCode = code

        // Replace url() with absolute paths
        transformedCode = transformedCode.replace(
          /url$$(['"`]?)\/(?!\/|https?:\/\/)([\w\-/.]+)\1$$/gi,
          (match, quote, assetPath) => {
            return `url(${quote}/${assetPath}${quote})`
          },
        )

        return {
          code: transformedCode,
          map: null,
        }
      }

      return null
    },
  }
}

export default absoluteToRelativePathPlugin
