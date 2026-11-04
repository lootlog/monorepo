import { existsSync } from "node:fs";
import { join } from "node:path";
import { styleText } from "node:util";
import { Effect } from "effect";
import { Command, Flag, Prompt } from "effect/cli";
import type { CliOptions, EnvFile, EnvVariable } from "../../types.js";
import {
  discoverEnvFiles,
  parseEnvFile,
  buildEnvContent,
  writeEnvFile,
  readEnvFile,
} from "../../utils/file-utils.js";
import {
  SHARED_SERVICE_SECRET_KEYS,
  generateEnvValues,
  extractSharedValues,
  enhanceVariablesWithDerivedValues,
} from "../../utils/env-generator.js";

const ROOT_PATH = join(import.meta.dirname, "../../../../..");

interface ProcessEnvFileOptions {
  useGeneratedSharedValues?: boolean;
}

interface ProcessEnvFileResult {
  created: boolean;
  variables: EnvVariable[];
}

const processEnvFile = Effect.fn("processEnvFile")(function* (
  envFile: EnvFile,
  sharedValues: Map<string, string>,
  options: CliOptions,
  processOptions: ProcessEnvFileOptions = {},
) {
  const exists = existsSync(envFile.path);

  if (exists && options.skipExisting) {
    console.log(
      styleText("yellow", `⏭️  Skipping ${envFile.name} (already exists)`),
    );

    return {
      created: false,
      variables: parseEnvFile(readEnvFile(envFile.path)),
    };
  }

  if (exists && !options.force) {
    const overwrite = yield* Prompt.run(
      Prompt.Confirm({
        message: styleText(
          "yellow",
          `⚠️  ${envFile.name}/.env already exists. Overwrite?`,
        ),
      }),
    );

    if (!overwrite) {
      console.log(styleText("gray", `   Skipped ${envFile.name}`));

      return {
        created: false,
        variables: parseEnvFile(readEnvFile(envFile.path)),
      };
    }
  }

  const sampleContent = readEnvFile(envFile.samplePath);
  let variables = parseEnvFile(sampleContent);

  if (options.auto) {
    variables = generateEnvValues(variables, sharedValues);
    let derivedSharedValues = sharedValues;

    if (processOptions.useGeneratedSharedValues) {
      derivedSharedValues = extractSharedValues(variables);
    }

    variables = enhanceVariablesWithDerivedValues(
      variables,
      derivedSharedValues,
      envFile.name,
    );
  } else if (options.interactive) {
    variables = yield* promptForValues(variables);
  }

  const envContent = buildEnvContent(variables);
  writeEnvFile(envFile.path, envContent);

  console.log(styleText("green", `✅ Created ${envFile.name}/.env`));

  return {
    created: true,
    variables,
  } satisfies ProcessEnvFileResult;
});

const promptForValues = Effect.fn("promptForValues")(function* (
  variables: EnvVariable[],
) {
  const updatedVariables: EnvVariable[] = [];

  for (const variable of variables) {
    if (variable.isEmpty || variable.isComment || !variable.key) {
      updatedVariables.push(variable);
      continue;
    }

    const input = yield* Prompt.run(
      Prompt.String({
        message: styleText(
          "cyan",
          `Enter value for ${variable.key} (default: ${variable.value})`,
        ),
      }),
    );

    const inputValue = input.trim();
    const value = inputValue === "" ? variable.value : inputValue;

    updatedVariables.push({
      ...variable,
      value,
    });
  }

  return updatedVariables;
});

