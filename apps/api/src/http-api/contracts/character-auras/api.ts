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
  PersonalCharacterAuraGrantParams,
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
  HttpApiEndpoint.put(
    "CharacterAurasControllerGrantPersonalAura",
    "/character-auras/grants/game-accounts/:gameAccountId/personal-auras/:auraId",
    {
      params: PersonalCharacterAuraGrantParams,
      success: HttpApiSchema.Empty(204),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_grantPersonalAura")
    .annotate(OpenApi.Summary, "Grant a personal character aura")
    .annotate(
      OpenApi.Description,
      "Let the user who last proved to play the Margonem account choose one personal aura, which a grant of auras in general does not cover; granting again changes nothing, and revoking the user's auras withdraws it. Global chat admins only; 404 when no user proved to play the account",
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
      "Withdraw the aura grant and every personal aura grant of the user who last proved to play the Margonem account and remove the auras they wear; global chat admins keep theirs. Global chat admins only; 404 when no user proved to play the account",
    ),
) {}
