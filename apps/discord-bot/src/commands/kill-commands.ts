import { escapeMarkdown } from "discord.js";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { Effect, Schema } from "effect";
import { BotConfig } from "#src/config/bot-config";
import {
  guildCommand,
  periodOption,
  readPeriod,
  visibilityOption,
} from "./command-builders.js";
import {
  COMMAND_TEXT,
  PERIOD_LABELS,
  npcTypeLabel,
} from "./command-messages.js";
import { memberSession, type MemberSession } from "./lootlog-client.js";
import {
  choice,
  lootlogEmbed,
  MAX_AUTOCOMPLETE_CHOICES,
  openInLootlog,
  npcTypeColor,
  rankedLines,
  VISIBILITY_OPTION,
  type CommandInvocation,
  type SlashCommand,
} from "./slash-command.js";

const RANKING_LIMIT = 15;

const NPC_KILLERS_LIMIT = 10;

// The largest page the API serves, so the invoker is found beyond the top.
const NPC_KILLERS_LOOKUP = 100;

const RANKED_NPC_TYPES = [
  "ELITE2",
  "HERO",
  "TITAN",
  "COLOSSUS",
  "EVENT_HERO",
] as const;

const GuildKillStats = Schema.Struct({
  overview: Schema.Struct({ guildUniqueKills: Schema.Number }),
  memberRanking: Schema.Array(
    Schema.Struct({
      memberName: Schema.String,
      // A Member's `userId` is the Discord identity of that Member.
      memberUserId: Schema.String,
      totalParticipations: Schema.Number,
      participationsByType: Schema.Record(Schema.String, Schema.Number),
    }),
  ),
});

const TopNpcs = Schema.Struct({
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: Schema.Number,
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Number,
    }),
  ),
});

// An NPC without visible kills answers `{ npc: null, killers: [] }`.
const NpcKillers = Schema.Struct({
  npc: Schema.NullOr(
    Schema.Struct({
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Number,
      npcIcon: Schema.NullOr(Schema.String),
      uniqueGuildKills: Schema.Number,
      totalMemberParticipations: Schema.Number,
    }),
  ),
  killers: Schema.Array(
    Schema.Struct({
      memberName: Schema.String,
      memberUserId: Schema.String,
      participationCount: Schema.Number,
    }),
  ),
});

const killStatsPath = (guildId: string) =>
  `/guilds/${encodeURIComponent(guildId)}/stats/kills`;

/** NPCs this Lootlog has killed, matching what a player typed so far. */
export const searchKilledNpcs = (session: MemberSession, search: string) =>
  session
    .api(
      `${killStatsPath(session.guildId)}/top-npcs`,
      {
        limit: MAX_AUTOCOMPLETE_CHOICES,
        search,
        world: "",
        minLvl: "",
        maxLvl: "",
        period: "all",
      },
      TopNpcs,
    )
    .pipe(Effect.map(({ topNpcs }) => topNpcs));

export const killedNpcChoiceName = (
  npc: (typeof TopNpcs.Type)["topNpcs"][number],
) => `${npc.npcName} (${npc.npcLvl} lvl, ${npcTypeLabel(npc.npcType)})`;

export const rankingCommand: SlashCommand = {
  definition: guildCommand("ranking", COMMAND_TEXT.ranking.description)
    .addStringOption((option) =>
      option
        .setName("typ")
        .setDescription(COMMAND_TEXT.ranking.typeOption)
        .setRequired(true)
        .addChoices(
          RANKED_NPC_TYPES.map((type) => ({
            name: npcTypeLabel(type),
            value: type,
          })),
        ),
    )
    .addStringOption(periodOption)
    .addBooleanOption(visibilityOption)
    .toJSON(),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);
      const type = invocation.options.string("typ") ?? "ELITE2";
      const period = readPeriod(invocation.options);

      const stats = yield* session.api(
        killStatsPath(session.guildId),
        { npcTypes: [type], period },
        GuildKillStats,
      );

      const ranking = stats.memberRanking;

      const embed = lootlogEmbed(
        COMMAND_TEXT.ranking.title(npcTypeLabel(type), PERIOD_LABELS[period]),
        npcTypeColor(type),
      ).setDescription(
        ranking.length === 0
          ? COMMAND_TEXT.ranking.empty
          : rankedLines(ranking, {
              limit: RANKING_LIMIT,
              name: (entry) => escapeMarkdown(entry.memberName),
              detail: (entry) =>
                COMMAND_TEXT.ranking.kills(entry.totalParticipations),
              isOwn: (entry) => entry.memberUserId === invocation.discordId,
              ownDiscordId: invocation.discordId,
              ownMissing: COMMAND_TEXT.ranking.ownMissing,
            }).join("\n"),
      );

      if (ranking.length > 0)
        embed.setFooter({
          text: COMMAND_TEXT.ranking.footer(stats.overview.guildUniqueKills),
        });

      return {
        embeds: [embed],
        components: openInLootlog(webAppUrl, session.guildId, "/stats"),
      };
    }),
};

