import { OnlineConsumer, onlineQueues } from "#src/online/online-consumer";
import { OnlineRepository } from "#src/online/online-repository";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer, Redacted } from "effect";
import {
  ActivityConsumers,
  activityQueues,
} from "#src/activities/activity-consumer";
import { ActivityRepository } from "#src/activities/activity-repository";
import { ActivityConfig } from "#src/config/activity-config";
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
      queues: [...activityQueues, ...onlineQueues],
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

const DatabaseServices = Layer.mergeAll(
  OnlineRepository.layer.pipe(Layer.provide(PgClientLive)),
  RepositoryLive,
  HealthLive,
);

export const ActivityApplication = Layer.mergeAll(
  ActivityHttpServer,
  ActivityConsumers,
  OnlineConsumer,
).pipe(
  Layer.provide(DatabaseServices),
  Layer.provide(PermissionsLive),
  Layer.provide(RabbitLive),
  Layer.provide(ActivityConfig.layer),
);
