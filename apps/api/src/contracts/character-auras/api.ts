import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  CharacterAuraGrantUserParams,
  CharacterAuraGrantHoldersResponse,
  CharacterAuraGrantsResponse,
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
  PersonalCharacterAuraGrantParams,
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
  HttpApiEndpoint.get(
    "CharacterAurasControllerListGrantHolders",
    "/character-auras/grants",
    {
      success: CharacterAuraGrantHoldersResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_listGrantHolders")
    .annotate(OpenApi.Summary, "List character aura grant holders")
    .annotate(
      OpenApi.Description,
      "List every user holding the grant of auras in general or a personal aura, with what they hold. Lootlog admins (the `admin` platform role) only",
    ),
  HttpApiEndpoint.get(
    "CharacterAurasControllerGetGrants",
    "/character-auras/grants/users/:userId",
    {
      params: CharacterAuraGrantUserParams,
      success: CharacterAuraGrantsResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_getGrants")
    .annotate(OpenApi.Summary, "Get character aura grants")
    .annotate(
      OpenApi.Description,
      "Show which auras the user may choose: whether they are a Lootlog admin, hold the grant of auras in general, and which personal auras they were granted. Lootlog admins (the `admin` platform role) only",
    ),
  HttpApiEndpoint.put(
    "CharacterAurasControllerGrantAuras",
    "/character-auras/grants/users/:userId",
    {
      params: CharacterAuraGrantUserParams,
      success: HttpApiSchema.Empty(204),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_grantAuras")
    .annotate(OpenApi.Summary, "Grant character auras")
    .annotate(
      OpenApi.Description,
      "Let the user choose any aura on the characters of the Margonem accounts they proved to play; granting again changes nothing. Lootlog admins (the `admin` platform role) only",
    ),
  HttpApiEndpoint.put(
    "CharacterAurasControllerGrantPersonalAura",
    "/character-auras/grants/users/:userId/personal-auras/:auraId",
    {
      params: PersonalCharacterAuraGrantParams,
      success: HttpApiSchema.Empty(204),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_grantPersonalAura")
    .annotate(OpenApi.Summary, "Grant a personal character aura")
    .annotate(
      OpenApi.Description,
      "Let the user choose one personal aura, which a grant of auras in general does not cover; granting again changes nothing, and revoking the user's auras withdraws it. Lootlog admins (the `admin` platform role) only",
    ),
  HttpApiEndpoint.delete(
    "CharacterAurasControllerRevokeAuras",
    "/character-auras/grants/users/:userId",
    {
      params: CharacterAuraGrantUserParams,
      success: HttpApiSchema.Empty(204),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "CharacterAurasController_revokeAuras")
    .annotate(OpenApi.Summary, "Revoke character auras")
    .annotate(
      OpenApi.Description,
      "Withdraw the aura grant and every personal aura grant of the user and remove the auras they wear; Lootlog admins keep theirs. Lootlog admins (the `admin` platform role) only",
    ),
) {}
