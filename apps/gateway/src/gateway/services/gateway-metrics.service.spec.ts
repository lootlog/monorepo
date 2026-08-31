import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  type BatchObservableCallback,
  type BatchObservableResult,
  type Observable,
} from "@opentelemetry/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "#src/gateway/enums/platform.enum";
import { Gateway } from "#src/gateway/gateway";
import type { SocketUser } from "#src/gateway/types/socket-user.type";
import {
  GatewayMetricsService,
  summarizeGatewaySockets,
  type GatewayMetricSocket,
} from "./gateway-metrics.service.js";

const meter = vi.hoisted(() => ({
  addBatchObservableCallback: vi.fn(
    (_callback: BatchObservableCallback, _instruments: Observable[]) => {},
  ),
  createObservableGauge: vi.fn(
    (name: string): Observable & { name: string } => ({
      name,
      addCallback: vi.fn(),
      removeCallback: vi.fn(),
    }),
  ),
  removeBatchObservableCallback: vi.fn(
    (_callback: BatchObservableCallback, _instruments: Observable[]) => {},
  ),
}));

vi.mock("@opentelemetry/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@opentelemetry/api")>()),
  metrics: {
    getMeter: () => meter,
  },
}));

const player: NonNullable<SocketUser["player"]> = {
  world: "test-world",
  name: "Test Player",
  characterId: "character-1",
  accountId: "account-1",
  icon: "icon.gif",
  lvl: "100",
  prof: "w",
  location: {
    x: 1,
    y: 2,
    map: "Test Map",
  },
};

function createSocket(
  userId: string,
  platform: Platform,
  joinedGame = false,
): GatewayMetricSocket {
  return {
    data: {
      userId,
      platform,
      ...(joinedGame ? { player } : {}),
    },
  };
}

describe("summarizeGatewaySockets", () => {
  it("counts connections, joined game sessions, and unique game players", () => {
    const sockets = [
      createSocket("user-1", Platform.GAME, true),
      createSocket("user-1", Platform.GAME, true),
      createSocket("user-2", Platform.GAME, true),
      createSocket("user-3", Platform.WEB_APP, true),
      createSocket("user-4", Platform.GAME),
    ];

    expect(summarizeGatewaySockets(sockets)).toEqual({
      connections: 5,
      gameSessions: 3,
      uniquePlayers: 2,
    });
  });
});

describe("GatewayMetricsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports one cluster snapshot through a batch observable callback", async () => {
    const sockets = [
      createSocket("user-1", Platform.GAME, true),
      createSocket("user-1", Platform.GAME, true),
      createSocket("user-2", Platform.WEB_APP),
    ];
    const fetchSockets = vi.fn().mockResolvedValue(sockets);
    const module = await Test.createTestingModule({
      providers: [
        GatewayMetricsService,
        {
          provide: Gateway,
          useValue: { server: { fetchSockets } },
        },
      ],
    }).compile();
    const service = module.get(GatewayMetricsService);

    service.onModuleInit();

    const [callback, instruments] =
      meter.addBatchObservableCallback.mock.calls[0];
    const observe = vi.fn();
    const observableResult: BatchObservableResult = { observe };
    await callback(observableResult);

    expect(fetchSockets).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledTimes(3);
    expect(observe).toHaveBeenNthCalledWith(1, instruments[0], 3);
    expect(observe).toHaveBeenNthCalledWith(2, instruments[1], 2);
    expect(observe).toHaveBeenNthCalledWith(3, instruments[2], 1);

    service.onModuleDestroy();
    expect(meter.removeBatchObservableCallback).toHaveBeenCalledWith(
      callback,
      instruments,
    );
  });

  it("does not report false zeroes when the cluster snapshot fails", async () => {
    const fetchSockets = vi.fn().mockRejectedValue(new Error("Redis timeout"));
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => {});
    const module = await Test.createTestingModule({
      providers: [
        GatewayMetricsService,
        {
          provide: Gateway,
          useValue: { server: { fetchSockets } },
        },
      ],
    }).compile();
    const service = module.get(GatewayMetricsService);

    service.onModuleInit();

    const [callback] = meter.addBatchObservableCallback.mock.calls[0];
    const observe = vi.fn();
    await callback({ observe });

    expect(observe).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Failed to collect gateway cluster metrics: Redis timeout",
    );
  });
});
