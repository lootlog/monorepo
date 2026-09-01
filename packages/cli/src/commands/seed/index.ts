import { chalk } from "zx";
import { scrapeItems } from "./scrapers/items-scraper.js";
import { scrapeNpcs } from "./scrapers/npcs-scraper.js";
import { generatePlayers } from "./generators/players-generator.js";
import { seed } from "./seed.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileExists } from "./utils/file-exists.js";

const displaySeedHelp = (): void => {
  console.log(`
${chalk.bold.blue("Seed Command")}

${chalk.bold("Usage:")}
  pnpm seed <subcommand> [options]

${chalk.bold("Subcommands:")}
  scrape:items              Scrape items from margoworld.pl
  scrape:npcs               Scrape NPCs from margoworld.pl
  scrape:all                Scrape both items and NPCs
  generate:players          Generate mock player data
  run                       Seed the database
  setup                     Complete setup (scrape, generate, seed)

${chalk.bold("Options:")}
  --force, -f               Force re-scraping even if files exist
  --guilds <number>         Number of guilds to create (default: 5)
  --loots <number>          Number of loots to create (default: 5000)
  --battles <number>        Number of battles to create (default: 1000)
  --players <number>        Number of players to generate (default: 1000)
  --no-clean                Don't clean database before seeding
  --skip-scrape             Skip scraping (use existing data)
  --help, -h                Show this help message

${chalk.bold("Environment Variables:")}
  DISCORD_DEVELOPMENT_GUILD_ID    Discord guild ID(s) for development
                                  (supports multiple IDs separated by commas)
  DISCORD_DEVELOPMENT_USER_ID     Discord user ID for development owner
  SEEDING_USER_ID                 User ID for battles seeding (required for battles)

${chalk.bold("Examples:")}
  pnpm seed scrape:all                      # Scrape items and NPCs
  pnpm seed scrape:all --force              # Force re-scrape
  pnpm seed generate:players                # Generate 1000 players
  pnpm seed run --guilds 10 --loots 500     # Seed with custom counts
  pnpm seed setup                           # Complete setup
  pnpm seed setup --skip-scrape             # Setup without scraping

${chalk.bold("Development Guild Setup:")}
  When DISCORD_DEVELOPMENT_GUILD_ID and DISCORD_DEVELOPMENT_USER_ID are set in .env:
  - First N guilds will use the provided Discord guild IDs
  - Dev user will be set as the owner of these guilds
  - All timers in dev guilds will be created by the dev user
  - Dev user will be included in loot submissions for dev guilds
  `);
};

interface SeedOptions {
  force?: boolean;
  guilds?: number;
  loots?: number;
  battles?: number;
  players?: number;
  clean?: boolean;
  skipScrape?: boolean;
  itemsOutput?: string;
  npcsOutput?: string;
  output?: string;
  count?: number;
}

type SeedSubcommandHandler = (options: SeedOptions) => Promise<void>;

const DEFAULT_ITEMS_OUTPUT = "./packages/cli/src/mocks/data/items.json";
const DEFAULT_NPCS_OUTPUT = "./packages/cli/src/mocks/data/npcs.json";
const DEFAULT_PLAYERS_OUTPUT = "./packages/cli/src/mocks/data/players.json";

const parseOptions = (args: string[]): SeedOptions => {
  const options: SeedOptions = {};
  const takeNextArg = (index: number): string | undefined => args[index + 1];
  const parseIntegerOption = (index: number): number | undefined => {
    const value = takeNextArg(index);
    return value === undefined ? undefined : Number.parseInt(value, 10);
  };
  const setOption = <K extends keyof SeedOptions>(
    key: K,
    value: SeedOptions[K],
  ) => {
    if (value !== undefined) {
      options[key] = value;
    }
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--guilds") {
      setOption("guilds", parseIntegerOption(i));
      i++;
    } else if (arg === "--loots") {
      setOption("loots", parseIntegerOption(i));
      i++;
    } else if (arg === "--battles") {
      setOption("battles", parseIntegerOption(i));
      i++;
    } else if (arg === "--players") {
      setOption("players", parseIntegerOption(i));
      i++;
    } else if (arg === "--no-clean") {
      options.clean = false;
    } else if (arg === "--skip-scrape") {
      options.skipScrape = true;
    } else if (arg === "--items-output") {
      setOption("itemsOutput", takeNextArg(i));
      i++;
    } else if (arg === "--npcs-output") {
      setOption("npcsOutput", takeNextArg(i));
      i++;
    } else if (arg === "-o" || arg === "--output") {
      setOption("output", takeNextArg(i));
      i++;
    } else if (arg === "-c" || arg === "--count") {
      setOption("count", parseIntegerOption(i));
      i++;
    }
  }

  return options;
};

const scrapeItemsCommand: SeedSubcommandHandler = async (options) => {
  await scrapeItems(options.output ?? DEFAULT_ITEMS_OUTPUT, options.force);
};

