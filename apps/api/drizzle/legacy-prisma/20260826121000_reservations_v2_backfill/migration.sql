-- Idempotent in-place backfill. No legacy column is removed or overwritten.
-- Re-running this statement only fills rows that still need the v2 projection.
CREATE TEMP TABLE "_ReservationV2Audit" AS
SELECT
  count(*) AS "rowCount",
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          "id"::text,
          "fromDate"::text,
          "toDate"::text,
          COALESCE("comment", '<null>')
        ),
        ',' ORDER BY "id"
      ),
      ''
    )
  ) AS "legacyChecksum"
FROM "Reservation";

UPDATE "Reservation" AS reservation
SET
  "spotId" = COALESCE(
    reservation."spotId",
    NULLIF(
      trim(
        BOTH '-' FROM regexp_replace(
          translate(
            lower(trim(reservation."reservationId")),
            'ąćęłńóśźż',
            'acelnoszz'
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ),
      ''
    ),
    concat('legacy-', reservation."id")
  ),
  "spotName" = COALESCE(reservation."spotName", reservation."reservationId"),
  "startsAt" = COALESCE(reservation."startsAt", reservation."fromDate"),
  "endsAt" = COALESCE(reservation."endsAt", reservation."toDate"),
  "createdAt" = COALESCE(reservation."createdDate", reservation."createdAt"),
  "createdByUserId" = COALESCE(
    reservation."createdByUserId",
    (
      SELECT member."globalUserId"
      FROM "Member" AS member
      WHERE member."guildId" = reservation."guildId"
        AND member."userId" = reservation."createdBy"
      ORDER BY member."active" DESC, member."updatedAt" DESC
      LIMIT 1
    )
  ),
  "authorDisplayName" = COALESCE(
    reservation."authorDisplayName",
    (
      SELECT member."name"
      FROM "Member" AS member
      WHERE member."guildId" = reservation."guildId"
        AND member."userId" = reservation."createdBy"
      ORDER BY member."active" DESC, member."updatedAt" DESC
      LIMIT 1
    ),
    'Nieznany użytkownik'
  ),
  "authorAvatarUrl" = COALESCE(
    reservation."authorAvatarUrl",
    (
      SELECT CASE
        WHEN member."avatar" IS NULL THEN NULL
        ELSE concat(
          'https://cdn.discordapp.com/avatars/',
          member."userId",
          '/',
          member."avatar",
          CASE WHEN starts_with(member."avatar", 'a_') THEN '.gif' ELSE '.webp' END,
          '?size=128'
        )
      END
      FROM "Member" AS member
      WHERE member."guildId" = reservation."guildId"
        AND member."userId" = reservation."createdBy"
      ORDER BY member."active" DESC, member."updatedAt" DESC
      LIMIT 1
    )
  )
WHERE reservation."spotId" IS NULL
   OR reservation."spotName" IS NULL
   OR reservation."startsAt" IS NULL
   OR reservation."endsAt" IS NULL
   OR reservation."authorDisplayName" IS NULL;

-- Rollout verification: this migration aborts instead of silently contracting
-- when a source date/name could not be transferred.
DO $$
DECLARE
  expected_count BIGINT;
  expected_checksum TEXT;
  actual_count BIGINT;
  actual_checksum TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Reservation"
    WHERE "spotId" IS NULL
       OR "spotName" IS NULL
       OR "startsAt" IS NULL
       OR "endsAt" IS NULL
       OR "authorDisplayName" IS NULL
  ) THEN
    RAISE EXCEPTION 'Reservation v2 backfill left required fields unresolved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Reservation"
    WHERE "startsAt" IS DISTINCT FROM "fromDate"
       OR "endsAt" IS DISTINCT FROM "toDate"
       OR "createdAt" IS DISTINCT FROM "createdDate"
       OR "spotName" IS DISTINCT FROM "reservationId"
  ) THEN
    RAISE EXCEPTION 'Reservation v2 backfill changed a legacy date or spot name';
  END IF;

  SELECT "rowCount", "legacyChecksum"
  INTO expected_count, expected_checksum
  FROM "_ReservationV2Audit";

  SELECT
    count(*),
    md5(
      COALESCE(
        string_agg(
          concat_ws(
            '|',
            "id"::text,
            "fromDate"::text,
            "toDate"::text,
            COALESCE("comment", '<null>')
          ),
          ',' ORDER BY "id"
        ),
        ''
      )
    )
  INTO actual_count, actual_checksum
  FROM "Reservation";

  IF actual_count <> expected_count OR actual_checksum <> expected_checksum THEN
    RAISE EXCEPTION 'Reservation v2 backfill did not preserve row count/date/comment checksum';
  END IF;
END $$;

DROP TABLE "_ReservationV2Audit";
