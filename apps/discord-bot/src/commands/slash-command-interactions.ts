import {
  Events,
  MessageFlags,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type ClientApplication,
} from "discord.js";
import { Effect } from "effect";
import { FAILURE_MESSAGES, UNKNOWN_COMMAND } from "./command-messages.js";
import { eventCommand } from "./event-commands.js";
import {
  npcCommand,
  rankingCommand,
  statisticsCommand,
} from "./kill-commands.js";
import { cardCommand, itemCommand, lootsCommand } from "./loot-commands.js";
import { lootlogCommand } from "./lootlog-command.js";
import { onlineCommand } from "./online-command.js";
import { reservationsCommand } from "./reservation-commands.js";
import {
  VISIBILITY_OPTION,
  type AutocompleteChoice,
  type AutocompleteInvocation,
  type CommandInvocation,
  type CommandReply,
  type CommandServices,
  type SlashCommand,
} from "./slash-command.js";
import { timerCommand, timersCommand } from "./timer-commands.js";

export const SLASH_COMMANDS: ReadonlyArray<SlashCommand> = [
  rankingCommand,
  statisticsCommand,
  npcCommand,
  timersCommand,
  timerCommand,
  reservationsCommand,
  eventCommand,
  lootsCommand,
  itemCommand,
  onlineCommand,
  cardCommand,
  lootlogCommand,
];

const commandsByName = new Map(
  SLASH_COMMANDS.map((command) => [command.definition.name, command]),
);

// Discord drops an autocomplete answer that arrives after three seconds.
const AUTOCOMPLETE_BUDGET = "2500 millis";

/** Every outcome of a command is a reply; failures explain what to do next. */
export const answerCommand = (
  commandName: string,
  invocation: CommandInvocation,
): Effect.Effect<CommandReply, never, CommandServices> => {
  const command = commandsByName.get(commandName);

  if (!command) return Effect.succeed({ content: UNKNOWN_COMMAND });

  return command.run(invocation).pipe(
    Effect.catchTag("CommandFailure", (failure) =>
      Effect.succeed({ content: FAILURE_MESSAGES[failure.reason] }),
    ),
    Effect.catchCause((cause) =>
      Effect.logError("Discord slash command failed", cause).pipe(
        Effect.as({ content: FAILURE_MESSAGES.unavailable }),
      ),
    ),
    Effect.withSpan("discord.slash-command", {
      attributes: { command: commandName },
    }),
  );
};

/** Suggestions are best effort: any failure offers nothing to choose from. */
export const answerAutocomplete = (
  commandName: string,
  invocation: AutocompleteInvocation,
): Effect.Effect<ReadonlyArray<AutocompleteChoice>, never, CommandServices> => {
  const autocomplete = commandsByName.get(commandName)?.autocomplete;

  if (!autocomplete) return Effect.succeed([]);

  return autocomplete(invocation).pipe(
    Effect.timeout(AUTOCOMPLETE_BUDGET),
    Effect.catchCause(() => Effect.succeed([])),
    Effect.withSpan("discord.slash-command.autocomplete", {
      attributes: { command: commandName },
    }),
  );
};

const commandInvocation = (
  interaction:
    | ChatInputCommandInteraction<"cached" | "raw">
    | AutocompleteInteraction<"cached" | "raw">,
  user: (name: string) => string | null,
): CommandInvocation => ({
  guildId: interaction.guildId,
  discordId: interaction.user.id,
  appPermissions: interaction.appPermissions.bitfield,
  options: {
    subcommand: interaction.options.getSubcommand(false),
    string: (name) => interaction.options.getString(name),
    boolean: (name) => interaction.options.getBoolean(name),
    user,
  },
});

const handleCommand = (
  interaction: ChatInputCommandInteraction<"cached" | "raw">,
) =>
  Effect.gen(function* () {
    const isPublic = interaction.options.getBoolean(VISIBILITY_OPTION) === true;

    yield* Effect.tryPromise(() =>
      interaction.deferReply(isPublic ? {} : { flags: MessageFlags.Ephemeral }),
    );

    const reply = yield* answerCommand(
      interaction.commandName,
      commandInvocation(
        interaction,
        (name) => interaction.options.getUser(name)?.id ?? null,
      ),
    );

    yield* Effect.tryPromise(() =>
      interaction.editReply({
        content: reply.content ?? null,
        embeds: [...(reply.embeds ?? [])],
        components: [...(reply.components ?? [])],
        files: [...(reply.files ?? [])],
        // A public ranking must never ping the players it lists.
        allowedMentions: { parse: [], users: [...(reply.pings ?? [])] },
      }),
    );
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logError("Discord slash command reply failed", cause),
    ),
  );

const handleAutocomplete = (
  interaction: AutocompleteInteraction<"cached" | "raw">,
) =>
  Effect.gen(function* () {
    const choices = yield* answerAutocomplete(interaction.commandName, {
      ...commandInvocation(interaction, () => null),
      focused: interaction.options.getFocused(true),
    });

    yield* Effect.tryPromise(() => interaction.respond([...choices]));
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("Discord autocomplete reply failed", cause),
    ),
  );

const publishCommands = (application: ClientApplication) =>
  Effect.tryPromise(() =>
    application.commands.set(
      SLASH_COMMANDS.map((command) => command.definition),
    ),
  ).pipe(
    Effect.asVoid,
    Effect.catchCause((cause) =>
      Effect.logError("Discord slash command registration failed", cause),
    ),
  );

export const registerSlashCommands = (
  client: Client,
  run: (effect: Effect.Effect<void, never, CommandServices>) => void,
): void => {
  // Login can finish before these listeners exist, so a ready client
  // publishes its commands immediately.
  if (client.isReady()) run(publishCommands(client.application));
  else
    client.once(Events.ClientReady, (readyClient) =>
      run(publishCommands(readyClient.application)),
    );

  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.inGuild()) return;

    if (interaction.isChatInputCommand()) run(handleCommand(interaction));
    else if (interaction.isAutocomplete()) run(handleAutocomplete(interaction));
  });
};
