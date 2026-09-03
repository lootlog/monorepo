/** Endpoints owned by the npcs HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  NpcsControllerGetNpcs200,
  NpcsControllerGetNpcsQuery,
} from "./schemas.js";

export class NPCsGroup extends HttpApiGroup.make("NPCs").add(
  HttpApiEndpoint.get("NpcsControllerGetNpcs", "/npcs", {
    query: NpcsControllerGetNpcsQuery,
    success: NpcsControllerGetNpcs200,
  })
    .annotate(OpenApi.Identifier, "NpcsController_getNpcs")
    .annotate(OpenApi.Summary, "Search NPCs by name"),
) {}
