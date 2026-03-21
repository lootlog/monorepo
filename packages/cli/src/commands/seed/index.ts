import { chalk } from "zx";
import { scrapeItems } from "./scrapers/items-scraper.js";
import { scrapeNpcs } from "./scrapers/npcs-scraper.js";
import { generatePlayers } from "./generators/players-generator.js";
import { seed } from "./seed.js";
import { writeFile, access } from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";

const hasReadableFile = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

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

const parseOptions = (args: string[]) => {
  const options: Record<string, any> = {};
  const takeNextArg = (index: number): string | undefined => args[index + 1];
  const parseIntegerOption = (index: number): number | undefined => {
    const value = takeNextArg(index);
    return value === undefined ? undefined : Number.parseInt(value, 10);
  };
  const setOption = (key: string, value: unknown) => {
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

export const seedCommand = async (args: string[]): Promise<void> => {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    displaySeedHelp();
    return;
  }

  const [subcommand, ...rest] = args;
  const options = parseOptions(rest);

  try {
    switch (subcommand) {
      case "scrape:items": {
        const output =
          options.output || "./packages/cli/src/mocks/data/items.json";
        await scrapeItems(output, options.force);
        break;
      }

      case "scrape:npcs": {
        const output =
          options.output || "./packages/cli/src/mocks/data/npcs.json";
        await scrapeNpcs(output, options.force);
        break;
      }

      case "scrape:all": {
        console.log(chalk.blue("🔄 Starting complete scraping process...\n"));

        const itemsOutput =
          options.itemsOutput || "./packages/cli/src/mocks/data/items.json";
        const npcsOutput =
          options.npcsOutput || "./packages/cli/src/mocks/data/npcs.json";

        await scrapeItems(itemsOutput, options.force);
        console.log();

        await scrapeNpcs(npcsOutput, options.force);
        console.log();

        console.log(chalk.green("✅ Scraping completed successfully!"));
        break;
      }

      case "generate:players": {
        const count = options.count || options.players || 1000;
        const output =
          options.output || "./packages/cli/src/mocks/data/players.json";
        const outputPath = path.resolve(output);

        const fileExists = await hasReadableFile(outputPath);

        if (fileExists && !options.force) {
          console.log(
            chalk.yellow(
              `⏭️  Players file already exists at ${outputPath}. Use --force to regenerate.`,
            ),
          );
          break;
        }

        console.log(chalk.blue(`Generating ${count} players...`));

        const players = generatePlayers(count);
        await writeFile(outputPath, JSON.stringify(players, null, 2));

        console.log(
          chalk.green(
            `✅ Generated ${players.length} players saved to ${outputPath}`,
          ),
        );
        break;
      }

      case "run": {
        await seed({
          guildsCount: options.guilds,
          lootsCount: options.loots,
          battlesCount: options.battles,
          playersCount: options.players,
          clean: options.clean !== false,
        });
        break;
      }

      case "setup": {
        console.log(chalk.blue("🚀 Starting complete setup...\n"));

        if (!options.skipScrape) {
          console.log(
            chalk.blue("📥 Step 1: Scraping data from margoworld.pl"),
          );
          await scrapeItems(
            "./packages/cli/src/mocks/data/items.json",
            options.force,
          );
          console.log();

          await scrapeNpcs(
            "./packages/cli/src/mocks/data/npcs.json",
            options.force,
          );
          console.log();
        } else {
          console.log(
            chalk.gray("⏭️  Step 1: Skipped scraping (using existing data)\n"),
          );
        }

        console.log(chalk.blue("👥 Step 2: Generating players"));
        const playerCount = options.players || 1000;
        const playersPath = path.resolve(
          "./packages/cli/src/mocks/data/players.json",
        );

        const playersFileExists = await hasReadableFile(playersPath);

        if (playersFileExists && !options.force) {
          console.log(
            chalk.gray(
              `⏭️  Players file already exists. Use --force to regenerate.\n`,
            ),
          );
        } else {
          const players = generatePlayers(playerCount);
          await writeFile(playersPath, JSON.stringify(players, null, 2));
          console.log(chalk.green(`✅ Generated ${players.length} players\n`));
        }

        console.log(chalk.blue("🌱 Step 3: Seeding database"));
        await seed({
          guildsCount: options.guilds || 5,
          lootsCount: options.loots || 5000,
          battlesCount: options.battles || 1000,
          playersCount: playerCount,
          clean: true,
        });

        console.log(chalk.green("\n✅ Complete setup finished successfully!"));
        break;
      }

      default:
        console.error(chalk.red(`\n❌ Unknown subcommand: ${subcommand}\n`));
        console.log(
          chalk.gray(`Run 'pnpm seed --help' to see available subcommands.\n`),
        );
        process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
};
