import { RABBIT_REQUEST_TYPE } from "@golevelup/nestjs-rabbitmq";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { ActivitySource, ActivityType } from "#src/generated/prisma/client";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { ActivitiesEventsService } from "./activities-events.service.js";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  signActivityEvent,
} from "#src/activities/utils/activity-event-signature";
import { env } from "#src/config/env";

const validPayload = {
  userId: "user-1",
  guildId: "guild-1",
  discordId: "discord-1",
  type: ActivityType.CONNECT_EVENT,
  source: ActivitySource.WEB_APP,
  details: {
    sessionId: "session-1",
    userAgent: "Vitest",
  },
  idempotencyKey: "connect-session-1-guild-1",
};

describe("ActivitiesEventsService", () => {
  const activitiesService = {
    create: vi.fn(),
    clearActiveSessionsForMember: vi.fn(),
  };
  const retryService = {
    sendToDlq: vi.fn(),
    handleRetryLogic: vi.fn(),
  };
  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  };
  let service: ActivitiesEventsService;

  beforeEach(() => {
    env.ACTIVITY_EVENT_SIGNATURE_SECRET = "test-activity-secret";
    retryService.handleRetryLogic.mockResolvedValue(true);
    service = new ActivitiesEventsService(
      activitiesService as never,
      retryService as never,
      logger as never,
    );
  });

  it.each(["handleActivityCreate", "handleGuildMemberRemoved"] as const)(
    "binds %s AMQP message argument as a RabbitMQ request",
    (methodName) => {
      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        ActivitiesEventsService,
        methodName,
      );

      expect(metadata).toMatchObject({
        [`${RABBIT_REQUEST_TYPE}:1`]: {
          index: 1,
        },
      });
    },
  );

  it("rejects unsigned activity create events", async () => {
    await service.handleActivityCreate(validPayload, {
      properties: { headers: {} },
    });

    expect(activitiesService.create).not.toHaveBeenCalled();
    expect(retryService.sendToDlq).toHaveBeenCalledWith(
      validPayload,
      RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
      expect.objectContaining({
        "x-error-type": "permanent",
        "x-signature-error": "Invalid activity event signature",
      }),
    );
  });

  it("rejects activity create events with invalid signatures", async () => {
    await service.handleActivityCreate(validPayload, {
      properties: {
        headers: {
          [ACTIVITY_EVENT_SIGNATURE_HEADER]: "bad-signature",
        },
      },
    });

    expect(activitiesService.create).not.toHaveBeenCalled();
    expect(retryService.sendToDlq).toHaveBeenCalledWith(
      validPayload,
      RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
      expect.any(Object),
    );
  });

  it("creates activity for signed events", async () => {
    const signature = signActivityEvent(
      validPayload,
      env.ACTIVITY_EVENT_SIGNATURE_SECRET,
    );

    await service.handleActivityCreate(validPayload, {
      properties: {
        headers: {
          [ACTIVITY_EVENT_SIGNATURE_HEADER]: signature,
        },
      },
    });

    expect(retryService.handleRetryLogic).toHaveBeenCalledWith(
      validPayload,
      expect.any(Object),
      RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
      "activity create. discordId: discord-1, userId: user-1",
    );
    expect(activitiesService.create).toHaveBeenCalledWith(validPayload);
  });

  it("clears active sessions when a guild member is removed", async () => {
    const payload = {
      id: "discord-1",
      discordId: "discord-1",
      userId: "user-1",
      guildId: "guild-1",
    };

    await service.handleGuildMemberRemoved(payload, {
      properties: { headers: {} },
    });

    expect(activitiesService.clearActiveSessionsForMember).toHaveBeenCalledWith(
      {
        guildId: "guild-1",
        discordId: "discord-1",
      },
    );
  });
});