export const generate = Effect.fn("generate")(function* (
  options: CliOptions,
  rootPath: string = ROOT_PATH,
) {
  console.log(
    styleText(["bold", "blue"], "\n🚀 Lootlog Environment Configuration\n"),
  );

  const mode = options.interactive ? "Interactive" : "Auto-generate";
  console.log(styleText("gray", `Mode: ${mode}`));
  console.log(styleText("gray", `Skip existing: ${options.skipExisting}`));
  console.log(styleText("gray", `Force overwrite: ${options.force}\n`));

  console.log(styleText("gray", "Discovering .env.example files...\n"));
  const envFiles = yield* Effect.promise(() => discoverEnvFiles(rootPath));

  console.log(
    styleText("gray", `Found ${envFiles.length} environment files:\n`),
  );

  let sharedValues = new Map<string, string>();

  if (options.auto && (!options.force || options.skipExisting)) {
    for (const secretKey of SHARED_SERVICE_SECRET_KEYS) {
      for (const envFile of envFiles) {
        if (!existsSync(envFile.path)) continue;

        const value = extractSharedValues(
          parseEnvFile(readEnvFile(envFile.path)),
        ).get(secretKey);

        if (value === undefined) continue;
        const previous = sharedValues.get(secretKey);

        if (!value || (previous !== undefined && previous !== value)) {
          throw new Error(
            `Invalid or inconsistent ${secretKey} in existing .env files. Align the root and relevant application values or regenerate all files with --force.`,
          );
        }

        sharedValues.set(secretKey, value);
      }
    }
  }

  let createdCount = 0;
  let skippedCount = 0;
  const rootEnvFile = envFiles.find((envFile) => envFile.name === "root");
  const appEnvFiles = envFiles.filter((envFile) => envFile.name !== "root");

  if (rootEnvFile) {
    console.log(styleText("bold", `\n📦 Processing root configuration...\n`));

    const rootResult = yield* processEnvFile(
      rootEnvFile,
      sharedValues,
      options,
      {
        useGeneratedSharedValues: true,
      },
    );

    if (rootResult.created) {
      createdCount++;
    } else {
      skippedCount++;
    }

    sharedValues = new Map([
      ...sharedValues,
      ...extractSharedValues(rootResult.variables),
    ]);

    console.log(
      styleText(
        "gray",
        `\n✨ Extracted ${sharedValues.size} shared values for apps\n`,
      ),
    );
  }

  for (const envFile of appEnvFiles) {
    const result = yield* processEnvFile(envFile, sharedValues, options);

    if (result.created) {
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(styleText(["bold", "green"], `\n✨ Configuration complete!\n`));
  console.log(styleText("gray", `Created: ${createdCount}`));
  console.log(styleText("gray", `Skipped: ${skippedCount}`));

  if (options.auto) {
    console.log(
      styleText(
        "yellow",
        `\n⚠️  Note: Some values (Discord tokens, external API keys) are set to placeholders.`,
      ),
    );
    console.log(
      styleText(
        "yellow",
        `   Please update them manually in the respective .env files.\n`,
      ),
    );
  }

  console.log(
    styleText(
      "green",
      `\n🎉 You can now run local dependencies: docker compose up -d\n`,
    ),
  );
});

export const generateCommand = Command.make(
  "generate",
  {
    interactive: Flag.Boolean("interactive").pipe(
      Flag.withAlias("i"),
      Flag.withDescription(
        "Prompt for each environment variable value instead of generating smart defaults",
      ),
      Flag.withDefault(false),
    ),
    skipExisting: Flag.Boolean("skip-existing").pipe(
      Flag.withAlias("s"),
      Flag.withDescription("Skip files that already exist"),
      Flag.withDefault(false),
    ),
    force: Flag.Boolean("force").pipe(
      Flag.withAlias("f"),
      Flag.withDescription("Overwrite existing files without asking"),
      Flag.withDefault(false),
    ),
  },
  ({ interactive, skipExisting, force }) =>
    generate({ auto: !interactive, interactive, skipExisting, force }),
).pipe(
  Command.withDescription(
    "Generate .env files from every .env.example in the monorepo. Shared values (database credentials, RabbitMQ, Redis, activity signing) are generated once and reused across all services.",
  ),
  Command.withExamples([
    {
      command: "bun run env:generate",
      description: "Auto-generate with smart defaults",
    },
    {
      command: "bun run env:generate --interactive",
      description: "Interactive mode",
    },
    {
      command: "bun run env:generate --skip-existing",
      description: "Only create missing files",
    },
    {
      command: "bun run env:generate --force",
      description: "Overwrite all files",
    },
  ]),
);
