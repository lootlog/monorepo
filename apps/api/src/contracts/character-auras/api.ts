import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
  UpdateOwnCharacterAuraRequest,
} from "./schemas.js";

export class CharacterAurasGroup extends HttpApiGroup.make(
  "character-auras",
).add(
  HttpApiEndpoint.get("CharacterAurasControllerGetAuras", "/character-auras", {
    success: CharacterAurasResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_getAuras")
    .annotate(OpenApi.Summary, "Get character auras")
    .annotate(
      OpenApi.Description,
      "List every Margonem character that wears an aura, with its account, for any signed-in user; the list names no Lootlog user",
    ),
  HttpApiEndpoint.get(
    "CharacterAurasControllerGetOwnAura",
    "/users/@me/character-aura",
    { success: OwnCharacterAuraResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_getOwnAura")
    .annotate(OpenApi.Summary, "Get own character aura")
    .annotate(
      OpenApi.Description,
      "Retrieve the auras the characters of the authenticated user wear and whether they may choose one",
    ),
  HttpApiEndpoint.put(
    "CharacterAurasControllerUpdateOwnAura",
    "/users/@me/character-aura",
    {
      payload: UpdateOwnCharacterAuraRequest,
      success: OwnCharacterAuraResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_updateOwnAura")
    .annotate(OpenApi.Summary, "Update own character aura")
    .annotate(
      OpenApi.Description,
      "Choose the aura one Margonem character of the authenticated user wears, or remove it with null; fails with 403 when choosing one without access to auras, a personal aura not granted to the user, or for a character on an account the user did not prove to play",
    ),
) {}
