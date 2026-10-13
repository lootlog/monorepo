import { escapeMarkdown } from "discord.js";
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
import {
  memberSession,
  type CommandFailure,
  type MemberSession,
} from "./lootlog-client.js";
import {
  choice,
  lootlogEmbed,
  MAX_AUTOCOMPLETE_CHOICES,
  openInLootlog,
  rankedLines,
  type SlashCommand,
} from "./slash-command.js";

const RANKING_LIMIT = 15;

const NPC_KILLERS_LIMIT = 10;

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

const NpcKillers = Schema.NullOr(
  Schema.Struct({
    npc: Schema.Struct({
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Number,
      uniqueGuildKills: Schema.Number,
      totalMemberParticipations: Schema.Number,
    }),
    killers: Schema.Array(
      Schema.Struct({
        memberName: Schema.String,
        participationCount: Schema.Number,
      }),
    ),
  }),
);

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

      const ranking = stats.memberRanking.slice(0, RANKING_LIMIT);

      const embed = lootlogEmbed(
        COMMAND_TEXT.ranking.title(npcTypeLabel(type), PERIOD_LABELS[period]),
      ).setDescription(
        ranking.length === 0
          ? COMMAND_TEXT.ranking.empty
          : rankedLines(
              ranking,
              (entry) =>
                `${escapeMarkdown(entry.memberName)} — ${COMMAND_TEXT.ranking.kills(entry.totalParticipations)}`,
            ).join("\n"),
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

      return {
        embeds: [
          lootlogEmbed(
            COMMAND_TEXT.statistics.title(
              entry.memberName,
              PERIOD_LABELS[period],
            ),
          ).setDescription(
            [
              COMMAND_TEXT.statistics.total(entry.totalParticipations),
              COMMAND_TEXT.statistics.position(
                position + 1,
                stats.memberRanking.length,
              ),
              "",
              ...byType,
            ].join("\n"),
          ),
        ],
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

      const killers = yield* session
        .api(
          `${killStatsPath(session.guildId)}/npcs/${npcId}/killers`,
          { limit: NPC_KILLERS_LIMIT, period },
          NpcKillers,
        )
        .pipe(
          Effect.catchIf(
            (failure: CommandFailure) => failure.reason === "not-found",
            () => Effect.succeed(null),
          ),
        );

      if (!killers) return { content: COMMAND_TEXT.npc.notFound };

      return {
        embeds: [
          lootlogEmbed(
            COMMAND_TEXT.npc.title(killers.npc.npcName, killers.npc.npcLvl),
          ).setDescription(
            [
              `${npcTypeLabel(killers.npc.npcType)} · ${PERIOD_LABELS[period]}`,
              COMMAND_TEXT.npc.summary(
                killers.npc.uniqueGuildKills,
                killers.npc.totalMemberParticipations,
              ),
              "",
              ...(killers.killers.length === 0
                ? [COMMAND_TEXT.npc.empty]
                : rankedLines(
                    killers.killers,
                    (killer) =>
                      `${escapeMarkdown(killer.memberName)} — ${COMMAND_TEXT.ranking.kills(killer.participationCount)}`,
                  )),
            ].join("\n"),
          ),
        ],
        components: openInLootlog(webAppUrl, session.guildId, "/stats"),
      };
    }),
};
