import { escapeMarkdown, type SlashCommandSubcommandBuilder } from "discord.js";
import { Clock, Effect, Match, Schema } from "effect";
import { BotConfig } from "#src/config/bot-config";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT } from "./command-messages.js";
import {
  memberSession,
  type CommandFailure,
  type MemberSession,
} from "./lootlog-client.js";
import {
  choice,
  discordTime,
  lootlogEmbed,
  MAX_AUTOCOMPLETE_CHOICES,
  openInLootlog,
  rankedLines,
  type CommandInvocation,
  type CommandReply,
  type SlashCommand,
} from "./slash-command.js";

const RANKING_PER_HERO = 10;

// Discord rejects an embed with more than 25 fields or 6000 characters; the
// margin keeps room for the title and the remainder note.
const MAX_RANKING_FIELDS = 24;

const MAX_RANKING_FIELD_CHARACTERS = 5500;

const MAX_FIELD_NAME_LENGTH = 256;

const EVENT_OPTION = "event";

const Events = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    world: Schema.String,
    active: Schema.Boolean,
    startsAt: Schema.NullOr(Schema.String),
    endsAt: Schema.NullOr(Schema.String),
    createdAt: Schema.String,
    heroNpcs: Schema.Array(
      Schema.Struct({
        npcId: Schema.NullOr(Schema.Number),
        npcName: Schema.String,
        npcLvl: Schema.NullOr(Schema.Number),
      }),
    ),
  }),
);

type LootlogEvent = (typeof Events.Type)[number];

const EventRanking = Schema.Array(
  Schema.Struct({
    heroNpcName: Schema.String,
    totalPoints: Schema.Number,
    totalKills: Schema.Number,
    member: Schema.Struct({ name: Schema.String }),
  }),
);

const EventTimers = Schema.Array(
  Schema.Struct({
    npcId: Schema.Number,
    minSpawnTime: Schema.String,
    maxSpawnTime: Schema.String,
  }),
);

const Leader = Schema.Struct({
  winner: Schema.NullOr(
    Schema.Struct({ name: Schema.String, primaryValue: Schema.Number }),
  ),
});

const EventWrapped = Schema.Struct({
  overview: Schema.Struct({
    totalKills: Schema.Number,
    participantCount: Schema.Number,
    totalPoints: Schema.Number,
    coveragePercentage: Schema.Number,
    totalLoots: Schema.Number,
  }),
  leaders: Schema.Struct({
    topHunter: Leader,
    topScorer: Leader,
    longestDuty: Leader,
  }),
});

const eventsPath = (guildId: string) =>
  `/guilds/${encodeURIComponent(guildId)}/events`;

const startedAt = (event: LootlogEvent) =>
  new Date(event.startsAt ?? event.createdAt).getTime();

/** Without a choice, the latest running event wins, then the latest one. */
const selectEvent = (
  events: ReadonlyArray<LootlogEvent>,
  chosenId: string | null,
) => {
  if (chosenId !== null) return events.find((event) => event.id === chosenId);

  const latestFirst = [...events].sort(
    (left, right) => startedAt(right) - startedAt(left),
  );

  return latestFirst.find((event) => event.active) ?? latestFirst[0];
};

const numberFormat = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

const leaderLine = (
  label: string,
  leader: typeof Leader.Type,
  format: (value: number) => string,
) =>
  leader.winner
    ? `${label}: **${escapeMarkdown(leader.winner.name)}** (${format(leader.winner.primaryValue)})`
    : null;

const rankingReply = (
  session: MemberSession,
  event: LootlogEvent,
): Effect.Effect<CommandReply, CommandFailure> =>
  Effect.gen(function* () {
    const ranking = yield* session.api(
      `${eventsPath(session.guildId)}/${encodeURIComponent(event.id)}/ranking`,
      {},
      EventRanking,
    );

    const heroNames = [
      ...new Set([
        ...event.heroNpcs.map((hero) => hero.npcName),
        ...ranking.map((entry) => entry.heroNpcName),
      ]),
    ];

    const heroFields = heroNames.flatMap((heroName) => {
      const entries = ranking
        .filter((entry) => entry.heroNpcName === heroName)
        .slice(0, RANKING_PER_HERO);

      return entries.length === 0
        ? []
        : [
            {
              name: heroName.slice(0, MAX_FIELD_NAME_LENGTH),
              value: rankedLines(
                entries,
                (entry) =>
                  `${escapeMarkdown(entry.member.name)} — ${COMMAND_TEXT.events.points(entry.totalPoints, entry.totalKills)}`,
              ).join("\n"),
            },
          ];
    });

    const fields: typeof heroFields = [];
    let characters = 0;

    for (const field of heroFields) {
      const size = field.name.length + field.value.length;

      if (
        fields.length === MAX_RANKING_FIELDS ||
        characters + size > MAX_RANKING_FIELD_CHARACTERS
      )
        break;

      fields.push(field);
      characters += size;
    }

    const embed = lootlogEmbed(COMMAND_TEXT.events.rankingTitle(event.name));

    if (fields.length === 0)
      embed.setDescription(COMMAND_TEXT.events.rankingEmpty);
    else embed.addFields(fields);

    if (heroFields.length > fields.length)
      embed.setFooter({
        text: COMMAND_TEXT.events.moreHeroes(heroFields.length - fields.length),
      });

    return { embeds: [embed] };
  });

