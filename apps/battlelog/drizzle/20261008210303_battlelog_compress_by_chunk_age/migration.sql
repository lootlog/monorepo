-- TimescaleDB 2.24's policy_compression casts compress_after only for time
-- and integer partition columns; for the UUIDv7 battle ID it fails with
-- "case not found". The created_before form selects chunks by creation time
-- instead. A 7-day chunk is created when its first battle arrives, so
-- 14 days after creation is 7 days after it closes, as before.
DO $$
BEGIN
	IF EXISTS (SELECT FROM pg_extension WHERE extname = 'timescaledb') THEN
		CALL remove_columnstore_policy('battles', if_exists => true);
		CALL add_columnstore_policy('battles', created_before => INTERVAL '14 days');
	END IF;
END $$;
