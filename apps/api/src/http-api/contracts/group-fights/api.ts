/** Endpoints owned by the group fights ("ustawki") HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  CreateGroupFightRequest,
  CreateGroupFightResponse,
  GroupFightDetailResponse,
  GroupFightOrganizationPath,
  GroupFightPath,
  GuildGroupFightRankingQuery,
  GuildGroupFightRankingResponse,
  GuildGroupFightsQuery,
  GuildGroupFightsResponse,
} from "#src/contracts/group-fights/schemas";

const guildErrors = [403, 404].map((status) =>
  HttpErrorResponse.pipe(HttpApiSchema.status(status)),
);

export class GroupFightsGroup extends HttpApiGroup.make("group-fights").add(
  HttpApiEndpoint.post(
    "GroupFightsControllerCreateGroupFight",
    "/group-fights",
    {
      payload: CreateGroupFightRequest,
      success: CreateGroupFightResponse.pipe(HttpApiSchema.status(201)),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(400)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GroupFightsController_createGroupFight")
    .annotate(OpenApi.Summary, "Record a group PvP fight")
    .annotate(
      OpenApi.Description,
      "Records a players-versus-players group fight observed by the game client. Guilds are auto-detected from the character catching configuration and each guild applies its own collection mode.",
    ),
  HttpApiEndpoint.get(
    "GroupFightsControllerGetGuildGroupFightRanking",
    "/guilds/:guildId/group-fights/ranking",
    {
      params: GroupFightOrganizationPath,
      query: GuildGroupFightRankingQuery,
      success: GuildGroupFightRankingResponse,
      error: guildErrors,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "GroupFightsController_getGuildGroupFightRanking",
    )
    .annotate(OpenApi.Summary, "Get the guild group fight ranking")
    .annotate(
      OpenApi.Description,
      "Aggregates wins, losses, draws and time spent in group fights per organization member.",
    ),
  HttpApiEndpoint.get(
    "GroupFightsControllerGetGuildGroupFights",
    "/guilds/:guildId/group-fights",
    {
      params: GroupFightOrganizationPath,
      query: GuildGroupFightsQuery,
      success: GuildGroupFightsResponse,
      error: guildErrors,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GroupFightsController_getGuildGroupFights")
    .annotate(OpenApi.Summary, "List guild group fights"),
  HttpApiEndpoint.get(
    "GroupFightsControllerGetGuildGroupFight",
    "/guilds/:guildId/group-fights/:fightId",
    {
      params: GroupFightPath,
      success: GroupFightDetailResponse,
      error: guildErrors,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GroupFightsController_getGuildGroupFight")
    .annotate(OpenApi.Summary, "Get a single guild group fight"),
) {}
