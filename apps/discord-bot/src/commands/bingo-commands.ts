import {
  bingoCoordKey,
  indexBingoTilesByCoord,
  isBingoTileLockedForMember,
} from "@lootlog/domain/bingo";
import type { RpcBingoBoardSummary } from "@lootlog/rpc/api";
import { BINGO_BOARD_SIZE, type BingoBoardMode } from "@lootlog/schema/bingo";
import { escapeMarkdown, type SlashCommandSubcommandBuilder } from "discord.js";
import { Effect } from "effect";
import { BotConfig } from "#src/config/bot-config";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT } from "./command-messages.js";
import { memberSession } from "./lootlog-client.js";
import {
  choice,
  lootlogEmbed,
  MAX_AUTOCOMPLETE_CHOICES,
  npcTypeColor,
  openInLootlog,
  rankedLines,
  type CommandInvocation,
  type SlashCommand,
} from "./slash-command.js";

const BINGO_OPTION = "bingo";

const BINGO_COLOR = npcTypeColor("EVENT_HERO");

const RANKING_LIMIT = 15;

type BingoSummary = typeof RpcBingoBoardSummary.Type;

const selectBoard = (
  boards: ReadonlyArray<BingoSummary>,
  chosenId: string | null,
) => {
  if (chosenId !== null) return boards.find((board) => board.id === chosenId);

  return boards.find((board) => board.status === "ACTIVE") ?? boards[0];
};

const addBingoOptions = (subcommand: SlashCommandSubcommandBuilder) =>
  subcommand
    .addStringOption((option) =>
      option
        .setName(BINGO_OPTION)
        .setDescription(COMMAND_TEXT.bingo.boardOption)
        .setAutocomplete(true),
    )
    .addBooleanOption(visibilityOption);

const renderEmojiGrid = (
  tiles: ReadonlyArray<{
    readonly row: number;
    readonly col: number;
    readonly lockedByMemberId: number | null;
    readonly viewerProgress: {
      readonly currentCount: number;
      readonly completedAt: string | null;
    } | null;
  }>,
  mode: BingoBoardMode,
  viewerMemberId: number,
) => {
  const byCoord = indexBingoTilesByCoord(tiles);

  return Array.from({ length: BINGO_BOARD_SIZE }, (_, row) =>
    Array.from({ length: BINGO_BOARD_SIZE }, (_, col) => {
      const tile = byCoord.get(bingoCoordKey({ row, col }));

      if (!tile) return "⬜";

      if (isBingoTileLockedForMember(mode, tile, viewerMemberId)) return "🔒";

      if (tile.viewerProgress?.completedAt) return "🟩";

      if ((tile.viewerProgress?.currentCount ?? 0) > 0) return "🟨";

      return "⬛";
    }).join(""),
  ).join("\n");
};

const runBingoCommand = (invocation: CommandInvocation) =>
  Effect.gen(function* () {
    const { webAppUrl } = yield* BotConfig;
    const session = yield* memberSession(invocation);
    const { items: boards } = yield* session.api.listGuildBingoBoards;

    if (boards.length === 0) {
      return { content: COMMAND_TEXT.bingo.empty };
    }

    const selected = selectBoard(
      boards,
      invocation.options.string(BINGO_OPTION),
    );

    if (!selected) {
      return { content: COMMAND_TEXT.bingo.notFound };
    }

    const detail = yield* session.api.getGuildBingoBoard(selected.id);
    const boardPath = `/bingo/${encodeURIComponent(selected.id)}`;

    if (invocation.options.subcommand === "ranking") {
      if (detail.leaderboard.length === 0) {
        return {
          embeds: [
            lootlogEmbed(
              COMMAND_TEXT.bingo.rankingTitle(detail.board.name),
              BINGO_COLOR,
            ).setDescription(COMMAND_TEXT.bingo.rankingEmpty),
          ],
          components: openInLootlog(webAppUrl, invocation.guildId, boardPath),
        };
      }

      const lines = rankedLines(detail.leaderboard, {
        limit: RANKING_LIMIT,
        name: (entry) => escapeMarkdown(entry.member.name),
        detail: (entry) =>
          COMMAND_TEXT.bingo.rankingDetail(
            entry.totalPoints,
            entry.completedTileCount,
            entry.completedLines.length,
          ),
        isOwn: (entry) => entry.member.id === session.memberId,
        ownDiscordId: invocation.discordId,
      });

      return {
        embeds: [
          lootlogEmbed(
            COMMAND_TEXT.bingo.rankingTitle(detail.board.name),
            BINGO_COLOR,
          ).setDescription(lines.join("\n")),
        ],
        components: openInLootlog(webAppUrl, invocation.guildId, boardPath),
      };
    }

    const grid = renderEmojiGrid(
      detail.tiles,
      detail.board.mode,
      detail.viewerMemberId,
    );

    const summary = COMMAND_TEXT.bingo.progressSummary(
      detail.board.viewerCompletedTiles,
      detail.board.viewerCompletedLines,
      detail.board.viewerTotalPoints,
    );

    return {
      embeds: [
        lootlogEmbed(
          COMMAND_TEXT.bingo.boardTitle(detail.board.name),
          BINGO_COLOR,
        )
          .setDescription(
            `${summary}\n\n${grid}\n\n${COMMAND_TEXT.bingo.legend}`,
          )
          .setFooter({
            text: `${detail.board.world ?? "Wszystkie światy"} · ${detail.board.mode === "LOCKOUT" ? "Lockout" : "Wyścig solo"}`,
          }),
      ],
      components: openInLootlog(webAppUrl, invocation.guildId, boardPath),
    };
  });

export const bingoCommand: SlashCommand = {
  definition: guildCommand("bingo", COMMAND_TEXT.bingo.description)
    .addSubcommand((subcommand) =>
      addBingoOptions(
        subcommand
          .setName("tablica")
          .setDescription(COMMAND_TEXT.bingo.boardDescription),
      ),
    )
    .addSubcommand((subcommand) =>
      addBingoOptions(
        subcommand
          .setName("ranking")
          .setDescription(COMMAND_TEXT.bingo.rankingDescription),
      ),
    )
    .toJSON(),
  run: runBingoCommand,
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const { items: boards } = yield* session.api.listGuildBingoBoards;
      const query = invocation.focused.value.trim().toLowerCase();

      return boards
        .filter((board) =>
          query.length === 0 ? true : board.name.toLowerCase().includes(query),
        )
        .slice(0, MAX_AUTOCOMPLETE_CHOICES)
        .map((board) => choice(board.name, board.id));
    }).pipe(Effect.catchTag("CommandFailure", () => Effect.succeed([]))),
};
