import type { Mock } from "vitest";
import type { ConsumeMessage } from "amqplib";
import { handleNotificationMessage } from "./rabbitmq.js";

function createMessage(content: string) {
  return {
    content: Buffer.from(content),
  } as ConsumeMessage;
}

describe("handleNotificationMessage", () => {
  let channel: {
    ack: Mock;
    nack: Mock;
  };

  beforeEach(() => {
    channel = {
      ack: vi.fn(),
      nack: vi.fn(),
    };
  });

  it("acks successfully processed messages", async () => {
    const onMessage = vi.fn().mockResolvedValue(undefined);
    const message = createMessage(
      JSON.stringify({ notificationJobId: "job-1" }),
    );

    await handleNotificationMessage(channel, message, onMessage);

    expect(onMessage).toHaveBeenCalledWith({
      notificationJobId: "job-1",
    });
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it("drops invalid JSON messages without requeue", async () => {
    const onMessage = vi.fn().mockResolvedValue(undefined);
    const message = createMessage("{broken-json");

    await handleNotificationMessage(channel, message, onMessage);

    expect(onMessage).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });

  it("requeues messages when the handler fails", async () => {
    const onMessage = vi.fn().mockRejectedValue(new Error("temporary failure"));
    const message = createMessage(
      JSON.stringify({ notificationJobId: "job-2" }),
    );

    await handleNotificationMessage(channel, message, onMessage);

    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
  });
});
