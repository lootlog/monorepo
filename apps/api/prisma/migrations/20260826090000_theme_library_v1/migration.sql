INSERT INTO "UserSettingDocument" (
  "userId",
  "domain",
  "scopeType",
  "scopeId",
  "overrides",
  "schemaVersion",
  "updatedAt"
)
SELECT
  "userId",
  'appearance',
  'USER'::"SettingsScopeType",
  "userId",
  jsonb_build_object('theme', "theme"),
  3,
  CURRENT_TIMESTAMP
FROM "UserSettings"
ON CONFLICT ("userId", "domain", "scopeType", "scopeId") DO NOTHING;

UPDATE "UserSettingDocument"
SET
  "overrides" = jsonb_set(
    "overrides",
    '{theme}',
    CASE
      WHEN jsonb_typeof("overrides"->'theme') = 'object'
        THEN "overrides"->'theme'
      ELSE jsonb_build_object(
        'revision', 1,
        'selection', jsonb_build_object(
          'kind', 'preset',
          'presetId', CASE
            WHEN ("overrides"->>'theme') IN (
              'default', 'cyberpunk', 'pastel', 'fantasy', 'shonen',
              'onepiece', 'anime', 'waguri', 'goth', 'halloween',
              'realmadrid', 'realmadrid-3rd', 'barcelona', 'rukia', 'rias',
              'cat-pink', 'cat-purple', 'cat-blue', 'cat-random'
            ) THEN "overrides"->>'theme'
            ELSE 'default'
          END
        ),
        'customThemes', '[]'::jsonb,
        'specialOverrides', '{}'::jsonb
      )
    END,
    true
  ),
  "schemaVersion" = 4,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "domain" = 'appearance'
  AND "scopeType" = 'USER'::"SettingsScopeType";

ALTER TABLE "UserSettings" DROP COLUMN "theme";