/** Public statistics of another Member are about them, so they hear of it. */
const pingInPublic = (invocation: CommandInvocation, target: string) =>
  target !== invocation.discordId &&
  invocation.options.boolean(VISIBILITY_OPTION) === true
    ? { content: `<@${target}>`, pings: [target] }
    : {};

export const statisticsCommand: SlashCommand = {
  definition: guildCommand("statystyki", COMMAND_TEXT.statistics.description)
    .addUserOption((option) =>
      option
        .setName("gracz")
        .setDescription(COMMAND_TEXT.statistics.playerOption),
    )
    .addStringOption(periodOption)
    .addBooleanOption(visibilityOption)
    .toJSON(),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);
      const target = invocation.options.user("gracz") ?? invocation.discordId;
      const period = readPeriod(invocation.options);

      const stats = yield* session.api(
        killStatsPath(session.guildId),
        { period },
        GuildKillStats,
      );

      const position = stats.memberRanking.findIndex(
        (entry) => entry.memberUserId === target,
      );

      const entry = stats.memberRanking[position];

      if (!entry) {
        return {
          ...pingInPublic(invocation, target),
          embeds: [
            lootlogEmbed(
              COMMAND_TEXT.statistics.emptyTitle(PERIOD_LABELS[period]),
            ).setDescription(`<@${target}>\n${COMMAND_TEXT.statistics.empty}`),
          ],
        };
      }

      const byType = Object.entries(entry.participationsByType)
        .filter(([, count]) => count > 0)
        .sort(([, left], [, right]) => right - left)
        .map(([type, count]) => `${npcTypeLabel(type)}: **${count}**`);

      const embed = lootlogEmbed(
        COMMAND_TEXT.statistics.title(entry.memberName, PERIOD_LABELS[period]),
      )
        .setDescription(`<@${target}>`)
        .addFields(
          {
            name: COMMAND_TEXT.statistics.total,
            value: `**${entry.totalParticipations}**`,
            inline: true,
          },
          {
            name: COMMAND_TEXT.statistics.position,
            value: COMMAND_TEXT.statistics.positionValue(
              position + 1,
              stats.memberRanking.length,
            ),
            inline: true,
          },
        );

      if (byType.length > 0)
        embed.addFields({
          name: COMMAND_TEXT.statistics.byType,
          value: byType.join("\n"),
        });

      return {
        ...pingInPublic(invocation, target),
        embeds: [embed],
        components: openInLootlog(webAppUrl, session.guildId, "/stats"),
      };
    }),
};

export const npcCommand: SlashCommand = {
  definition: guildCommand("npc", COMMAND_TEXT.npc.description)
    .addStringOption((option) =>
      option
        .setName("nazwa")
        .setDescription(COMMAND_TEXT.npc.nameOption)
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption(periodOption)
    .addBooleanOption(visibilityOption)
    .toJSON(),
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const npcs = yield* searchKilledNpcs(session, invocation.focused.value);

      return npcs.map((npc) =>
        choice(killedNpcChoiceName(npc), String(npc.npcId)),
      );
    }),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);
      const npcId = invocation.options.string("nazwa") ?? "";
      const period = readPeriod(invocation.options);

      if (!/^\d+$/.test(npcId)) return { content: COMMAND_TEXT.npc.notFound };

      const { npc, killers } = yield* session.api(
        `${killStatsPath(session.guildId)}/npcs/${npcId}/killers`,
        { limit: NPC_KILLERS_LOOKUP, period },
        NpcKillers,
      );

      if (!npc) return { content: COMMAND_TEXT.npc.notFound };

      const embed = lootlogEmbed(
        COMMAND_TEXT.npc.title(npc.npcName, npc.npcLvl),
        npcTypeColor(npc.npcType),
      )
        .setDescription(
          `${npcTypeLabel(npc.npcType)} · ${PERIOD_LABELS[period]}`,
        )
        .addFields(
          {
            name: COMMAND_TEXT.npc.kills,
            value: `**${npc.uniqueGuildKills}**`,
            inline: true,
          },
          {
            name: COMMAND_TEXT.npc.participations,
            value: `**${npc.totalMemberParticipations}**`,
            inline: true,
          },
          {
            name: COMMAND_TEXT.npc.killers,
            value:
              killers.length === 0
                ? COMMAND_TEXT.npc.empty
                : rankedLines(killers, {
                    limit: NPC_KILLERS_LIMIT,
                    name: (killer) => escapeMarkdown(killer.memberName),
                    detail: (killer) =>
                      COMMAND_TEXT.ranking.kills(killer.participationCount),
                    isOwn: (killer) =>
                      killer.memberUserId === invocation.discordId,
                    ownDiscordId: invocation.discordId,
                    ownMissing:
                      killers.length < NPC_KILLERS_LOOKUP
                        ? COMMAND_TEXT.npc.ownMissing
                        : undefined,
                  }).join("\n"),
          },
        );

      if (npc.npcIcon) embed.setThumbnail(npcIconUrl(npc.npcIcon));

      return {
        embeds: [embed],
        components: openInLootlog(webAppUrl, session.guildId, "/stats"),
      };
    }),
};
