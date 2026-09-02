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

const UNCONSTRAINED_JSON_FIELDS = [
  "localData",
  "effective",
  "overrides",
  "set",
] as const;

const restoreUnconstrainedJsonObjects = (source: string): string => {
  for (const field of UNCONSTRAINED_JSON_FIELDS) {
    const typePattern = new RegExp(
      `(readonly ${field}\\??: \\{ readonly \\[x: string\\]: )(never|Schema\\.Json)(;? \\})`,
      "g",
    );
    const typeMatches = source.match(typePattern) ?? [];
    if (typeMatches.length !== 1) {
      throw new Error(
        `${field} JSON object type: expected one source shape, found ${typeMatches.length}`,
      );
    }
    source = source.replace(typePattern, "$1Schema.Json$3");

    const schemaPattern = new RegExp(
      `(${field}: (?:Schema\\.optionalKey\\(\\s*)?Schema\\.Record\\(\\s*Schema\\.String,\\s*)(Schema\\.Never|Schema\\.Json(?:\\.annotate\\(\\{ expected: "JSON value" \\}\\))?)(,?\\s*\\))`,
      "g",
    );
    const schemaMatches = source.match(schemaPattern) ?? [];
    if (schemaMatches.length !== 1) {
      throw new Error(
        `${field} JSON object schema: expected one source shape, found ${schemaMatches.length}`,
      );
    }
    source = source.replace(
      schemaPattern,
      '$1Schema.Json.annotate({ expected: "JSON value" })$3',
    );
  }

  return source;
};

export const restoreNullableSchemas = restoreUnconstrainedJsonObjects;
