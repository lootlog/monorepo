/** Endpoints owned by the character-auras HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  CharacterAuraGameAccountParams,
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
  UpdateOwnCharacterAuraRequest,
} from "#src/contracts/character-auras/schemas";

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
      "List every Margonem account whose characters wear an aura, for any signed-in user; the list names no Lootlog user",
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
      "Retrieve the aura the authenticated user wears, whether they may choose one, and the Margonem accounts it shows on",
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
      "Choose the aura the authenticated user wears, or remove it with null; choosing one fails with 403 for users without access to auras",
    ),
  HttpApiEndpoint.put(
    "CharacterAurasControllerLinkGameAccount",
    "/users/@me/character-aura/game-accounts/:gameAccountId",
    {
      params: CharacterAuraGameAccountParams,
      success: OwnCharacterAuraResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_linkGameAccount")
    .annotate(OpenApi.Summary, "Show own aura on a Margonem account")
    .annotate(
      OpenApi.Description,
      "Deprecated: an aura shows on the Margonem accounts its user proved to play when the Game client connected, so this changes nothing. Returns the own aura, or 403 while the user wears no aura they may use",
    )
    .annotate(OpenApi.Deprecated, true),
) {}
