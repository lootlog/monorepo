import { afterEach, describe, expect, it, vi } from "vitest";
import { showRuntimeMessage } from "./legacy-ui-runtime-adapter";
import {
  renderRuntimeMessage,
  testRuntimeWindow,
} from "@/test/test-runtime-window";

afterEach(() => {
  delete testRuntimeWindow.message;
});

describe("game messages", () => {
  it("shows player-chosen names literally instead of as markup or BB codes", () => {
    const text = `Ukryto <img src=x onerror="alert(1)"> [b]Klan[/b] & 'co'`;
    let shown: ReturnType<typeof renderRuntimeMessage> | undefined;
    testRuntimeWindow.message = (raw) => {
      shown = renderRuntimeMessage(raw);
    };

    showRuntimeMessage(text);

    expect(shown?.decoded).not.toMatch(/[<>[\]]/);
    expect(shown?.rendered.querySelector("img")).toBeNull();
    expect(shown?.rendered.body.textContent).toBe(text);
  });

  it("drops a message the game cannot show yet without breaking the caller", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    testRuntimeWindow.message = () => {
      throw new TypeError("Engine.interface is undefined");
    };

    expect(() => showRuntimeMessage("Zapisano")).not.toThrow();
  });
});