const statusReply = (
  session: MemberSession,
  event: LootlogEvent,
): Effect.Effect<CommandReply, CommandFailure> =>
  Effect.gen(function* () {
    const timers = yield* session.api(
      `${eventsPath(session.guildId)}/${encodeURIComponent(event.id)}/timers`,
      { world: event.world },
      EventTimers,
    );

    const now = yield* Clock.currentTimeMillis;

    const heroLines = event.heroNpcs.map((hero) => {
      const timer = timers.find(
        (candidate) =>
          candidate.npcId === hero.npcId &&
          new Date(candidate.maxSpawnTime).getTime() > now,
      );

      const window = timer
        ? `${discordTime(timer.minSpawnTime)} – ${discordTime(timer.maxSpawnTime, "t")}`
        : COMMAND_TEXT.events.noTimer;

      const level = hero.npcLvl === null ? "" : ` (${hero.npcLvl})`;

      return `**${escapeMarkdown(hero.npcName)}**${level} — ${window}`;
    });

    const period = [event.startsAt, event.endsAt]
      .map((date) => (date ? discordTime(date, "f") : "…"))
      .join(" – ");

    return {
      embeds: [
        lootlogEmbed(COMMAND_TEXT.events.statusTitle(event.name))
          .setDescription(
            `${event.active ? COMMAND_TEXT.events.active : COMMAND_TEXT.events.finished} · ${escapeMarkdown(event.world)}\n${period}`,
          )
          .addFields({
            name: COMMAND_TEXT.events.heroes,
            value:
              heroLines.length === 0
                ? COMMAND_TEXT.events.noHeroes
                : heroLines.join("\n"),
          }),
      ],
    };
  });

const summaryReply = (
  session: MemberSession,
  event: LootlogEvent,
): Effect.Effect<CommandReply, CommandFailure> =>
  Effect.gen(function* () {
    const wrapped = yield* session.api(
      `${eventsPath(session.guildId)}/${encodeURIComponent(event.id)}/wrapped`,
      {},
      EventWrapped,
    );

    const text = COMMAND_TEXT.events.summary;
    const { overview, leaders } = wrapped;

    const leaderLines = [
      leaderLine(text.topHunter, leaders.topHunter, numberFormat.format),
      leaderLine(text.topScorer, leaders.topScorer, numberFormat.format),
      leaderLine(
        text.longestDuty,
        leaders.longestDuty,
        (seconds) => `${numberFormat.format(seconds / 3600)} h`,
      ),
    ].filter((line) => line !== null);

    const embed = lootlogEmbed(
      COMMAND_TEXT.events.summaryTitle(event.name),
    ).addFields(
      { name: text.kills, value: String(overview.totalKills), inline: true },
      {
        name: text.participants,
        value: String(overview.participantCount),
        inline: true,
      },
      {
        name: text.points,
        value: numberFormat.format(overview.totalPoints),
        inline: true,
      },
      {
        name: text.coverage,
        value: `${numberFormat.format(overview.coveragePercentage)}%`,
        inline: true,
      },
      { name: text.loots, value: String(overview.totalLoots), inline: true },
    );

    if (leaderLines.length > 0) embed.setDescription(leaderLines.join("\n"));

    return { embeds: [embed] };
  });

const eventSubcommand =
  (name: string, description: string) =>
  (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(name)
      .setDescription(description)
      .addStringOption((option) =>
        option
          .setName(EVENT_OPTION)
          .setDescription(COMMAND_TEXT.events.eventOption)
          .setAutocomplete(true),
      )
      .addBooleanOption(visibilityOption);

const readEvents = (session: MemberSession) =>
  session.api(eventsPath(session.guildId), {}, Events);

export const eventCommand: SlashCommand = {
  definition: guildCommand("event", COMMAND_TEXT.events.description)
    .addSubcommand(
      eventSubcommand("ranking", COMMAND_TEXT.events.rankingDescription),
    )
    .addSubcommand(
      eventSubcommand("status", COMMAND_TEXT.events.statusDescription),
    )
    .addSubcommand(
      eventSubcommand("podsumowanie", COMMAND_TEXT.events.summaryDescription),
    )
    .toJSON(),
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const events = yield* readEvents(session);
      const query = invocation.focused.value.toLowerCase();

      return [...events]
        .sort((left, right) => startedAt(right) - startedAt(left))
        .filter((event) => event.name.toLowerCase().includes(query))
        .slice(0, MAX_AUTOCOMPLETE_CHOICES)
        .map((event) =>
          choice(
            `${event.name} · ${event.world}${event.active ? ` (${COMMAND_TEXT.events.active.toLowerCase()})` : ""}`,
            event.id,
          ),
        );
    }),
  run: (invocation: CommandInvocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);
      const events = yield* readEvents(session);
      const chosenId = invocation.options.string(EVENT_OPTION);
      const event = selectEvent(events, chosenId);

      if (!event)
        return {
          content:
            chosenId === null
              ? COMMAND_TEXT.events.none
              : COMMAND_TEXT.events.notFound,
        };

      const subcommand = invocation.options.subcommand;

      const reply = Match.value(subcommand).pipe(
        Match.when("status", () => statusReply),
        Match.when("podsumowanie", () => summaryReply),
        Match.orElse(() => rankingReply),
      );

      const result = yield* reply(session, event).pipe(
        Effect.catchIf(
          (failure) =>
            subcommand === "podsumowanie" && failure.reason === "not-found",
          () =>
            Effect.succeed({
              content: COMMAND_TEXT.events.summaryUnavailable,
            }),
        ),
      );

      return {
        ...result,
        components: openInLootlog(
          webAppUrl,
          session.guildId,
          `/events/${encodeURIComponent(event.id)}`,
        ),
      };
    }),
};
