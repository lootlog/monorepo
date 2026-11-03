import { createFileRoute } from "@tanstack/react-router";
import { getPortalEnvironment } from "~/lib/environment";
import {
  referenceDocumentSchema,
  presentReferenceDocument,
} from "~/lib/reference-document";
import main from "@lootlog/sdk/openapi/main.json";
import activity from "@lootlog/sdk/openapi/activity.json";
import battlelog from "@lootlog/sdk/openapi/battlelog.json";
import search from "@lootlog/sdk/openapi/search.json";

const specs = {
  main: referenceDocumentSchema.parse(main),
  activity: referenceDocumentSchema.parse(activity),
  battlelog: referenceDocumentSchema.parse(battlelog),
  search: referenceDocumentSchema.parse(search),
};

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
          presentReferenceDocument(
            specs[service],
            service,
            environment[service],
          ),
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
