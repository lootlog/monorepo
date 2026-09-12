import { fireEvent, render as renderUi, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getDefaultColorName } from "@/features/timers/model/timer-colors";
import { readTimerAppearance } from "@/features/timers/settings/timer-settings-writers";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import {
  seedSettingsDocumentValues,
  type SettingsDocumentValues,
} from "@/test/settings-documents-fixtures";
import { TimersSettingsColors } from "./timers-settings-colors";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<TimersSettingsColors />, { wrapper: harness.wrapper });

const seedAppearance = (values: SettingsDocumentValues) =>
  seedSettingsDocumentValues(
    harness.queryClient,
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        `appearance.timers.${key}`,
        value,
      ]),
    ),
  );

const openEditor = (name: string) =>
  fireEvent.click(
    screen.getByRole("button", { name: `Edytuj kolor: ${name}` }),
  );

describe("TimersSettingsColors", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
  });

  it("opens one editor with name, colours, transparency and preview", () => {
    render();

    openEditor("Czerwony");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Nazwa")).toBeInTheDocument();
    expect(screen.getByLabelText("Kolor ramki HEX")).toBeInTheDocument();
    expect(screen.getByLabelText("Kolor tła HEX")).toBeInTheDocument();
    expect(screen.getByLabelText("Przezroczystość tła")).toBeInTheDocument();
    expect(screen.getByText("Podgląd")).toBeInTheDocument();
  });

  it("commits a valid border HEX value without touching the name", () => {
    render();

    openEditor("Czerwony");
    const borderHexInput = screen.getByLabelText("Kolor ramki HEX");
    fireEvent.change(borderHexInput, { target: { value: "#123456" } });
    fireEvent.blur(borderHexInput);

    const state = readTimerAppearance();
    expect(state.overriddenDefaultColors.red).toMatchObject({
      borderColor: "#123456",
    });
    expect(state.defaultColorNames.red).toBeUndefined();
  });

  it("renames a default colour without creating a colour override", () => {
    render();

    openEditor("Czerwony");
    const nameInput = screen.getByLabelText("Nazwa");
    fireEvent.change(nameInput, { target: { value: "Bossy" } });
    fireEvent.blur(nameInput);

    const state = readTimerAppearance();
    expect(state.defaultColorNames.red).toBe("Bossy");
    expect(state.overriddenDefaultColors.red).toBeUndefined();
  });

  it("rejects an invalid HEX value", () => {
    render();

    openEditor("Czerwony");
    const borderHexInput = screen.getByLabelText("Kolor ramki HEX");
    fireEvent.change(borderHexInput, { target: { value: "#12" } });
    fireEvent.blur(borderHexInput);

    expect(readTimerAppearance().overriddenDefaultColors.red).toBeUndefined();
    expect(borderHexInput).toHaveValue("#EF4444");
  });

  it("does not mark an unchanged persisted default name as modified", () => {
    seedAppearance({ defaultColorNames: { red: getDefaultColorName("red") } });

    render();

    expect(
      screen.getByRole("button", { name: "Przywróć domyślny: Czerwony" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Przywróć wszystkie" }),
    ).toBeDisabled();
  });

  it("restores every modified default colour at once", () => {
    seedAppearance({
      defaultColorNames: { red: "Bossy" },
      overriddenDefaultColors: {
        green: { borderColor: "#123456", backgroundColor: "#12345633" },
      },
    });

    render();

    fireEvent.click(screen.getByRole("button", { name: "Przywróć wszystkie" }));

    const state = readTimerAppearance();
    expect(state.defaultColorNames).toEqual({});
    expect(state.overriddenDefaultColors).toEqual({});
  });

  it("hides a default colour from its editor", () => {
    render();

    openEditor("Czerwony");
    fireEvent.click(screen.getByRole("button", { name: "Ukryj kolor" }));

    expect(readTimerAppearance().hiddenDefaultColors).toEqual(["red"]);
  });

  it("deletes a custom colour from its row", () => {
    seedAppearance({
      customColors: {
        "custom-1": {
          id: "custom-1",
          name: "Topka",
          borderColor: "#123456",
          backgroundColor: "#12345633",
        },
      },
    });

    render();

    fireEvent.click(screen.getByRole("button", { name: "Usuń kolor: Topka" }));

    expect(readTimerAppearance().customColors).toEqual({});
  });

  it("restores a hidden default color from the collapsed list", () => {
    seedAppearance({ hiddenDefaultColors: ["red"] });

    render();

    fireEvent.click(screen.getByRole("button", { name: "Ukryte (1)" }));
    fireEvent.click(screen.getByRole("button", { name: /Przywróć kolor: / }));

    expect(readTimerAppearance().hiddenDefaultColors).toEqual([]);
  });
});
