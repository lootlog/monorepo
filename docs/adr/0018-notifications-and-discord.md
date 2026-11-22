# 0018. Notifications and Discord

Status: accepted

## Context

Discord anchors every Organization, is the only sign-in provider and carries
Lootlog's notifications. It rate-limits per user, bans IPs that exceed its
invalid-request budget, replays guild events, deduplicates messages only
briefly, and revokes tokens with 401 responses. Lootlog must stay fresh
enough for display without letting a cached or stale Discord answer grant or
revoke access, and without posting a message twice.

Notification facts arrive through RabbitMQ with redelivery. Scheduled jobs
live in PostgreSQL and are triggered by BullMQ entries written after commit,
so a lost entry would strand a job unless something recovers it.

## Decisions

### Notification scheduling and recovery

- **`makeNotificationJobRecovery`** (`apps/api/src/notifications/jobs/notification-job-recovery.ts`): the dispatch queue is a PENDING job's only trigger and its entry is written after the row commits, so each recovery pass re-queues overdue jobs still worth sending and closes stale ones so recurring rules can plan their next occurrence. It re-enqueues by job id because the queue keeps one entry per id.
- **`OVERDUE_AFTER_MS`** (`apps/api/src/notifications/jobs/notification-job-recovery.ts`): two minutes marks a PENDING job as having lost its queue entry, because a due job is normally claimed within seconds.
- **`MISSED_AFTER_MS`** and `staleAt` (`apps/api/src/notifications/jobs/notification-job-recovery.ts`): a reminder closes as stale after 15 minutes because the announced event has started, while a timer warning stays deliverable until its spawn window closes, since timer updates can schedule it late.
- **`closeMissed`** and **`eligibleJobForAttempt`** (`apps/api/src/notifications/jobs/notification-job.repository.ts`): recovery closes only a job nobody claimed meanwhile, so a send in progress wins. A queued retry may claim a job its failed attempt left PROCESSING, but a first attempt never overrides another worker's claim.
- **`NotificationJobInput.occurrenceAt`** (`apps/api/src/notifications/jobs/notification-job-scheduler.ts`): records when a past-due occurrence was due and keys the job, so planning it again cannot send it twice. `alreadyDelivered` also matches SENT or PROCESSING jobs keyed by their moved time before `occurrenceAt` existed.
- **Recurrence** (`apps/api/src/notifications/jobs/notification-job-recurrence.ts`): occurrences that passed while a cycle closed late are skipped rather than sent at once.
- **`rebuildTimer`** (`apps/api/src/notifications/jobs/notification-job-rebuild.ts`): re-reads all matched rules together so a rule edited since it was listed is not rebuilt from its old row, shares one permission lookup per owner, reports each rule's failure without stopping the others, and schedules nothing for a timer whose spawn window has closed.

### Notification delivery

- **`scheduleInstantJobs`** (`apps/api/src/notifications/delivery/notifications-events.handler.ts`): keys each instant job by its source event, so a redelivered event never sends twice. A timer rule rebuild failure fails the whole fact, because rebuilds cancel and recreate jobs and a redelivery is safe while a stale rule is not.
- **`isHeroSightingNews`** and **`HERO_SIGHTING_NOTIFICATION_MAX_AGE_MS`** (`apps/api/src/notifications/delivery/notifications-events.handler.ts`): only heroes that will spawn are announced, never roaming ones, so the finder is not outrun by everyone the message reaches. Repeated confirmations notify once, and detections older than 15 minutes are treated as redeliveries.
- **`NOTIFICATION_DELIVERY_ATTEMPTS`** (`apps/api/src/notifications/jobs/dispatch-queue.ts`): bounds claims by the job's `attemptCount`, which AMQP publish retries and Discord delivery retries share.
- **`DELETED_CHANNEL_ERROR_CODES`** (`apps/api/src/notifications/delivery/notification-delivery-result.ts`): Discord 10003 and the bot's `CHANNEL_NOT_FOUND` mean a deleted channel; 50013 does not, since permissions can be granted back. A failed delivery to a deleted channel removes the notification target like the channel-deleted fact, because the bot may never have reported the deletion. A redelivered failure for an already-failed job only resumes that removal.

### Notification content

