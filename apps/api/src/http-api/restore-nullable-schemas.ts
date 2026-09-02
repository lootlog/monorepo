export const NULLABLE_JSON_SCHEMA_NAMES = [
  "TimerSettingsResponseDto__schema0",
  "NotificationTargetResponseDto__schema0",
  "GuildNotificationRulesResponseDto__schema0",
  "NotificationRuleResponseDto__schema0",
  "NotificationJobsResponseDto__schema0",
  "NotificationTargetWithTestTriggerResponseDto__schema0",
  "WatchedItemResponseDto__schema0",
  "SoundSettingsResponseDto__schema0",
  "EventMutationResponseDto__schema0",
  "EventOverviewResponseDto__schema0",
  "EventKillHistoryResponseDto__schema0",
  "EventMemberKillHistoryResponseDto__schema0",
  "KillDetailResponseDto__schema0",
  "GuildDocumentResponseDto__schema0",
  "GuildDocumentHistorySnapshotResponseDto__schema0",
  "UpdateGuildDocumentDto__schema0",
] as const;

const BONUS_BREAKDOWN_SCHEMA_NAMES = [
  "KillDetailResponseDto__schema0",
  "EventMemberKillHistoryResponseDto__schema0",
  "EventKillHistoryResponseDto__schema0",
] as const;

const replaceExactCount = (
  source: string,
  original: string,
  replacement: string,
  expectedCount: number,
  label: string,
): string => {
  const originalCount = source.split(original).length - 1;
  const replacementCount = source.split(replacement).length - 1;

  if (originalCount + replacementCount !== expectedCount) {
    throw new Error(
      `${label}: expected ${expectedCount} source shapes, found ${originalCount} original and ${replacementCount} restored`,
    );
  }

  return source.replaceAll(original, replacement);
};

const restoreReservationReminderSchemas = (source: string): string => {
  const requiredPattern =
    /^([ \t]*)reminderMinutesBefore: Schema\.(?:Literals\(\[0, 5, 15, 30\]\)|Union\(\[\s*Schema\.Literals\(\[0, 5, 15, 30\]\),\s*Schema\.Null,?\s*\]\)),/gm;
  const requiredMatches = source.match(requiredPattern) ?? [];
  if (requiredMatches.length !== 5) {
    throw new Error(
      `required reservation reminder schema: expected 5 source shapes, found ${requiredMatches.length}`,
    );
  }
  source = source.replace(requiredPattern, (_match, indentation: string) => {
    const itemIndentation = `${indentation}  `;
    return `${indentation}reminderMinutesBefore: Schema.Union([\n${itemIndentation}Schema.Literals([0, 5, 15, 30]),\n${itemIndentation}Schema.Null,\n${indentation}]),`;
  });

  const optionalPattern =
    /^([ \t]*)reminderMinutesBefore: Schema\.optionalKey\(\s*(?:Schema\.Literals\(\[0, 5, 15, 30\]\)|Schema\.Union\(\[\s*Schema\.Literals\(\[0, 5, 15, 30\]\),\s*Schema\.Null,?\s*\]\))[,]?\s*\),/gm;
  const optionalMatches = source.match(optionalPattern) ?? [];
  if (optionalMatches.length !== 2) {
    throw new Error(
      `optional reservation reminder schema: expected 2 source shapes, found ${optionalMatches.length}`,
    );
  }

  return source.replace(optionalPattern, (_match, indentation: string) => {
    const itemIndentation = `${indentation}  `;
    return `${indentation}reminderMinutesBefore: Schema.optionalKey(\n${itemIndentation}Schema.Union([Schema.Literals([0, 5, 15, 30]), Schema.Null]),\n${indentation}),`;
  });
};

const restoreNullableJsonSchema = (
  source: string,
  schemaName: string,
): string => {
  const typePattern = new RegExp(
    `(export type ${schemaName} =[\\s\\S]*?)(;\\nexport const ${schemaName} =)`,
  );
  const typeMatch = typePattern.exec(source);
  if (typeMatch === null) {
    throw new Error(`${schemaName}: generated type alias was not found`);
  }
  if (!typeMatch[1]?.trimEnd().endsWith("| null")) {
    source = source.replace(typePattern, "$1\n  | null$2");
  }

  const recursivePattern = new RegExp(
    `(const __recursive_${schemaName}\\s*=\\s*Schema\\.Union\\(\\[)([\\s\\S]*?)(\\n[ \\t]*\\]\\)\\.annotate\\(\\{\\s*identifier:\\s*"${schemaName}",?\\s*\\}\\);)`,
  );
  const recursiveMatch = recursivePattern.exec(source);
  if (recursiveMatch === null) {
    throw new Error(`${schemaName}: generated recursive schema was not found`);
  }
  if (!recursiveMatch[2]?.trimEnd().endsWith("Schema.Null,")) {
    source = source.replace(recursivePattern, "$1$2\n  Schema.Null,$3");
  }

  return source;
};

const restoreNullableBonusBreakdown = (
  source: string,
  schemaName: string,
): string => {
  const typePattern = new RegExp(
    `(readonly bonusBreakdown\\?:(?:(?!readonly bonusBreakdown\\?:)[\\s\\S])*?\\|\\s*\\{\\s*readonly \\[x: string\\]: ${schemaName};?\\s*\\})(\\s*\\| null)?;`,
  );
  const typeMatch = typePattern.exec(source);
  if (typeMatch === null) {
    throw new Error(`${schemaName}: bonusBreakdown type was not found`);
  }
  if (typeMatch[2] === undefined) {
    source = source.replace(typePattern, "$1\n            | null;");
  }

  const schemaPattern = new RegExp(
    `(bonusBreakdown: Schema\\.optionalKey\\(\\s*Schema\\.Union\\(\\[(?:(?!bonusBreakdown: Schema\\.optionalKey)[\\s\\S])*?Schema\\.Record\\(\\s*Schema\\.String,\\s*${schemaName},?\\s*\\),)(\\s*Schema\\.Null,)?(\\s*\\]\\),\\s*\\),)`,
  );
  const schemaMatch = schemaPattern.exec(source);
  if (schemaMatch === null) {
    throw new Error(`${schemaName}: bonusBreakdown schema was not found`);
  }
  if (schemaMatch[2] === undefined) {
    source = source.replace(schemaPattern, "$1\n              Schema.Null,$3");
  }

  return source;
};

export const restoreNullableSchemas = (generatedSource: string): string => {
  let source = generatedSource;

  for (const schemaName of NULLABLE_JSON_SCHEMA_NAMES) {
    source = restoreNullableJsonSchema(source, schemaName);
  }

  source = replaceExactCount(
    source,
    "readonly reminderMinutesBefore: 0 | 5 | 15 | 30;",
    "readonly reminderMinutesBefore: 0 | 5 | 15 | 30 | null;",
    5,
    "required reservation reminder type",
  );
  source = replaceExactCount(
    source,
    "readonly reminderMinutesBefore?: 0 | 5 | 15 | 30;",
    "readonly reminderMinutesBefore?: 0 | 5 | 15 | 30 | null;",
    2,
    "optional reservation reminder type",
  );
  source = restoreReservationReminderSchemas(source);

  for (const schemaName of BONUS_BREAKDOWN_SCHEMA_NAMES) {
    source = restoreNullableBonusBreakdown(source, schemaName);
  }

  return source;
};
