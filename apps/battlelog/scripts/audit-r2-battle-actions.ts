import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { BattleProcessor, type ParsedMove } from "@lootlog/battle-processor";
import { Config, Effect, Option, Redacted, Schema } from "effect";
import { Client } from "pg";
import { gunzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

type R2BattlePayload = {
  battleId: string;
  timestamp: string;
  rawData: {
    accountId: string;
    characterId: string;
    world: string;
    events: ParsedMove[];
    sourceEvents?: unknown[];
  };
};

type SampleSource =
  | {
      kind: "db-latest";
      warning: null;
      battleIds: string[];
    }
  | {
      kind: "r2-first-list-page";
      warning: string;
      battleIds: string[];
    };

const auditConfig = await Effect.runPromise(
  Config.all({
    sampleSize: Config.int("AUDIT_SAMPLE_SIZE").pipe(Config.withDefault(1000)),
    databaseUrl: Config.option(Config.redacted("POSTGRESQL_CONNECTION_URI")),
    r2Region: Config.string("R2_REGION").pipe(Config.withDefault("auto")),
    r2Endpoint: Config.string("R2_ENDPOINT"),
    r2AccessKeyId: Config.redacted("R2_ACCESS_KEY_ID"),
    r2SecretAccessKey: Config.redacted("R2_SECRET_ACCESS_KEY"),
    r2BucketName: Config.string("R2_BUCKET_NAME"),
  }),
);

const SAMPLE_SIZE = auditConfig.sampleSize;

const scriptDir = dirname(fileURLToPath(import.meta.url));

const appRoot = resolve(scriptDir, "..");

const repoRoot = resolve(appRoot, "../..");

const createR2Client = () =>
  new S3Client({
    region: auditConfig.r2Region,
    endpoint: auditConfig.r2Endpoint,
    credentials: {
      accessKeyId: Redacted.value(auditConfig.r2AccessKeyId),
      secretAccessKey: Redacted.value(auditConfig.r2SecretAccessKey),
    },
  });

const fetchLatestBattleIdsFromDb = async (): Promise<SampleSource | null> => {
  const configuredDatabaseUrl = Option.getOrUndefined(auditConfig.databaseUrl);

  const connectionString =
    configuredDatabaseUrl === undefined
      ? undefined
      : Redacted.value(configuredDatabaseUrl);

  if (!connectionString) {
    return null;
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const result = await client.query<{ id: string }>(
      'select id from battles order by "createdAt" desc limit $1',
      [SAMPLE_SIZE],
    );

    if (result.rows.length === 0) {
      return {
        kind: "r2-first-list-page",
        warning:
          "DB query succeeded but returned no battles; falling back to the first R2 list page, which is not guaranteed to be latest.",
        battleIds: [],
      };
    }

    return {
      kind: "db-latest",
      warning: null,
      battleIds: result.rows.map((row) => row.id),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown DB error";

    return {
      kind: "r2-first-list-page",
      warning: `Could not read latest battle IDs from DB (${message}); falling back to the first R2 list page, which is not guaranteed to be latest.`,
      battleIds: [],
    };
  } finally {
    await client.end().catch(() => undefined);
  }
};

const listFirstR2BattlePage = async (
  client: S3Client,
  bucketName: string,
): Promise<string[]> => {
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "battles/",
      MaxKeys: SAMPLE_SIZE,
    }),
  );

  return (response.Contents ?? [])
    .map((object) => object.Key ?? "")
    .filter((key) => key.startsWith("battles/") && key.endsWith(".json"))
    .map((key) => key.replace(/^battles\//, "").replace(/\.json$/, ""));
};

const resolveSampleSource = async (
  client: S3Client,
  bucketName: string,
): Promise<SampleSource> => {
  const dbSource = await fetchLatestBattleIdsFromDb();

  if (dbSource?.kind === "db-latest") {
    return dbSource;
  }

  const battleIds = await listFirstR2BattlePage(client, bucketName);

  return {
    kind: "r2-first-list-page",
    warning:
      dbSource?.warning ??
      "POSTGRESQL_CONNECTION_URI is not configured; using the first R2 list page, which is not guaranteed to be latest.",
    battleIds,
  };
};

const downloadBattle = async (
  client: S3Client,
  bucketName: string,
  battleId: string,
): Promise<R2BattlePayload | null> => {
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: `battles/${battleId}.json`,
      }),
    );

    if (!response.Body) {
      return null;
    }

    const bytes = await response.Body.transformToByteArray();

    const isGzip =
      response.ContentEncoding === "gzip" ||
      response.Metadata?.compressed === "gzip";

    const json = isGzip
      ? gunzipSync(bytes).toString("utf-8")
      : Buffer.from(bytes).toString("utf-8");

    // SAFETY: These first-party R2 objects are written by BattlesService with
    // processor-parsed events matching ParsedMove. This maintenance audit trusts
    // that persisted contract; it does not validate arbitrary uploaded JSON.
    return JSON.parse(json) as R2BattlePayload;
  } catch {
    return null;
  }
};

