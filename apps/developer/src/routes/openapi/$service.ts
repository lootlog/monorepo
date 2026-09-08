import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getPortalEnvironment } from "~/lib/environment";
import main from "@lootlog/sdk/openapi/main.json";
import activity from "@lootlog/sdk/openapi/activity.json";
import battlelog from "@lootlog/sdk/openapi/battlelog.json";
import search from "@lootlog/sdk/openapi/search.json";
const specs = { main, activity, battlelog, search };
const schema = z.looseObject({
  openapi: z.string(),
  paths: z.record(z.string(), z.unknown()),
});
export const Route = createFileRoute("/openapi/$service")({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const service = params.service.replace(/\.json$/, "");
        if (
          service !== "main" &&
          service !== "activity" &&
          service !== "battlelog" &&
          service !== "search"
        )
          return new Response(null, { status: 404 });
        const host =
          request.headers.get("host")?.split(":")[0] ??
          new URL(request.url).hostname;
        const environment = getPortalEnvironment(host);
        return Response.json(
          {
            ...schema.parse(specs[service]),
            servers: [{ url: environment[service] }],
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
