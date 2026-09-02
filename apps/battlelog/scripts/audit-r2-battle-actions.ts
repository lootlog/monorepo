import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { BattleProcessor, type ParsedMove } from "@lootlog/battle-processor";
import { Client } from "pg";
import { gunzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";

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

const SAMPLE_SIZE = Number.parseInt(
  process.env.AUDIT_SAMPLE_SIZE ?? "1000",
  10,
);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const mechanicsDocPath = resolve(
  repoRoot,
  "apps/docs/content/docs/battle-panel-mechanics.mdx",
);

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env ${key}`);
  }
  return value;
};

const createR2Client = () =>
  new S3Client({
    region: process.env.R2_REGION ?? "auto",
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

const fetchLatestBattleIdsFromDb = async (): Promise<SampleSource | null> => {
  const connectionString = process.env.POSTGRESQL_CONNECTION_URI;
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

  const translations = JSON.parse(translationsRaw) as Record<string, string>;
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
}) => `---
title: Mechanika walk i audyt battle panelu
description: Zakres mechanik Margonem obsługiwanych przez battle panel oraz raport pokrycia akcji z R2.
---

Źródła: dokumentacja Margonem "Mechanika walk", obecne zachowanie \`@lootlog/battle-processor\` oraz próbka R2.

## Zakres

Ten panel jest log analytics, nie symulatorem Margonem. W tej iteracji obejmuje PvP, Otchłań i walki grupowe PvP. PvE, exp, loot i szczegółowe NPC pozostają poza zakresem.

## Ostatni audyt R2

- Źródło próby: \`${params.source.kind}\`
- Ostrzeżenie: ${params.source.warning ?? "brak"}
- Poprawnie pobrane payloady: ${params.parsedCount}
- Unikalne typy akcji: ${params.totalActionTypes}
- Pokrycie procesora: ${params.processorHandledPercentage}%

## Największe luki procesora

${params.unknownProcessorActions
  .slice(0, 20)
  .map((action) => `- \`${action.actionType}\`: ${action.count}`)
  .join("\n")}

## Największe luki UI parsera

${params.missingUiActions
  .slice(0, 20)
  .map((action) => `- \`${action.actionType}\`: ${action.count}`)
  .join("\n")}

## Największe braki tłumaczeń

${params.missingTranslations
  .slice(0, 20)
  .map((action) => `- \`${action.actionType}\`: ${action.count}`)
  .join("\n")}

## Aktualne zasady implementacyjne

- Timeline jest liczony z ruchów walki i snapshotów wojowników.
- Historyczne obiekty R2 w formacie parsed-only są obsługiwane bez backfillu.
- Nowe obiekty R2 mogą zawierać opcjonalne \`sourceEvents\`, żeby kolejne audyty miały dostęp do pierwotnych eventów.
- Jeśli DB nie pozwala ustalić najnowszych walk po \`createdAt\`, skrypt jawnie raportuje fallback do pierwszej strony listowania R2.
`;

const main = async () => {
  const bucketName = getRequiredEnv("R2_BUCKET_NAME");
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

  console.log(JSON.stringify(report, null, 2));

  if (process.argv.includes("--write-doc")) {
    await writeFile(
      mechanicsDocPath,
      buildMarkdownReport({
        source,
        parsedCount: payloads.length,
        processorHandledPercentage,
        totalActionTypes: actionCounts.size,
        unknownProcessorActions,
        missingUiActions,
        missingTranslations,
      }),
      "utf-8",
    );
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`Audit failed: ${message}`);
  process.exitCode = 1;
});