const createSyntheticWarriors = (moves: ParsedMove[]) => {
  const warriorIds = Array.from(
    new Set(
      moves.flatMap((move) =>
        [move.attackerId, move.defenderId].filter((id): id is string => !!id),
      ),
    ),
  );

  return warriorIds.reduce<
    Record<
      string,
      {
        originalId: number;
        name: string;
        lvl: number;
        prof: string;
        icon: string;
        team: number;
      }
    >
  >((acc, warriorId, index) => {
    const originalId = Number.parseInt(warriorId, 10);
    acc[warriorId] = {
      originalId: Number.isNaN(originalId) ? index + 1 : originalId,
      name: `Warrior ${warriorId}`,
      lvl: 1,
      prof: "unknown",
      icon: "",
      team: index % 2 === 0 ? 1 : 2,
    };

    return acc;
  }, {});
};

const readUiSupportedActions = async () => {
  const parserPath = resolve(
    repoRoot,
    "apps/web/src/components/battle/utils/battle-actions-parser.ts",
  );

  const constantsPath = resolve(
    repoRoot,
    "apps/web/src/components/battle/utils/battle-action-constants.ts",
  );

  const translationsPath = resolve(
    repoRoot,
    "apps/web/src/i18n/translations/battle.json",
  );

  const [parser, constants, translationsRaw] = await Promise.all([
    readFile(parserPath, "utf-8"),
    readFile(constantsPath, "utf-8"),
    readFile(translationsPath, "utf-8"),
  ]);

  const actionLiteralPattern =
    /["']([+-]?[a-zA-Z0-9_-]+(?:_per)?(?:-[a-z]+)?)["']/g;

  const supported = new Set<string>();

  for (const source of [parser, constants]) {
    for (const match of source.matchAll(actionLiteralPattern)) {
      if (match[1]) {
        supported.add(match[1]);
      }
    }
  }

  const translations = Schema.decodeUnknownSync(
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
  )(translationsRaw);

  return {
    supported,
    translated: new Set(Object.keys(translations)),
  };
};

const buildMarkdownReport = (params: {
  source: SampleSource;
  parsedCount: number;
  processorHandledPercentage: number;
  totalActionTypes: number;
  unknownProcessorActions: Array<{ actionType: string; count: number }>;
  missingUiActions: Array<{ actionType: string; count: number }>;
  missingTranslations: Array<{ actionType: string; count: number }>;
}) => `# Battle action coverage audit

Generated at: ${new Date().toISOString()}

This operational report describes the sampled stored battle actions. It is not
public documentation or proof of coverage across all battles.

## Sample

- Source: \`${params.source.kind}\`
- Warning: ${params.source.warning ?? "none"}
- Parsed payloads: ${params.parsedCount}
- Unique action types: ${params.totalActionTypes}
- Processor coverage: ${params.processorHandledPercentage}%

If the database cannot supply the latest battle IDs ordered by creation time,
the sample uses the first R2 listing page. That page is not guaranteed to contain
the latest battles.

## Most frequent unhandled processor actions

${params.unknownProcessorActions
  .slice(0, 20)
  .map((action) => `- \`${action.actionType}\`: ${action.count}`)
  .join("\n")}

