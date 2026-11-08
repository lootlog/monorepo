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
  HttpApiEndpoint.put(
    "CharacterAurasControllerGrantAuras",
    "/character-auras/grants/game-accounts/:gameAccountId",
    {
      params: CharacterAuraGameAccountParams,
      success: HttpApiSchema.Empty(204),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_grantAuras")
    .annotate(OpenApi.Summary, "Grant character auras")
    .annotate(
      OpenApi.Description,
      "Let the user who last proved to play the Margonem account choose any aura; granting again changes nothing. Global chat admins only; 404 when no user proved to play the account",
    ),
  HttpApiEndpoint.delete(
    "CharacterAurasControllerRevokeAuras",
    "/character-auras/grants/game-accounts/:gameAccountId",
    {
      params: CharacterAuraGameAccountParams,
      success: HttpApiSchema.Empty(204),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_revokeAuras")
    .annotate(OpenApi.Summary, "Revoke character auras")
    .annotate(
      OpenApi.Description,
      "Withdraw the aura grant of the user who last proved to play the Margonem account and remove the aura they wear; global chat admins keep theirs. Global chat admins only; 404 when no user proved to play the account",
    ),
) {}
