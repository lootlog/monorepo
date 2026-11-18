import { createFileRoute } from "@tanstack/react-router";
import {
  apiServiceOrigin,
  isPublicApiService,
  type PublicApiService,
} from "@lootlog/schema/api-services";
import { getPortalEnvironment, requestHostname } from "~/lib/environment";
import {
  decodeReferenceDocument,
  presentReferenceDocument,
  type ReferenceDocument,
} from "~/lib/reference-document";
import main from "@lootlog/sdk/openapi/main.json";
import activity from "@lootlog/sdk/openapi/activity.json";
import battlelog from "@lootlog/sdk/openapi/battlelog.json";
import catalog from "@lootlog/sdk/openapi/catalog.json";
import search from "@lootlog/sdk/openapi/search.json";

const specs: Record<PublicApiService, ReferenceDocument> = {
  main: decodeReferenceDocument(main),
  activity: decodeReferenceDocument(activity),
  battlelog: decodeReferenceDocument(battlelog),
  catalog: decodeReferenceDocument(catalog),
  search: decodeReferenceDocument(search),
};

export const Route = createFileRoute("/openapi/$service")({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const service = params.service.replace(/\.json$/, "");

        if (!isPublicApiService(service))
          return new Response(null, { status: 404 });

        return Response.json(
          presentReferenceDocument(
            specs[service],
            service,
            apiServiceOrigin(
              service,
              getPortalEnvironment(requestHostname(request)),
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
