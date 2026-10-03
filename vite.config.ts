import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function storybookIndexRoute() {
  const rewrite = (request: { url?: string }, _response: unknown, next: () => void) => {
    if (request.url === "/storybook" || request.url === "/storybook/") request.url = "/storybook/index.html";
    next();
  };
  return {
    name: "storybook-index-route",
    configureServer(server: { middlewares: { use: (handler: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [react(), storybookIndexRoute()],
  // GitHub Pages builds pass their repository base path on the Vite CLI.
  // Local development and custom root domains keep Vite's default "/" base.
  server: { host: true },
});
