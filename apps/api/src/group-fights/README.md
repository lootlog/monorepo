# Group fights

The API owns Organization group fight records. Apply the group-fights database
migration before deploying the API, then deploy the generated clients, Web and
Game client. Existing Organization settings default to accepting all qualifying
2v2 through 10v10 fights. Members must opt in per character and receive the new
read/write capabilities. Existing cache entries without the settings are evicted.

A transaction stores the fight, merged participants and authenticated submission.
Organization-scoped advisory locks serialize retries and concurrent observers.
The canonical identity uses world, map, sorted character IDs and the exact server
ending timestamp. This intentionally avoids merging nearby rematches. Observers
with different ending timestamps or incomplete rosters cannot be proven to have
seen the same fight and are not merged. This identity assumption still needs
characterization with simultaneous recordings from multiple game clients.

Only current members with Lootlog access contribute to rankings. Attribution uses
Organization-scoped submissions and catching settings matched by account and
character. Conflicting ownership claims remain unassigned. Details expose a
battlelog link only from the viewer's own submissions. Account deletion removes
submission attribution while preserving the Organization's accepted fight record.

Run `bun run test:integration` in `apps/api` with Docker available to verify the
migration, concurrent submission deduplication, rematch separation, participation
times and Organization isolation against disposable PostgreSQL. No historical
battlelog backfill is possible because old records have no map qualification.
