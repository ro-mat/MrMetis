import { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Only scripts from our own origin may run, so injected markup can't run code that uses the data key.
// Build only: the dev server's HMR relies on inline scripts. Styles stay inline for MUI/emotion.
const contentSecurityPolicy = (): Plugin => {
  let apiRoot = "/";
  return {
    name: "content-security-policy",
    apply: "build",
    configResolved: (config) => {
      apiRoot = config.env.VITE_API_ROOT ?? apiRoot;
    },
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: {
          "http-equiv": "Content-Security-Policy",
          content: [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            // a relative api root is already covered by 'self'
            `connect-src 'self' ${URL.canParse(apiRoot) ? new URL(apiRoot).origin : ""}`.trim(),
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'self'",
          ].join("; "),
        },
        injectTo: "head-prepend",
      },
    ],
  };
};

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    proxy: {
      // local API (dotnet run); its self-signed dev certificate is accepted here
      "/api": {
        target: "https://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "src/setupTests.ts",
  },
});