const scrapeNpcsCommand: SeedSubcommandHandler = async (options) => {
  await scrapeNpcs(options.output ?? DEFAULT_NPCS_OUTPUT, options.force);
};

const scrapeAllCommand: SeedSubcommandHandler = async (options) => {
  console.log(chalk.blue("🔄 Starting complete scraping process...\n"));

  await scrapeItems(options.itemsOutput ?? DEFAULT_ITEMS_OUTPUT, options.force);
  console.log();

  await scrapeNpcs(options.npcsOutput ?? DEFAULT_NPCS_OUTPUT, options.force);
  console.log();

  console.log(chalk.green("✅ Scraping completed successfully!"));
};

const generatePlayersFile = async (
  count: number,
  output: string,
  force: boolean | undefined,
): Promise<boolean> => {
  const outputPath = path.resolve(output);
  const outputExists = await fileExists(outputPath);

  if (outputExists && !force) {
    console.log(
      chalk.yellow(
        `⏭️  Players file already exists at ${outputPath}. Use --force to regenerate.`,
      ),
    );
    return false;
  }

  console.log(chalk.blue(`Generating ${count} players...`));
  const players = generatePlayers(count);
  await writeFile(outputPath, JSON.stringify(players, null, 2));
  console.log(
    chalk.green(
      `✅ Generated ${players.length} players saved to ${outputPath}`,
    ),
  );
  return true;
};

const generatePlayersCommand: SeedSubcommandHandler = async (options) => {
  await generatePlayersFile(
    options.count ?? options.players ?? 1000,
    options.output ?? DEFAULT_PLAYERS_OUTPUT,
    options.force,
  );
};

const runSeedCommand: SeedSubcommandHandler = async (options) => {
  await seed({
    guildsCount: options.guilds,
    lootsCount: options.loots,
    battlesCount: options.battles,
    playersCount: options.players,
    clean: options.clean !== false,
  });
};

const scrapeSetupData = async (options: SeedOptions): Promise<void> => {
  if (options.skipScrape) {
    console.log(
      chalk.gray("⏭️  Step 1: Skipped scraping (using existing data)\n"),
    );
    return;
  }

  console.log(chalk.blue("📥 Step 1: Scraping data from margoworld.pl"));
  await scrapeItems(DEFAULT_ITEMS_OUTPUT, options.force);
  console.log();
  await scrapeNpcs(DEFAULT_NPCS_OUTPUT, options.force);
  console.log();
};

const generateSetupPlayers = async (
  playerCount: number,
  force: boolean | undefined,
): Promise<void> => {
  console.log(chalk.blue("👥 Step 2: Generating players"));
  const playersPath = path.resolve(DEFAULT_PLAYERS_OUTPUT);

  if ((await fileExists(playersPath)) && !force) {
    console.log(
      chalk.gray(
        `⏭️  Players file already exists. Use --force to regenerate.\n`,
      ),
    );
    return;
  }

  const players = generatePlayers(playerCount);
  await writeFile(playersPath, JSON.stringify(players, null, 2));
  console.log(chalk.green(`✅ Generated ${players.length} players\n`));
};

const setupCommand: SeedSubcommandHandler = async (options) => {
  console.log(chalk.blue("🚀 Starting complete setup...\n"));
  await scrapeSetupData(options);

  const playerCount = options.players ?? 1000;
  await generateSetupPlayers(playerCount, options.force);

  console.log(chalk.blue("🌱 Step 3: Seeding database"));
  await seed({
    guildsCount: options.guilds ?? 5,
    lootsCount: options.loots ?? 5000,
    battlesCount: options.battles ?? 1000,
    playersCount: playerCount,
    clean: true,
  });

  console.log(chalk.green("\n✅ Complete setup finished successfully!"));
};

const SEED_SUBCOMMAND_HANDLERS: Record<string, SeedSubcommandHandler> = {
  "scrape:items": scrapeItemsCommand,
  "scrape:npcs": scrapeNpcsCommand,
  "scrape:all": scrapeAllCommand,
  "generate:players": generatePlayersCommand,
  run: runSeedCommand,
  setup: setupCommand,
};

export const seedCommand = async (args: string[]): Promise<void> => {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    displaySeedHelp();
    return;
  }

  const [subcommand, ...rest] = args;
  if (!subcommand) {
    displaySeedHelp();
    return;
  }
  const options = parseOptions(rest);
  const handler = SEED_SUBCOMMAND_HANDLERS[subcommand];

  if (!handler) {
    console.error(chalk.red(`\n❌ Unknown subcommand: ${subcommand}\n`));
    console.log(
      chalk.gray(`Run 'pnpm seed --help' to see available subcommands.\n`),
    );
    process.exit(1);
  }

  try {
    await handler(options);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
};