- **`buildAllowedMentionsForTarget`** (`apps/api/src/notifications/content/notification-content.service.ts`): derives `allowedMentions` from the admin-authored template before placeholders are filled, so role, @everyone and @here mentions written by admins are forwarded while Member-supplied values never grant a ping. DM targets skip mentions.
- **`buildLootDrawPayload`** (`apps/api/src/notifications/content/notification-content.service.ts`): freezes the draw as announced in the job payload, so the image drawn at dispatch shows that outcome.
- **`makeNotificationImages`** (`apps/api/src/notifications/content/notification-images.ts`): draws images at send time and sends the message without the image if drawing fails.
- **`wheelSvg`** and **`GLYPH_WIDTHS`** (`apps/api/src/notifications/content/loot-draw-card.ts`): the wheel turns by `lootDrawLandingOffset` so the Discord card stops where the Web wheel stops, and text is measured with generous DejaVu Sans Bold glyph widths because SVG text neither wraps nor clips.
- **`formatDiscordTimestamp`** (`apps/api/src/notifications/content/discord-timestamp.ts`): uses `<t:…>` timestamps because Discord renders them in each reader's locale and time zone.

### Discord tokens and member reads

- **`AuthService.rejectIdpToken`** (`apps/api/src/auth/auth.service.ts`): marks each rejected access token with its own marker, so a late 401 for an older token cannot clear a newer token's rejection. Marking failures are logged and never replace the Discord error.
- **`getIdpToken`** (`apps/api/src/auth/auth.service.ts`): drops a rejected or under-scoped cached token and refetches from the auth service, which always holds the token from the latest sign-in.
- **`REJECTED_AUTH_TOKEN_TTL_SECONDS`** and **`AUTH_TOKEN_EXPIRY_MARGIN_SECONDS`** (`apps/api/src/shared/cache.ts`): a rejected token is remembered for seven days, the access token lifetime, because Discord never accepts it again and counts every invalid request against the bot. A cached token stops being served 60 s before it expires.
- **`DiscordGuildMemberClient`** (`apps/api/src/discord/discord-guild-member.client.ts`): member reads always ask Discord, because member sync stores the answer as a fresh sync; only 403 and 404 refusals are cached, since each counts against the invalid-request limit.
- **`createRestClient`** (`apps/api/src/discord/discord-rest-client.factory.ts`): per-user discord.js `REST` clients disable the hash and handler sweepers, because their `setInterval` timers keep the instance and its bearer token alive for the process lifetime; clients are pruned after `REST_CLIENT_CACHE_TTL_MS` instead.

### Discord guild state in the API

- **`COMPLETE_GUILDS_STALE_TTL_SECONDS`** (`apps/api/src/discord/discord-user-guilds.client.ts`): a user guild list past its 15-minute max age is still shown while one background request replaces it, because the list only decides what is displayed; only a list fresher than 2 s may deactivate members. When Discord rejects the User's authorization during a refresh, the cached list is deleted so the next request surfaces the failure.
- **`fetchCompleteUserGuildsOnce`** (`apps/api/src/discord/discord-user-guilds.client.ts`): concurrent callers share one lookup that keeps running if a caller is interrupted; registering and forking is uninterruptible and the lookup settles the shared request on every exit.
- **`REFRESH_COOLDOWN_MS`** (`apps/api/src/guilds/guild-discord-sync.data-layer.ts`): a manual refresh of a fresh, error-free snapshot waits 5 minutes because gateway events keep it current; failed, bot-removed or stale snapshots wait 30 seconds so they can be retried soon without exhausting the invalid-request budget.
- **Guild update** (`apps/api/src/guilds/guild-lifecycle.operations.ts`): the bot republishes every server on start, so a snapshot that changes nothing clears no cache.

### Avatars and display

- **Member sync** (`apps/api/src/members/member-sync.operations.ts`) and **`getDiscordServerAvatarUrl`** (`packages/domain/src/discord-avatar.ts`): a Member stores the full per-server avatar URL, because a guild avatar cannot be rebuilt from the user id and hash. Sync also stores the global display name for the global chat.
- **Reservation authors** (`apps/api/src/reservations/reservation-presentation.ts`): an avatar starting with `http` is a stored per-server URL used as is; otherwise the CDN URL is built from the user id and hash.
- **`getDiscordAvatarUrl`** (`packages/domain/src/discord-avatar.ts`): appends `?size=` only to URLs starting with `${DISCORD_CDN_URL}/`, so a look-alike host is never treated as Discord's CDN. `imageExtension` picks `gif` for `a_` hashes because Discord serves animated images only under that extension.
- **`getMemberDisplayRole`** (`packages/domain/src/member-display-role.ts`): mirrors Discord: the name colour comes from the highest role with a non-zero colour, ignoring colourless roles.

