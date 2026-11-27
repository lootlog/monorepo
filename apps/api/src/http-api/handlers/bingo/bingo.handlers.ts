import { Capability } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { BingoData } from "#src/bingo/bingo-data";
import {
  BingoBoardDetailResponse,
  BingoBoardListResponse,
  BingoBoardSummaryResponse,
  BingoMutationResponse,
} from "#src/contracts/bingo/schemas";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import type { BingoViewer } from "#src/bingo/bingo-read";
import {
  type OrganizationWorkspaceGuildAccess,
  decode,
  requireGuild,
  toOrganizationWorkspaceHttpResponse,
} from "#src/http-api/access/organization-workspace.access";
import { LootlogApi } from "../../lootlog-api.js";

const READ_BINGO_REQUIREMENT = [Capability.LOOTLOG_ACCESS] as const;

const MANAGE_BINGO_REQUIREMENT = {
  anyOf: [
    Capability.ADMIN,
    Capability.LOOTLOG_MANAGE,
    Capability.LOOTLOG_EVENTS_MANAGE,
  ],
} as const;

const toBingoViewer = (
  access: OrganizationWorkspaceGuildAccess,
): BingoViewer => ({
  discordId: access.discordId,
  permissions: access.permissions,
});

const runBingo = <A>(effect: Effect.Effect<A, unknown>) =>
  effect.pipe(
    Effect.mapError(
      (cause) => new OrganizationWorkspaceOperationError({ cause }),
    ),
  );

export const BingoHandlers = HttpApiBuilder.group(
  LootlogApi,
  "bingo",
  Effect.fn(function* (handlers) {
    const bingo = yield* BingoData;

    return handlers.handleAll({
      BingoControllerListBoards: ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          Effect.gen(function* () {
            const access = yield* requireGuild(
              params.guildId,
              READ_BINGO_REQUIREMENT,
            );

            const result = yield* runBingo(
              bingo.listBoards(access.guildId, toBingoViewer(access)),
            );

            return yield* decode(BingoBoardListResponse, result);
          }),
        ),
      BingoControllerCreateBoard: ({ params, payload }) =>
        toOrganizationWorkspaceHttpResponse(
          Effect.gen(function* () {
            const access = yield* requireGuild(
              params.guildId,
              MANAGE_BINGO_REQUIREMENT,
            );

            const result = yield* runBingo(
              bingo.createBoard(access.guildId, toBingoViewer(access), payload),
            );

            return yield* decode(BingoBoardDetailResponse, result);
          }),
        ),
      BingoControllerGetBoard: ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          Effect.gen(function* () {
            const access = yield* requireGuild(
              params.guildId,
              READ_BINGO_REQUIREMENT,
            );

            const result = yield* runBingo(
              bingo.getBoard(
                access.guildId,
                params.boardId,
                toBingoViewer(access),
              ),
            );

            return yield* decode(BingoBoardDetailResponse, result);
          }),
        ),
      BingoControllerUpdateBoard: ({ params, payload }) =>
        toOrganizationWorkspaceHttpResponse(
          Effect.gen(function* () {
            const access = yield* requireGuild(
              params.guildId,
              MANAGE_BINGO_REQUIREMENT,
            );

            const result = yield* runBingo(
              bingo.updateBoard(
                access.guildId,
                params.boardId,
                toBingoViewer(access),
                payload,
              ),
            );

            return yield* decode(BingoBoardSummaryResponse, result);
          }),
        ),
      BingoControllerDeleteBoard: ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          Effect.gen(function* () {
            const access = yield* requireGuild(
              params.guildId,
              MANAGE_BINGO_REQUIREMENT,
            );

            const result = yield* runBingo(
              bingo.deleteBoard(access.guildId, params.boardId),
            );

            return yield* decode(BingoMutationResponse, result);
          }),
        ),
      BingoControllerReplaceTiles: ({ params, payload }) =>
        toOrganizationWorkspaceHttpResponse(
          Effect.gen(function* () {
            const access = yield* requireGuild(
              params.guildId,
              MANAGE_BINGO_REQUIREMENT,
            );

            const result = yield* runBingo(
              bingo.replaceTiles(
                access.guildId,
                params.boardId,
                toBingoViewer(access),
                payload,
              ),
            );

            return yield* decode(BingoBoardDetailResponse, result);
          }),
        ),
      BingoControllerUpdateTileProgress: ({ params, payload }) =>
        toOrganizationWorkspaceHttpResponse(
          Effect.gen(function* () {
            const access = yield* requireGuild(
              params.guildId,
              MANAGE_BINGO_REQUIREMENT,
            );

            const result = yield* runBingo(
              bingo.updateTileProgress(
                access.guildId,
                params.boardId,
                params.tileId,
                toBingoViewer(access),
                payload,
              ),
            );

            return yield* decode(BingoBoardDetailResponse, result);
          }),
        ),
    });
  }),
);
