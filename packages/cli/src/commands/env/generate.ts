import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { question, chalk } from "zx";
import type { CliOptions, EnvVariable } from "../../types.js";
import { existsSync } from "node:fs";
import {
  discoverEnvFiles,
  parseEnvFile,
  buildEnvContent,
  writeEnvFile,
  readEnvFile,
} from "../../utils/file-utils.js";
import {
  generateEnvValues,
  extractSharedValues,
  enhanceVariablesWithDerivedValues,
} from "../../utils/env-generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_PATH = join(__dirname, "../../../../..");

const parseArguments = (args: string[]): CliOptions => {
  const options: CliOptions = {
    auto: args.includes("--auto") || args.includes("-a"),
    interactive: args.includes("--interactive") || args.includes("-i"),
    skipExisting: args.includes("--skip-existing") || args.includes("-s"),
    force: args.includes("--force") || args.includes("-f"),
  };

  if (!options.auto && !options.interactive) {
    options.auto = true;
  }

  return options;
};

const processEnvFile = async (
  envFile: { path: string; samplePath: string; name: string },
  sharedValues: Map<string, string>,
  options: CliOptions,
): Promise<boolean> => {
  const exists = existsSync(envFile.path);

  if (exists && options.skipExisting) {
    console.log(chalk.yellow(`⏭️  Skipping ${envFile.name} (already exists)`));
    return false;
  }

  if (exists && !options.force) {
    const overwrite = await question(
      chalk.yellow(
        `⚠️  ${envFile.name}/.env already exists. Overwrite? (y/n): `,
      ),
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log(chalk.gray(`   Skipped ${envFile.name}`));
      return false;
    }
  }

  const sampleContent = readEnvFile(envFile.samplePath);
  let variables = parseEnvFile(sampleContent);

  if (options.auto) {
    variables = generateEnvValues(variables, sharedValues, true);
    variables = enhanceVariablesWithDerivedValues(variables, sharedValues);
  } else if (options.interactive) {
    variables = await promptForValues(variables);
  }

  const envContent = buildEnvContent(variables);
  writeEnvFile(envFile.path, envContent);

  console.log(chalk.green(`✅ Created ${envFile.name}/.env`));
  return true;
};

const promptForValues = async (
  variables: EnvVariable[],
): Promise<EnvVariable[]> => {
  const updatedVariables: EnvVariable[] = [];

  for (const variable of variables) {
    if (variable.isEmpty || variable.isComment || !variable.key) {
      updatedVariables.push(variable);
      continue;
    }

    const input = await question(
      chalk.cyan(
        `Enter value for ${variable.key} (default: ${variable.value}): `,
      ),
    );

    updatedVariables.push({
      ...variable,
      value: input.trim() || variable.value,
    });
  }

  return updatedVariables;
};

export const generate = async (args: string[]): Promise<void> => {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
${chalk.bold("env generate - Generate environment files")}

${chalk.bold("Usage:")}
  pnpm env generate [options]

${chalk.bold("Options:")}
  -a, --auto              Automatically generate with smart defaults (default)
  -i, --interactive       Prompt for each environment variable value
  -s, --skip-existing     Skip files that already exist
  -f, --force             Overwrite existing files without asking
  -h, --help              Show this help message

${chalk.bold("Examples:")}
  pnpm env generate                      # Auto-generate with smart defaults
  pnpm env generate --interactive        # Interactive mode
  pnpm env generate --skip-existing      # Only create missing files
  pnpm env generate --force              # Overwrite all files

${chalk.bold("Note:")}
  The CLI automatically discovers all .env.example files in the monorepo.
  Shared values (database credentials, RabbitMQ, Redis) are generated once
  and reused across all services.
    `);
    return;
  }

  const options = parseArguments(args);

  console.log(chalk.bold.blue("\n🚀 Lootlog Environment Configuration\n"));

  const mode = options.interactive ? "Interactive" : "Auto-generate";
  console.log(chalk.gray(`Mode: ${mode}`));
  console.log(chalk.gray(`Skip existing: ${options.skipExisting}`));
  console.log(chalk.gray(`Force overwrite: ${options.force}\n`));

  console.log(chalk.gray("Discovering .env.example files...\n"));
  const envFiles = await discoverEnvFiles(ROOT_PATH);

  console.log(chalk.gray(`Found ${envFiles.length} environment files:\n`));

  let sharedValues = new Map<string, string>();
  let createdCount = 0;
  let skippedCount = 0;

  for (const envFile of envFiles) {
    if (envFile.name === "root") {
      console.log(chalk.bold(`\n📦 Processing root configuration...\n`));

      const sampleContent = readEnvFile(envFile.samplePath);
      let variables = parseEnvFile(sampleContent);

      if (options.auto) {
        variables = generateEnvValues(variables, new Map(), true);
      } else if (options.interactive) {
        variables = await promptForValues(variables);
      }

      sharedValues = extractSharedValues(variables);

      const created = await processEnvFile(envFile, sharedValues, options);
      if (created) {
        createdCount++;
      } else {
        skippedCount++;
      }

      console.log(
        chalk.gray(
          `\n✨ Extracted ${sharedValues.size} shared values for apps\n`,
        ),
      );
    } else {
      const created = await processEnvFile(envFile, sharedValues, options);
      if (created) {
        createdCount++;
      } else {
        skippedCount++;
      }
    }
  }

  console.log(chalk.bold.green(`\n✨ Configuration complete!\n`));
  console.log(chalk.gray(`Created: ${createdCount}`));
  console.log(chalk.gray(`Skipped: ${skippedCount}`));

  if (options.auto) {
    console.log(
      chalk.yellow(
        `\n⚠️  Note: Some values (Discord tokens, external API keys) are set to placeholders.`,
      ),
    );
    console.log(
      chalk.yellow(
        `   Please update them manually in the respective .env files.\n`,
      ),
    );
  }

  console.log(chalk.green(`\n🎉 You can now run: docker compose up -d\n`));
};

// Only run main when this file is executed directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
  const main = async (): Promise<void> => {
    const args = process.argv.slice(2);
    await generate(args);
  };

  main().catch((error) => {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  });
}