### Bot delivery and sync

- **`messageNonce`** (`apps/discord-bot/src/bot/discord-delivery.service.ts`): sends set `enforceNonce` with a 25-character SHA-256 prefix of the job id, because Discord deduplicates by nonce for a few minutes and limits nonces to 25 characters.
- **Delivery `step`** (`apps/discord-bot/src/bot/discord-delivery.service.ts`): a timed-out lookup is retried, but an ambiguous send failure (timeout, 5xx, reset) is permanent, because a retried send could post a duplicate. Failures are logged with token-free context while target ids and content stay out of logs.
- **`isPermanentDiscordError`**, **`isRetryableDiscordError`** and **`isRetryableDiscordSendError`** (`apps/discord-bot/src/bot/non-retryable-discord-error-codes.ts`): classify errors in one place. Codes 10003, 10004, 10013, 50001, 50007, 50013 and 50035 are permanent; idempotent reads retry everything else; mutations retry rate limits, 5xx and pre-response network failures; sends retry only when the request certainly never reached Discord.
- **`notificationRoute`** (`apps/discord-bot/src/bot-application.ts`): requeues a failed send and rejects an undecodable command, with prefetch 10.
- **`retrySchedule`** (`apps/discord-bot/src/bot/discord-sdk-read.ts`): SDK reads retry at most twice with jittered backoff from 500 ms; a timed-out read is not retried, because the SDK promise cannot be cancelled and a retry would stack another request in the saturated REST queue.
- **`withGuildLock`** (`apps/discord-bot/src/bot/discord-sync.service.ts`): processes one guild's gateway events one at a time, so an update and a delete of one channel cannot publish out of order. `channelProjectionKey` compares only stored channel fields, so cosmetic edits publish nothing.
- **`createSyncContext`** and **`coalescedGuildChannelsPayload`** (`apps/discord-bot/src/bot/discord-sync.service.ts`): gateway-driven sync reads the `Guilds`-intent cache instead of competing for the REST queue, while explicit HTTP refreshes read REST to repair a stale cache. Concurrent refreshes of one guild share one round trip in a detached fiber.
- **`channelSync`** (`apps/discord-bot/src/bot/discord-sync.service.ts`): a failed Discord read is reported downstream so the Organization sees a stale projection instead of old state as current; a failed publish is not reported again, since RabbitMQ is the path that failed.
- **`handleClientReady`** (`apps/discord-bot/src/bot/discord-sync.service.ts`): republishes every available guild on ready, because discord.js emits `guildCreate` only for servers joined after login; one failed publish does not skip the rest.

### Slash commands

- **`guildCommand`** (`apps/discord-bot/src/commands/command-builders.ts`): commands are registered for the Guild interaction context only, because Lootlog data belongs to a server's Organization, never to a DM.
- **`memberSession`** and **`asMember`** (`apps/discord-bot/src/commands/lootlog-client.ts`): every Lootlog read except the public item card starts from a Member session with the Web app's access policy. The bot calls the API and gateway in-cluster with identity headers those services trust from the private network, so it must never route them through the public edge.
- **Reply mentions** (`editReply` in `apps/discord-bot/src/commands/slash-command-interactions.ts`, `rankedLines` in `apps/discord-bot/src/commands/slash-command.ts`): replies allow only explicit `pings`, so a public ranking never notifies the players it lists.
- **`AUTOCOMPLETE_BUDGET`** (`apps/discord-bot/src/commands/slash-command-interactions.ts`): 2500 ms, because Discord drops autocomplete answers after three seconds. Command publishing runs at once when the client is already ready, because login can finish before the listener is attached.
- **`MAX_RANKING_FIELDS`** (`apps/discord-bot/src/commands/event-commands.ts`): rankings use at most 24 fields and 5500 characters, below Discord's 25-field and 6000-character embed limits.

## Consequences

- Every Discord call must account for the invalid-request budget: cache refusals, never resend rejected tokens, and space out retries.
- A Discord send is never retried after an ambiguous failure; a rare lost message is preferred to a duplicate.
- New notification jobs need a deterministic key from their source so redelivery and recovery stay at most once per occurrence.
- Mentions must come only from admin-authored templates or explicit pings, never from Member-supplied text.
- The bot's in-cluster identity headers make network placement part of the security boundary.
