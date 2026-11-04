import { styleText } from "node:util";
import { Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";
import { scrapeItems } from "./scrapers/items-scraper.js";
import { scrapeNpcs } from "./scrapers/npcs-scraper.js";
import { generatePlayers } from "./generators/players-generator.js";
import { seed } from "./seed.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileExists } from "./utils/file-exists.js";
import { SEED_CONFIG } from "./config.js";

interface SeedOptions {
  force: boolean;
  guilds?: number;
  loots?: number;
  battles?: number;
  players?: number;
  skipScrape: boolean;
}

const DEFAULT_ITEMS_OUTPUT = "./packages/cli/src/mocks/data/items.json";

const DEFAULT_NPCS_OUTPUT = "./packages/cli/src/mocks/data/npcs.json";

const DEFAULT_PLAYERS_OUTPUT = "./packages/cli/src/mocks/data/players.json";

const generatePlayersFile = async (
  count: number,
  output: string,
  force: boolean | undefined,
): Promise<void> => {
  const outputPath = path.resolve(output);
  const outputExists = await fileExists(outputPath);

  if (outputExists && !force) {
    console.log(
      styleText(
        "yellow",
        `⏭️  Players file already exists at ${outputPath}. Use --force to regenerate.`,
      ),
    );

    return;
  }

  console.log(styleText("blue", `Generating ${count} players...`));
  const players = generatePlayers(count);
  await writeFile(outputPath, JSON.stringify(players, null, 2));
  console.log(
    styleText(
      "green",
      `✅ Generated ${players.length} players saved to ${outputPath}`,
    ),
  );
};

const scrapeSetupData = async (options: SeedOptions): Promise<void> => {
  if (options.skipScrape) {
    console.log(
      styleText("gray", "⏭️  Step 1: Skipped scraping (using existing data)\n"),
    );

    return;
  }

  console.log(styleText("blue", "📥 Step 1: Scraping data from margoworld.pl"));
  await scrapeItems(DEFAULT_ITEMS_OUTPUT, options.force);
  console.log();
  await scrapeNpcs(DEFAULT_NPCS_OUTPUT, options.force);
  console.log();
};

const generateSetupPlayers = async (
  playerCount: number,
  force: boolean | undefined,
): Promise<void> => {
  console.log(styleText("blue", "👥 Step 2: Generating players"));
  await generatePlayersFile(playerCount, DEFAULT_PLAYERS_OUTPUT, force);
  console.log();
};

const setup = async (options: SeedOptions): Promise<void> => {
  console.log(styleText("blue", "🚀 Starting complete setup...\n"));
  await scrapeSetupData(options);

  const playerCount = options.players ?? SEED_CONFIG.players.count;
  await generateSetupPlayers(playerCount, options.force);

  console.log(styleText("blue", "🌱 Step 3: Seeding database"));
  await seed({
    guildsCount: options.guilds,
    lootsCount: options.loots,
    battlesCount: options.battles,
    clean: true,
  });

  console.log(styleText("green", "\n✅ Complete setup finished successfully!"));
};

const force = Flag.Boolean("force").pipe(
  Flag.withAlias("f"),
  Flag.withDescription("Force re-scraping or regenerating even if files exist"),
  Flag.withDefault(false),
);

const output = (defaultPath: string) =>
  Flag.String("output").pipe(
    Flag.withAlias("o"),
    Flag.withDescription("Output file"),
    Flag.withDefault(defaultPath),
  );

const count = (name: string, description: string) =>
  Flag.Int(name).pipe(Flag.withDescription(description), Flag.optional);

const seedCounts = {
  guilds: count(
    "guilds",
    `Number of guilds to create (default: ${SEED_CONFIG.guilds.count})`,
  ),
  loots: count(
    "loots",
    `Number of loots to create (default: ${SEED_CONFIG.loots.count})`,
  ),
  battles: count(
    "battles",
    `Number of battles to create (default: ${SEED_CONFIG.battles.count})`,
  ),
};

const players = count(
  "players",
  `Number of players to generate (default: ${SEED_CONFIG.players.count})`,
);

const scrapeItemsCommand = Command.make(
  "scrape:items",
  { force, output: output(DEFAULT_ITEMS_OUTPUT) },
  (options) => Effect.promise(() => scrapeItems(options.output, options.force)),
).pipe(Command.withDescription("Scrape items from margoworld.pl"));

const scrapeNpcsCommand = Command.make(
  "scrape:npcs",
  { force, output: output(DEFAULT_NPCS_OUTPUT) },
  (options) => Effect.promise(() => scrapeNpcs(options.output, options.force)),
).pipe(Command.withDescription("Scrape NPCs from margoworld.pl"));

const scrapeAllCommand = Command.make(
  "scrape:all",
  {
    force,
    itemsOutput: Flag.String("items-output").pipe(
      Flag.withDefault(DEFAULT_ITEMS_OUTPUT),
    ),
    npcsOutput: Flag.String("npcs-output").pipe(
      Flag.withDefault(DEFAULT_NPCS_OUTPUT),
    ),
  },
  (options) =>
    Effect.promise(async () => {
      console.log(
        styleText("blue", "🔄 Starting complete scraping process...\n"),
      );

      await scrapeItems(options.itemsOutput, options.force);
      console.log();

      await scrapeNpcs(options.npcsOutput, options.force);
      console.log();

      console.log(styleText("green", "✅ Scraping completed successfully!"));
    }),
).pipe(Command.withDescription("Scrape both items and NPCs"));

const generatePlayersCommand = Command.make(
  "generate:players",
  {
    force,
    output: output(DEFAULT_PLAYERS_OUTPUT),
    count: Flag.Int("count").pipe(Flag.withAlias("c"), Flag.optional),
    players,
  },
  (options) =>
    Effect.promise(() =>
      generatePlayersFile(
        Option.getOrElse(
          Option.orElse(options.count, () => options.players),
          () => SEED_CONFIG.players.count,
        ),
        options.output,
        options.force,
      ),
    ),
).pipe(Command.withDescription("Generate mock player data"));

const DEVELOPMENT_GUILD_NOTE =
  "When DISCORD_DEVELOPMENT_GUILD_ID (comma-separated IDs allowed) and DISCORD_DEVELOPMENT_USER_ID are set, the first guilds use those Discord guild IDs and the dev user owns them, creates their timers, and joins their loot submissions. SEEDING_USER_ID is required to seed battles.";

const runSeedCommand = Command.make(
  "run",
  {
    ...seedCounts,
    clean: Flag.Boolean("clean").pipe(
      Flag.withDescription(
        "Clean the database before seeding (--no-clean to keep it)",
      ),
      Flag.withDefault(true),
    ),
  },
  (options) =>
    Effect.promise(() =>
      seed({
        guildsCount: Option.getOrUndefined(options.guilds),
        lootsCount: Option.getOrUndefined(options.loots),
        battlesCount: Option.getOrUndefined(options.battles),
        clean: options.clean,
      }),
    ),
).pipe(
  Command.withShortDescription("Seed the database"),
  Command.withDescription(`Seed the database. ${DEVELOPMENT_GUILD_NOTE}`),
);

const setupCommand = Command.make(
  "setup",
  {
    ...seedCounts,
    force,
    players,
    skipScrape: Flag.Boolean("skip-scrape").pipe(
      Flag.withDescription("Skip scraping (use existing data)"),
      Flag.withDefault(false),
    ),
  },
  (options) =>
    Effect.promise(() =>
      setup({
        force: options.force,
        guilds: Option.getOrUndefined(options.guilds),
        loots: Option.getOrUndefined(options.loots),
        battles: Option.getOrUndefined(options.battles),
        players: Option.getOrUndefined(options.players),
        skipScrape: options.skipScrape,
      }),
    ),
).pipe(
  Command.withDescription(
    `Complete setup (scrape, generate, seed). ${DEVELOPMENT_GUILD_NOTE}`,
  ),
);

export const seedCommand = Command.make("seed").pipe(
  Command.withDescription(
    "Database seeding (scrape data, generate mocks, populate DB)",
  ),
  Command.withSubcommands([
    scrapeItemsCommand,
    scrapeNpcsCommand,
    scrapeAllCommand,
    generatePlayersCommand,
    runSeedCommand,
    setupCommand,
  ]),
  Command.withExamples([
    { command: "bun run seed:scrape --force", description: "Force re-scrape" },
    {
      command: "bun run seed run --guilds 10 --loots 500",
      description: "Seed with custom counts",
    },
    {
      command: "bun run seed:setup --skip-scrape",
      description: "Setup without scraping",
    },
  ]),
);
