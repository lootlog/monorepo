import { readFileSync } from "node:fs";
import path from "node:path";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const loaderSource = readFileSync(
  path.resolve(process.cwd(), "src/templates/entrypoint.js"),
  "utf8",
)
  .replace("$GAME_CLIENT_URL$", "https://cdn.lootlog.test/game-client.user.js")
  .replace("$GAME_CLIENT_VERSION$", "1.2.3");

/** Runs the userscript loader and returns the bundle script it requested. */
const runLoader = () => {
  let requested: HTMLScriptElement | undefined;
  // Keep the request off the network; the test decides how it ends.
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    if (node instanceof HTMLScriptElement) requested = node;

    return node;
  });
  // oxlint-disable-next-line no-new-func -- Executes the shipped loader template as a userscript manager would.
  new Function(loaderSource)();

  if (!requested) throw new Error("The loader did not request the bundle");

  return requested;
};

afterEach(() => {
  vi.restoreAllMocks();
  document.getElementById("lootlog-loader-notice")?.remove();
});

describe("userscript loader", () => {
  it("explains a blocked bundle instead of failing silently", () => {
    runLoader().dispatchEvent(new Event("error"));

    const notice = screen.getByRole("alert");
    expect(
      within(notice).getByText("Nie udało się wczytać Lootloga"),
    ).toBeInTheDocument();

    within(notice).getByRole("button", { name: "Zamknij komunikat" }).click();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
