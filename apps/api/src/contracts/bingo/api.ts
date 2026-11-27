import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  BingoBoardDetailResponse,
  BingoBoardListResponse,
  BingoBoardPath,
  BingoBoardSummaryResponse,
  BingoGuildPath,
  BingoMutationResponse,
  BingoTilePath,
  CreateBingoBoardRequest,
  ReplaceBingoTilesRequest,
  UpdateBingoBoardRequest,
  UpdateBingoTileProgressRequest,
} from "./schemas.js";

export class BingoGroup extends HttpApiGroup.make("bingo").add(
  HttpApiEndpoint.get("BingoControllerListBoards", "/guilds/:guildId/bingo", {
    params: BingoGuildPath,
    success: BingoBoardListResponse,
    error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BingoController_listBoards")
    .annotate(OpenApi.Summary, "List organization Bingo boards"),
  HttpApiEndpoint.post("BingoControllerCreateBoard", "/guilds/:guildId/bingo", {
    params: BingoGuildPath,
    payload: CreateBingoBoardRequest,
    success: BingoBoardDetailResponse.pipe(HttpApiSchema.status(201)),
    error: HttpErrorResponse.pipe(HttpApiSchema.status(400)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BingoController_createBoard")
    .annotate(OpenApi.Summary, "Create organization Bingo board"),
  HttpApiEndpoint.get(
    "BingoControllerGetBoard",
    "/guilds/:guildId/bingo/:boardId",
    {
      params: BingoBoardPath,
      success: BingoBoardDetailResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BingoController_getBoard")
    .annotate(OpenApi.Summary, "Get organization Bingo board details"),
  HttpApiEndpoint.patch(
    "BingoControllerUpdateBoard",
    "/guilds/:guildId/bingo/:boardId",
    {
      params: BingoBoardPath,
      payload: UpdateBingoBoardRequest,
      success: BingoBoardSummaryResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BingoController_updateBoard")
    .annotate(OpenApi.Summary, "Update organization Bingo board settings"),
  HttpApiEndpoint.delete(
    "BingoControllerDeleteBoard",
    "/guilds/:guildId/bingo/:boardId",
    {
      params: BingoBoardPath,
      success: BingoMutationResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BingoController_deleteBoard")
    .annotate(OpenApi.Summary, "Delete organization Bingo board"),
  HttpApiEndpoint.put(
    "BingoControllerReplaceTiles",
    "/guilds/:guildId/bingo/:boardId/tiles",
    {
      params: BingoBoardPath,
      payload: ReplaceBingoTilesRequest,
      success: BingoBoardDetailResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BingoController_replaceTiles")
    .annotate(OpenApi.Summary, "Configure Bingo 5x5 board tiles"),
  HttpApiEndpoint.post(
    "BingoControllerUpdateTileProgress",
    "/guilds/:guildId/bingo/:boardId/tiles/:tileId/progress",
    {
      params: BingoTilePath,
      payload: UpdateBingoTileProgressRequest,
      success: BingoBoardDetailResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BingoController_updateTileProgress")
    .annotate(
      OpenApi.Summary,
      "Manually update a member's Bingo tile progress",
    ),
) {}
