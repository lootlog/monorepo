import { escapeMarkdown } from "discord.js";
import { Clock, Effect, Schema } from "effect";
import { BotConfig } from "#src/config/bot-config";
import {
  guildCommand,
  visibilityOption,
  worldOption,
} from "./command-builders.js";
import { COMMAND_TEXT, npcTypeLabel } from "./command-messages.js";
import { memberSession, type MemberSession } from "./lootlog-client.js";
import {
  choice,
  discordTime,
  lootlogEmbed,
  MAX_AUTOCOMPLETE_CHOICES,
  openInLootlog,
  worldAutocompleteChoices,
  type SlashCommand,
} from "./slash-command.js";

const TIMERS_LIMIT = 20;

const TIMER_NPC_TYPES = [
  "ELITE2",
  "HERO",
  "TITAN",
  "COLOSSUS",
  "EVENT_HERO",
  "ELITE3",
  "ELITE",
] as const;

const Timer = Schema.Struct({
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: Schema.String,
  maxSpawnTime: Schema.String,
  wasReset: Schema.Boolean,
  npc: Schema.Struct({
    name: Schema.String,
    lvl: Schema.Number,
    type: Schema.String,
    location: Schema.String,
  }),
  member: Schema.optionalKey(Schema.Struct({ name: Schema.String })),
  deletedAt: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

type Timer = typeof Timer.Type;

const Timers = Schema.Array(Timer);

/** A timer stays current until its spawn window closes. */
const readCurrentTimers = (session: MemberSession, world?: string) =>
  Effect.gen(function* () {
    const timers = yield* session.api(
      `/guilds/${encodeURIComponent(session.guildId)}/timers`,
      { world },
      Timers,
    );

    const now = yield* Clock.currentTimeMillis;

    return timers
      .filter(
        (timer) =>
          !timer.deletedAt && new Date(timer.maxSpawnTime).getTime() > now,
      )
      .sort(
        (left, right) =>
          new Date(left.minSpawnTime).getTime() -
          new Date(right.minSpawnTime).getTime(),
      );
  });

const spawnWindow = (timer: Timer, now: number) =>
  new Date(timer.minSpawnTime).getTime() <= now
    ? COMMAND_TEXT.timers.windowOpen(discordTime(timer.maxSpawnTime))
    : COMMAND_TEXT.timers.window(
        discordTime(timer.minSpawnTime),
        discordTime(timer.maxSpawnTime, "t"),
      );

const timerName = (timer: Timer) =>
  `${escapeMarkdown(timer.npc.name)} (${timer.npc.lvl})`;

// Timers are unique per world, so a choice carries both halves of the key.
const timerChoiceValue = (timer: Timer) => `${timer.world}|${timer.timerKey}`;

export const timersCommand: SlashCommand = {
  definition: guildCommand("timery", COMMAND_TEXT.timers.description)
    .addStringOption((option) =>
      option
        .setName("typ")
        .setDescription(COMMAND_TEXT.timers.typeOption)
        .addChoices(
          TIMER_NPC_TYPES.map((type) => ({
            name: npcTypeLabel(type),
            value: type,
          })),
        ),
    )
    .addStringOption(worldOption)
    .addBooleanOption(visibilityOption)
    .toJSON(),
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const timers = yield* readCurrentTimers(session);

      return worldAutocompleteChoices(timers, invocation.focused.value);
    }),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);
      const type = invocation.options.string("typ");
      const world = invocation.options.string("swiat") ?? undefined;
      const now = yield* Clock.currentTimeMillis;

      const timers = (yield* readCurrentTimers(session, world)).filter(
        (timer) => type === null || timer.npc.type === type,
      );

      const shown = timers.slice(0, TIMERS_LIMIT);

      const lines = shown.map(
        (timer) =>
          `**${timerName(timer)}** · ${escapeMarkdown(timer.world)} — ${spawnWindow(timer, now)}`,
      );

      if (timers.length > shown.length)
        lines.push(COMMAND_TEXT.timers.more(timers.length - shown.length));

      const title = [
        COMMAND_TEXT.timers.title,
        type === null ? null : npcTypeLabel(type),
        world,
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        embeds: [
          lootlogEmbed(title).setDescription(
            lines.length === 0 ? COMMAND_TEXT.timers.empty : lines.join("\n"),
          ),
        ],
        components: openInLootlog(webAppUrl, session.guildId, "/timers"),
      };
    }),
};

export const timerCommand: SlashCommand = {
  definition: guildCommand("timer", COMMAND_TEXT.timer.description)
    .addStringOption((option) =>
      option
        .setName("npc")
        .setDescription(COMMAND_TEXT.timer.npcOption)
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addBooleanOption(visibilityOption)
    .toJSON(),
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const timers = yield* readCurrentTimers(session);
      const query = invocation.focused.value.toLowerCase();

      return timers
        .filter((timer) => timer.npc.name.toLowerCase().includes(query))
        .slice(0, MAX_AUTOCOMPLETE_CHOICES)
        .map((timer) =>
          choice(
            `${timer.npc.name} (${timer.npc.lvl}) · ${timer.world}`,
            timerChoiceValue(timer),
          ),
        );
    }),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);
      const selected = invocation.options.string("npc") ?? "";
      const [world] = selected.split("|");
      const now = yield* Clock.currentTimeMillis;

      const timer = (yield* readCurrentTimers(session, world)).find(
        (candidate) => timerChoiceValue(candidate) === selected,
      );

      if (!timer) return { content: COMMAND_TEXT.timer.notFound };

      const embed = lootlogEmbed(timerName(timer))
        .setDescription(npcTypeLabel(timer.npc.type))
        .addFields(
          {
            name: COMMAND_TEXT.timer.window,
            value: `${spawnWindow(timer, now)}\n${discordTime(timer.minSpawnTime, "f")} – ${discordTime(timer.maxSpawnTime, "t")}`,
          },
          {
            name: COMMAND_TEXT.timer.world,
            value: escapeMarkdown(timer.world),
            inline: true,
          },
          {
            name: COMMAND_TEXT.timer.location,
            value: escapeMarkdown(timer.npc.location),
            inline: true,
          },
        );

      if (timer.member)
        embed.addFields({
          name: COMMAND_TEXT.timer.reportedBy,
          value: escapeMarkdown(timer.member.name),
          inline: true,
        });

      if (timer.wasReset) embed.setFooter({ text: COMMAND_TEXT.timer.reset });

      return {
        embeds: [embed],
        components: openInLootlog(webAppUrl, session.guildId, "/timers"),
      };
    }),
};
