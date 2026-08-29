import { WsException } from "@nestjs/websockets";
import { getRequiredSocketIdentity } from "./user-id.decorator.js";

describe("websocket identity decorators", () => {
  it.each([
    { field: "discordId" as const, data: {} },
    { field: "discordId" as const, data: { discordId: "" } },
    { field: "userId" as const, data: { discordId: "discord-1" } },
    { field: "userId" as const, data: { userId: "   " } },
  ])("disconnects when $field is not a non-empty string", ({ field, data }) => {
    const client = { data, disconnect: vi.fn() };

    expect(() =>
      getRequiredSocketIdentity(client as never, field),
    ).toThrowError(WsException);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it.each([
    { field: "discordId" as const, value: "discord-1" },
    { field: "userId" as const, value: "user-1" },
  ])("returns a valid $field", ({ field, value }) => {
    const client = {
      data: { [field]: value },
      disconnect: vi.fn(),
    };

    expect(getRequiredSocketIdentity(client as never, field)).toBe(value);
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});