## Most frequent missing UI parser actions

${params.missingUiActions
  .slice(0, 20)
  .map((action) => `- \`${action.actionType}\`: ${action.count}`)
  .join("\n")}

## Most frequent missing translations

${params.missingTranslations
  .slice(0, 20)
  .map((action) => `- \`${action.actionType}\`: ${action.count}`)
  .join("\n")}
`;

const main = async () => {
  const bucketName = auditConfig.r2BucketName;
  const client = createR2Client();
  const source = await resolveSampleSource(client, bucketName);
  const payloads: R2BattlePayload[] = [];

  for (const battleId of source.battleIds.slice(0, SAMPLE_SIZE)) {
    const payload = await downloadBattle(client, bucketName, battleId);

    if (payload?.rawData?.events?.length) {
      payloads.push(payload);
    }
  }

  const actionCounts = new Map<string, number>();
  const processorActionCounts = new Map<string, number>();
  let processorHandledActions = 0;
  let processorTotalActions = 0;

  for (const payload of payloads) {
    for (const move of payload.rawData.events) {
      for (const action of move.actions) {
        actionCounts.set(
          action.actionType,
          (actionCounts.get(action.actionType) ?? 0) + 1,
        );
      }
    }

    const processor = new BattleProcessor();

    const analysis = processor.processParsedBattle({
      accountId: payload.rawData.accountId,
      characterId: payload.rawData.characterId,
      world: payload.rawData.world,
      events: payload.rawData.events,
      warriors: createSyntheticWarriors(payload.rawData.events),
    });

    processorHandledActions += analysis.actionCoverage.handledActions;
    processorTotalActions += analysis.actionCoverage.totalActions;

    for (const action of analysis.actionCoverage.unknown) {
      processorActionCounts.set(
        action.actionType,
        (processorActionCounts.get(action.actionType) ?? 0) + action.count,
      );
    }
  }

  const ui = await readUiSupportedActions();

  const actionEntries = Array.from(actionCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const missingUiActions = actionEntries
    .filter(([actionType]) => !ui.supported.has(actionType))
    .map(([actionType, count]) => ({ actionType, count }));

  const missingTranslations = actionEntries
    .filter(([actionType]) => !ui.translated.has(actionType))
    .map(([actionType, count]) => ({ actionType, count }));

  const unknownProcessorActions = Array.from(processorActionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([actionType, count]) => ({ actionType, count }));

  const processorHandledPercentage =
    processorTotalActions > 0
      ? Math.round((processorHandledActions / processorTotalActions) * 10000) /
        100
      : 100;

  const report = {
    source,
    parsedPayloads: payloads.length,
    totalActionTypes: actionCounts.size,
    processorHandledPercentage,
    unknownProcessorActions: unknownProcessorActions.slice(0, 50),
    missingUiActions: missingUiActions.slice(0, 50),
    missingTranslations: missingTranslations.slice(0, 50),
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (process.argv.includes("--write-doc")) {
    // Keep operational evidence outside the repository and public documentation.
    const reportDirectory = await mkdtemp(
      resolve(tmpdir(), "lootlog-battle-audit-"),
    );

    const reportPath = resolve(reportDirectory, "battle-actions.md");
    await Bun.write(
      reportPath,
      buildMarkdownReport({
        source,
        parsedCount: payloads.length,
        processorHandledPercentage,
        totalActionTypes: actionCounts.size,
        unknownProcessorActions,
        missingUiActions,
        missingTranslations,
      }),
    );
    console.error(`Audit report written to ${reportPath}`);
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`Audit failed: ${message}`);
  process.exitCode = 1;
});
