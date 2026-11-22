import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeConfig } from "@/config/runtime-config";

const WALLPAPER_PATH = /^(?:wallpapers\/)?[a-z0-9-]+\.webp$/;

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
