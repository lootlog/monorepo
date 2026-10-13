import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  time,
  TimestampStyles,
  type AttachmentBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import {
  DEFAULT_NPC_TYPE_COLORS,
  isCombatNpcType,
} from "@lootlog/schema/npc-appearance";
import type { Effect } from "effect";
import type { BotConfig } from "#src/config/bot-config";
import { COMMAND_TEXT } from "./command-messages.js";
import type { CommandFailure, LootlogClient } from "./lootlog-client.js";

/** The option values Discord resolved for one invocation. */
export interface CommandOptions {
  readonly subcommand: string | null;
  readonly string: (name: string) => string | null;
  readonly boolean: (name: string) => boolean | null;
  readonly user: (name: string) => string | null;
}

export interface CommandInvocation {
  readonly guildId: string;
  readonly discordId: string;
  readonly options: CommandOptions;
  /** Permissions Discord grants the bot in the channel of the invocation. */
  readonly appPermissions: bigint;
}

export interface AutocompleteInvocation extends CommandInvocation {
  readonly focused: { readonly name: string; readonly value: string };
}

export interface CommandReply {
  readonly content?: string;
  /** Discord IDs the reply may notify; every other mention stays silent. */
  readonly pings?: ReadonlyArray<string>;
  readonly embeds?: ReadonlyArray<EmbedBuilder>;
  readonly components?: ReadonlyArray<ActionRowBuilder<ButtonBuilder>>;
  readonly files?: ReadonlyArray<AttachmentBuilder>;
}

export interface AutocompleteChoice {
  readonly name: string;
  readonly value: string;
}

export type CommandServices = LootlogClient | BotConfig;

/**
 * A reply is public only when the caller set the visibility option, so a
 * command or subcommand without that option always answers privately.
 */
export interface SlashCommand {
  readonly definition: RESTPostAPIChatInputApplicationCommandsJSONBody;
  readonly run: (
    invocation: CommandInvocation,
  ) => Effect.Effect<CommandReply, CommandFailure, CommandServices>;
  readonly autocomplete?: (
    invocation: AutocompleteInvocation,
  ) => Effect.Effect<
    ReadonlyArray<AutocompleteChoice>,
    CommandFailure,
    CommandServices
  >;
}

export const VISIBILITY_OPTION = "publiczne";

/** Discord rejects autocomplete answers with more choices or longer names. */
export const MAX_AUTOCOMPLETE_CHOICES = 25;

const MAX_CHOICE_NAME_LENGTH = 100;

export const choice = (name: string, value: string): AutocompleteChoice => ({
  name:
    name.length > MAX_CHOICE_NAME_LENGTH
      ? `${name.slice(0, MAX_CHOICE_NAME_LENGTH - 1)}…`
      : name,
  value: value.slice(0, MAX_CHOICE_NAME_LENGTH),
});

export const LOOTLOG_COLOR = 0xf5a524;

/** The read time in the footer tells a later reader how fresh the data is. */
export const lootlogEmbed = (title: string, color = LOOTLOG_COLOR) =>
  new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();

/** The default NPC type colors of the Game client, so both surfaces match. */
export const npcTypeColor = (type: string) =>
  isCombatNpcType(type)
    ? Number.parseInt(DEFAULT_NPC_TYPE_COLORS[type].slice(1), 16)
    : LOOTLOG_COLOR;

export const linkButtons = (
  ...links: ReadonlyArray<{ readonly label: string; readonly url: string }>
) => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    links.map(({ label, url }) =>
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(label)
        .setURL(url),
    ),
  ),
];

export const organizationUrl = (
  webAppUrl: string,
  guildId: string,
  path = "",
) => new URL(`/${guildId}${path}`, webAppUrl).toString();

export const openInLootlog = (webAppUrl: string, guildId: string, path = "") =>
  linkButtons({
    label: COMMAND_TEXT.buttons.openLootlog,
    url: organizationUrl(webAppUrl, guildId, path),
  });

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * The top of a ranking, numbered as the battle panel ranks its tables, with
 * the invoking Member's own line highlighted, or appended with its real
 * position when it ranks below the top.
 */
export const rankedLines = <A>(
  entries: ReadonlyArray<A>,
  options: {
    readonly limit: number;
    /** The Markdown-escaped name of a ranked Member. */
    readonly name: (entry: A) => string;
    readonly detail: (entry: A) => string;
    readonly isOwn: (entry: A) => boolean;
    readonly ownDiscordId: string;
    /** Shown without an own entry; leave it out when `entries` may be cut. */
    readonly ownMissing?: string | undefined;
  },
) => {
  const own = entries.findIndex(options.isOwn);

  // The invoker's own line mentions them, which never notifies inside an
  // embed, so a public ranking pings nobody.
  const numbered = (entry: A, index: number) => {
    const place = MEDALS[index] ?? `\`${index + 1}.\``;

    return index === own
      ? `${place} **<@${options.ownDiscordId}> — ${options.detail(entry)}**`
      : `${place} ${options.name(entry)} — ${options.detail(entry)}`;
  };

  const lines = entries.slice(0, options.limit).map(numbered);
  const ownEntry = entries[own];

  if (ownEntry !== undefined && own >= options.limit)
    lines.push("…", numbered(ownEntry, own));

  if (own === -1 && options.ownMissing !== undefined)
    lines.push("", `_${options.ownMissing}_`);

  return lines;
};

const TIMESTAMP_STYLES = {
  R: TimestampStyles.RelativeTime,
  t: TimestampStyles.ShortTime,
  f: TimestampStyles.ShortDateTime,
} as const;

/** Discord renders this in each viewer's own time zone and keeps it current. */
export const discordTime = (
  date: string,
  style: keyof typeof TIMESTAMP_STYLES = "R",
) => time(new Date(date), TIMESTAMP_STYLES[style]);
