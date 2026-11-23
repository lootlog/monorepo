import type { RpcGuildLoot } from "@lootlog/rpc/api";
import { AttachmentBuilder, escapeMarkdown } from "discord.js";
import { Effect } from "effect";
import { compareNpcsStrongestFirst } from "@lootlog/domain/npc-type";
import { BotConfig } from "#src/config/bot-config";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT, rarityLabel, rarityMark } from "./command-messages.js";
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

const SHOWN_PLAYERS_PER_LOOT = 5;

const RARITIES = ["LEGENDARY", "HEROIC", "UPGRADED", "UNIQUE"] as const;

type Loot = typeof RpcGuildLoot.Type;

const itemLabel = (item: Loot["items"][number]) => {
  const name = escapeMarkdown(item.name);
  const mark = item.rarity ? rarityMark(item.rarity) : undefined;

  if (mark) return `${mark} ${name}`;

  const rarity = item.rarity ? rarityLabel(item.rarity) : undefined;

  return rarity ? `${name} (${rarity.toLowerCase()})` : name;
};

const lootLine = (loot: Loot) => {
  const items = loot.items.slice(0, SHOWN_ITEMS_PER_LOOT).map(itemLabel);

  if (loot.items.length > items.length)
    items.push(`+${loot.items.length - items.length}`);

  const [npc] = [...loot.npcs].sort((left, right) =>
    compareNpcsStrongestFirst(
      { ...left, npcId: left.id },
      { ...right, npcId: right.id },
    ),
  );

  const players = loot.players
    .slice(0, SHOWN_PLAYERS_PER_LOOT)
    .map((player) => escapeMarkdown(player.name));

  if (loot.players.length > players.length)
    players.push(`+${loot.players.length - players.length}`);

  const header = npc
    ? `💀 **${escapeMarkdown(npc.name)}** · ${discordTime(loot.createdAt)}`
    : `💀 ${discordTime(loot.createdAt)}`;

  const details = [
    items.join(", "),
    players.length > 0 ? `👥 ${players.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `${header}\n↳ ${details}`;
};

const lootsReply = (
  session: MemberSession,
  webAppUrl: string,
  title: string,
  emptyText: string,
  filters: {
    readonly players?: ReadonlyArray<string>;
    readonly npcs?: ReadonlyArray<string>;
    readonly rarities?: ReadonlyArray<(typeof RARITIES)[number]>;
    readonly itemNames?: ReadonlyArray<string>;
  },
): Effect.Effect<CommandReply, CommandFailure> =>
  session.api.listGuildLoots({ limit: SHOWN_LOOTS, ...filters }).pipe(
    Effect.map(({ items: loots }) => ({
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

      const requestedRarity = invocation.options.string("rzadkosc");

      const rarity = RARITIES.find(
        (candidate) => candidate === requestedRarity,
      );

      return yield* lootsReply(
        session,
        webAppUrl,
        COMMAND_TEXT.loots.title,
        COMMAND_TEXT.loots.empty,
        {
          players: present(invocation.options.string("gracz")),
          npcs: present(invocation.options.string("npc")),
          rarities: rarity === undefined ? undefined : [rarity],
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

      const { hits } = yield* client.catalog.searchItems({
        search: invocation.focused.value,
        limit: MAX_AUTOCOMPLETE_CHOICES,
      });

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
  run: (invocation) =>
    Effect.gen(function* () {
      const client = yield* LootlogClient;

      const card = yield* client.getGuildStatsCard(invocation.guildId).pipe(
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
