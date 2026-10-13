import { AttachmentBuilder, escapeMarkdown } from "discord.js";
import { Effect, Schema } from "effect";
import { BotConfig } from "#src/config/bot-config";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT, rarityLabel } from "./command-messages.js";
import { killedNpcChoiceName, searchKilledNpcs } from "./kill-commands.js";
import {
  LootlogClient,
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
  type CommandReply,
  type SlashCommand,
} from "./slash-command.js";

const SHOWN_LOOTS = 10;

const SHOWN_ITEMS_PER_LOOT = 4;

const RARITIES = ["LEGENDARY", "HEROIC", "UPGRADED", "UNIQUE"] as const;

const Loots = Schema.Array(
  Schema.Struct({
    createdAt: Schema.String,
    world: Schema.String,
    items: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        rarity: Schema.NullOr(Schema.String),
      }),
    ),
    players: Schema.Array(Schema.Struct({ name: Schema.String })),
    npcs: Schema.Array(Schema.Struct({ name: Schema.String })),
  }),
);

type Loot = (typeof Loots.Type)[number];

const SearchItems = Schema.Struct({
  hits: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      lvl: Schema.Number,
      rarity: Schema.NullOr(Schema.String),
    }),
  ),
});

const itemLabel = (item: Loot["items"][number]) => {
  const rarity = item.rarity ? rarityLabel(item.rarity) : undefined;

  return rarity
    ? `${escapeMarkdown(item.name)} (${rarity.toLowerCase()})`
    : escapeMarkdown(item.name);
};

const lootLine = (loot: Loot) => {
  const items = loot.items.slice(0, SHOWN_ITEMS_PER_LOOT).map(itemLabel);

  if (loot.items.length > items.length)
    items.push(`+${loot.items.length - items.length}`);

  const npc = loot.npcs[0];
  const players = loot.players.map((player) => escapeMarkdown(player.name));

  return [
    discordTime(loot.createdAt),
    npc ? COMMAND_TEXT.loots.from(`**${escapeMarkdown(npc.name)}**`) : null,
    items.join(", "),
    players.length > 0 ? `· ${players.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");
};

const lootsReply = (
  session: MemberSession,
  webAppUrl: string,
  title: string,
  emptyText: string,
  filters: {
    readonly players?: ReadonlyArray<string>;
    readonly npcs?: ReadonlyArray<string>;
    readonly rarities?: ReadonlyArray<string>;
    readonly itemNames?: ReadonlyArray<string>;
  },
): Effect.Effect<CommandReply, CommandFailure> =>
  session
    .api(
      `/guilds/${encodeURIComponent(session.guildId)}/loots`,
      { limit: SHOWN_LOOTS, ...filters },
      Loots,
    )
    .pipe(
      Effect.map((loots) => ({
        embeds: [
          lootlogEmbed(title).setDescription(
            loots.length === 0 ? emptyText : loots.map(lootLine).join("\n"),
          ),
        ],
        components: openInLootlog(webAppUrl, session.guildId),
      })),
    );

const present = (value: string | null) =>
  value === null || value.trim() === "" ? undefined : [value.trim()];

export const lootsCommand: SlashCommand = {
  definition: guildCommand("lupy", COMMAND_TEXT.loots.description)
    .addStringOption((option) =>
      option.setName("gracz").setDescription(COMMAND_TEXT.loots.playerOption),
    )
    .addStringOption((option) =>
      option
        .setName("npc")
        .setDescription(COMMAND_TEXT.loots.npcOption)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("rzadkosc")
        .setDescription(COMMAND_TEXT.loots.rarityOption)
        .addChoices(
          RARITIES.map((rarity) => ({
            name: rarityLabel(rarity) ?? rarity,
            value: rarity,
          })),
        ),
    )
    .addBooleanOption(visibilityOption)
    .toJSON(),
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const npcs = yield* searchKilledNpcs(session, invocation.focused.value);

      return npcs.map((npc) => choice(killedNpcChoiceName(npc), npc.npcName));
    }),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);

      return yield* lootsReply(
        session,
        webAppUrl,
        COMMAND_TEXT.loots.title,
        COMMAND_TEXT.loots.empty,
        {
          players: present(invocation.options.string("gracz")),
          npcs: present(invocation.options.string("npc")),
          rarities: present(invocation.options.string("rzadkosc")),
        },
      );
    }),
};

export const itemCommand: SlashCommand = {
  definition: guildCommand("przedmiot", COMMAND_TEXT.item.description)
    .addStringOption((option) =>
      option
        .setName("nazwa")
        .setDescription(COMMAND_TEXT.item.nameOption)
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addBooleanOption(visibilityOption)
    .toJSON(),
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const client = yield* LootlogClient;

      const { hits } = yield* client.search(
        "/items",
        { search: invocation.focused.value, limit: MAX_AUTOCOMPLETE_CHOICES },
        SearchItems,
      );

      return hits.map((item) => {
        const rarity = item.rarity ? rarityLabel(item.rarity) : undefined;

        return choice(
          `${item.name} (${item.lvl} lvl${rarity ? `, ${rarity.toLowerCase()}` : ""})`,
          item.name,
        );
      });
    }),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);
      const name = invocation.options.string("nazwa")?.trim() ?? "";

      return yield* lootsReply(
        session,
        webAppUrl,
        COMMAND_TEXT.item.title(name),
        COMMAND_TEXT.item.empty,
        { itemNames: [name] },
      );
    }),
};

const CARD_FILE_NAME = "lootlog-statystyki.png";

export const cardCommand: SlashCommand = {
  definition: guildCommand("karta", COMMAND_TEXT.card.description)
    .addBooleanOption(visibilityOption)
    .toJSON(),
  // The card is public on the Web, so it needs no Member behind the request.
  run: (invocation) =>
    Effect.gen(function* () {
      const client = yield* LootlogClient;

      const card = yield* client
        .publicFile(
          `/public/guilds/${encodeURIComponent(invocation.guildId)}/stats-card.png`,
        )
        .pipe(
          Effect.catchIf(
            (failure) => failure.reason === "not-found",
            () => Effect.succeed(null),
          ),
        );

      if (!card) return { content: COMMAND_TEXT.card.unavailable };

      return {
        files: [
          new AttachmentBuilder(Buffer.from(card), { name: CARD_FILE_NAME }),
        ],
      };
    }),
};
