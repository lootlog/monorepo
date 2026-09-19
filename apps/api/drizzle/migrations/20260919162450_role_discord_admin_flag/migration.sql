-- Last Discord Administrator flag seen for the role. Existing rows stay NULL on
-- purpose: stored permissions cannot tell a Lootlog-granted ADMIN from one
-- derived from Discord, so a backfill from them would let the next role update
-- strip a Lootlog-granted ADMIN. NULL makes the next event record the flag
-- without changing permissions.
ALTER TABLE "Role" ADD COLUMN "discordAdmin" boolean;
