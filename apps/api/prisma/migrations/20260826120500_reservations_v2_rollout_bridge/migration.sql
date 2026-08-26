-- Keep legacy and v2 reservation writers compatible during the rolling API
-- deployment. Remove this bridge only in a later release after legacy writers
-- have been retired and the legacy columns can be contracted separately.
CREATE FUNCTION "Reservation_rollout_bridge"()
RETURNS TRIGGER AS $$
DECLARE
  legacy_write BOOLEAN;
  v2_write BOOLEAN;
  matched_member RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    legacy_write := NEW."spotId" IS NULL;
    v2_write := NEW."reservationId" IS NULL;

    IF legacy_write THEN
      NEW."spotName" := COALESCE(NEW."spotName", NEW."reservationId");
      NEW."spotId" := COALESCE(
        NEW."spotId",
        NULLIF(
          trim(
            BOTH '-' FROM regexp_replace(
              translate(
                lower(trim(NEW."reservationId")),
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
        concat('legacy-', NEW."id")
      );
      NEW."startsAt" := COALESCE(NEW."startsAt", NEW."fromDate");
      NEW."endsAt" := COALESCE(NEW."endsAt", NEW."toDate");
      NEW."createdAt" := COALESCE(NEW."createdDate", NEW."createdAt");

      SELECT
        member."globalUserId",
        member."userId",
        member."name",
        member."avatar"
      INTO matched_member
      FROM "Member" AS member
      WHERE member."guildId" = NEW."guildId"
        AND member."userId" = NEW."createdBy"
      ORDER BY member."active" DESC, member."updatedAt" DESC
      LIMIT 1;

      NEW."createdByUserId" := COALESCE(
        NEW."createdByUserId",
        matched_member."globalUserId"
      );
      NEW."authorDisplayName" := COALESCE(
        NEW."authorDisplayName",
        matched_member."name",
        'Nieznany użytkownik'
      );
      NEW."authorAvatarUrl" := COALESCE(
        NEW."authorAvatarUrl",
        CASE
          WHEN matched_member."avatar" IS NULL THEN NULL
          ELSE concat(
            'https://cdn.discordapp.com/avatars/',
            matched_member."userId",
            '/',
            matched_member."avatar",
            CASE
              WHEN starts_with(matched_member."avatar", 'a_') THEN '.gif'
              ELSE '.webp'
            END,
            '?size=128'
          )
        END
      );
    ELSIF v2_write THEN
      NEW."reservationId" := NEW."spotName";
      NEW."createdDate" := NEW."createdAt";
      NEW."fromDate" := NEW."startsAt";
      NEW."toDate" := NEW."endsAt";

      SELECT member."userId"
      INTO matched_member
      FROM "Member" AS member
      WHERE member."guildId" = NEW."guildId"
        AND member."globalUserId" = NEW."createdByUserId"
      ORDER BY member."active" DESC, member."updatedAt" DESC
      LIMIT 1;

      NEW."createdBy" := matched_member."userId";
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW."spotName" IS DISTINCT FROM OLD."spotName" THEN
      NEW."reservationId" := NEW."spotName";
    ELSIF NEW."reservationId" IS DISTINCT FROM OLD."reservationId" THEN
      NEW."spotName" := NEW."reservationId";
    END IF;

    IF NEW."startsAt" IS DISTINCT FROM OLD."startsAt" THEN
      NEW."fromDate" := NEW."startsAt";
    ELSIF NEW."fromDate" IS DISTINCT FROM OLD."fromDate" THEN
      NEW."startsAt" := NEW."fromDate";
    END IF;

    IF NEW."endsAt" IS DISTINCT FROM OLD."endsAt" THEN
      NEW."toDate" := NEW."endsAt";
    ELSIF NEW."toDate" IS DISTINCT FROM OLD."toDate" THEN
      NEW."endsAt" := NEW."toDate";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Reservation_rollout_bridge_trigger"
BEFORE INSERT OR UPDATE ON "Reservation"
FOR EACH ROW
EXECUTE FUNCTION "Reservation_rollout_bridge"();
