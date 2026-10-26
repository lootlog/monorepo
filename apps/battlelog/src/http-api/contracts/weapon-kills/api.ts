/** Endpoints owned by the weapon-kills HTTP module. */
import { BadRequestResponse } from "../request-error.js";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";
import { BearerSecurityMiddleware } from "../battles/security.js";
import {
  CharacterWeaponKillsResponseDto_Output,
  RecordWeaponKillsDto,
  WeaponKillsControllerGetCharacterWeaponKillsPathParams,
  WeaponKillsDto_Output,
} from "./schemas.js";

export class WeaponKillsGroup extends HttpApiGroup.make("weapon-kills").add(
  HttpApiEndpoint.post(
    "WeaponKillsControllerRecordWeaponKills",
    "/weapon-kills",
    {
      payload: RecordWeaponKillsDto,
      error: BadRequestResponse,
      success: WeaponKillsDto_Output,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "WeaponKillsController_recordWeaponKills")
    .annotate(OpenApi.Summary, "Record finishing blows dealt with a weapon")
    .annotate(
      OpenApi.Description,
      "Credits the finishing blows the character dealt to players in the submitted battle log to its main weapon, and returns that weapon's counter. A resubmitted log counts once.",
    ),
  HttpApiEndpoint.get(
    "WeaponKillsControllerGetCharacterWeaponKills",
    "/weapon-kills/:world/:characterId",
    {
      params: WeaponKillsControllerGetCharacterWeaponKillsPathParams,
      error: BadRequestResponse,
      success: CharacterWeaponKillsResponseDto_Output,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "WeaponKillsController_getCharacterWeaponKills",
    )
    .annotate(OpenApi.Summary, "Get the weapon kill counters of a character"),
) {}
