import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeConfig } from "@/config/runtime-config";

// Wallpaper files only, such as `rias-bg.webp` or `wallpapers/anime-sky-bg.webp`.
const WALLPAPER_PATH = /^(?:wallpapers\/)?[a-z0-9-]+\.webp$/;

/**
 * Theme wallpapers belong to the Web app, which serves them from `/themes/`.
 * The shared theme styles name them by that path, so the wiki passes them on.
 */
export const Route = createFileRoute("/themes/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";

        if (!WALLPAPER_PATH.test(path)) {
          return new Response(null, { status: 404 });
        }

        const { webAppUrl } = await getRuntimeConfig();
        const response = await fetch(new URL(`/themes/${path}`, webAppUrl));

        if (!response.ok) {
          return new Response(null, { status: response.status });
        }

        return new Response(response.body, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
