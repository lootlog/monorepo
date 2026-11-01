import { afterEach, describe, expect, it, vi } from "vitest";
import { showRuntimeMessage } from "./legacy-ui-runtime-adapter";
import { testRuntimeWindow } from "@/test/test-runtime-window";

afterEach(() => {
  delete testRuntimeWindow.message;
});

describe("game messages", () => {
  it("shows player-chosen names literally instead of as markup or BB codes", () => {
    const text = `Ukryto <img src=x onerror="alert(1)"> [b]Klan[/b] & 'co'`;
    let decoded = "";
    testRuntimeWindow.message = (raw) => {
      // message() decodes entities before parsing BB codes and rendering HTML.
      const decoder = document.createElement("textarea");
      decoder.innerHTML = raw;
      decoded = decoder.value;
    };

    showRuntimeMessage(text);

    expect(decoded).not.toMatch(/[<>[\]]/);
    const rendered = document.createElement("div");
    rendered.innerHTML = decoded;
    expect(rendered.querySelector("img")).toBeNull();
    expect(rendered.textContent).toBe(text);
  });

  it("drops a message the game cannot show yet without breaking the caller", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    testRuntimeWindow.message = () => {
      throw new TypeError("Engine.interface is undefined");
    };

    expect(() => showRuntimeMessage("Zapisano")).not.toThrow();
  });
});
