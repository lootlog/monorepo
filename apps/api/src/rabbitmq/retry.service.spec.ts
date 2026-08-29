import type { Mock } from "vitest";
import { mockFn } from "#src/test/mock-fn";
import type { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import type { Logger } from "winston";
import { RETRY_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RetryService } from "./retry.service.js";

describe("RetryService", () => {
  let service: RetryService;
  let amqp: {
    publish: Mock;
  };
  let logger: {
    log: Mock;
  };

  beforeEach(() => {
    amqp = {
      publish: mockFn(),
    };
    logger = {
      log: mockFn(),
    };
    service = new RetryService(
      logger as unknown as Logger,
      amqp as unknown as AmqpConnection,
    );
  });

  describe("getRetryCount", () => {
    it("should preserve an explicit zero retry header", () => {
      expect(service.getRetryCount({ "x-retry-count": 0 })).toBe(0);
    });

    it("should read retry count from x-death when retry header is missing", () => {
      expect(service.getRetryCount({ "x-death": [{ count: 2 }] })).toBe(2);
    });
  });

  describe("getRetryQueueOptions", () => {
    it("should preserve an explicit zero retry delay", () => {
      expect(service.getRetryQueueOptions("guild.create", 0)).toEqual({
        durable: true,
        messageTtl: 0,
        deadLetterExchange: "default",
        deadLetterRoutingKey: "guild.create",
      });
    });
  });

  describe("getMainQueueOptions", () => {
    it("should fall back to the default retry exchange when config is omitted", () => {
      expect(service.getMainQueueOptions("guild.create.retry")).toEqual({
        durable: true,
        deadLetterExchange: RETRY_EXCHANGE_NAME,
        deadLetterRoutingKey: "guild.create.retry",
      });
    });
  });

  describe("handleRetryLogic", () => {
    it("should send directly to DLQ when max retries is explicitly zero", async () => {
      const shouldContinue = await service.handleRetryLogic(
        { id: "message-1" },
        {},
        "guild.create.dlq",
        "guild create",
        { maxRetries: 0 },
      );

      expect(shouldContinue).toBe(false);
      expect(amqp.publish).toHaveBeenCalledWith(
        "dlx",
        "guild.create.dlq",
        { id: "message-1" },
        {
          headers: expect.objectContaining({
            "x-final-attempt": true,
            "x-sent-to-dlq-at": expect.any(String),
          }),
        },
      );
    });
  });
});
