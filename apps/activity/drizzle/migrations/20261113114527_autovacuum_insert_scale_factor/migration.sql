-- "UserOnlineInterval" is append-mostly; vacuum on 1% new rows instead of 20%
-- so the visibility map stays current for index-only scans.
ALTER TABLE "UserOnlineInterval" SET (autovacuum_vacuum_insert_scale_factor = 0.01);
