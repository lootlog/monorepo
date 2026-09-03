import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer, Redacted } from "effect";
import {
  ActivityConsumers,
  activityQueues,
} from "#src/activities/activity-consumer";
import { ActivityRepository } from "#src/activities/activity-repository";
import { ActivityConfig } from "#src/config/activity-config";
import { verifyAndAdoptDatabase } from "#src/database/adoption";
import { ActivityDatabase, PgClientLive } from "#src/database/database";
import { ActivityHealth, ActivityHttpServer } from "#src/http/activity-http";
import { ApiHttpClient } from "#src/http/api-http-client";
import { Permissions } from "#src/activities/activity-permissions";

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ActivityConfig;
    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: activityQueues,
    });
  }),
).pipe(Layer.provide(ActivityConfig.layer));
const RepositoryLive = ActivityRepository.layer.pipe(
  Layer.provide(ActivityDatabase.layer),
  Layer.provide(PgClientLive),
);
const HealthLive = ActivityHealth.layer.pipe(
  Layer.provide(ApiHttpClient.layer),
  Layer.provide(PgClientLive),
);
const PermissionsLive = Permissions.live.pipe(
  Layer.provide(ApiHttpClient.layer),
  Layer.provide(ActivityConfig.layer),
);
const DatabaseAdoption = Layer.effectDiscard(verifyAndAdoptDatabase()).pipe(
  Layer.provide(PgClientLive),
);
const DatabaseServices = Layer.mergeAll(
  RepositoryLive,
  HealthLive,
  DatabaseAdoption,
);

export const ActivityApplication = Layer.merge(
  ActivityHttpServer,
  ActivityConsumers,
).pipe(
  Layer.provide(DatabaseServices),
  Layer.provide(PermissionsLive),
  Layer.provide(RabbitLive),
  Layer.provide(ActivityConfig.layer),
);
