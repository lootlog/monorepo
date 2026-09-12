import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import { useTimersStore } from "@/store/timers.store";
import { TimersSettingsColors } from "./timers-settings-colors";

const openEditor = (name: string) =>
  fireEvent.click(
    screen.getByRole("button", { name: `Edytuj kolor: ${name}` }),
  );

describe("TimersSettingsColors", () => {
  beforeEach(() => {
    useTimersStore.setState({
      customColors: {},
      defaultColorNames: {},
      overriddenDefaultColors: {},
      hiddenDefaultColors: [],
      timersColors: {},
    });
  });

  it("opens one editor with name, colours, transparency and preview", () => {
    render(<TimersSettingsColors />);

    openEditor("Czerwony");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Nazwa")).toBeInTheDocument();
    expect(screen.getByLabelText("Kolor ramki HEX")).toBeInTheDocument();
    expect(screen.getByLabelText("Kolor tła HEX")).toBeInTheDocument();
    expect(screen.getByLabelText("Przezroczystość tła")).toBeInTheDocument();
    expect(screen.getByText("Podgląd")).toBeInTheDocument();
  });

  it("commits a valid border HEX value without touching the name", () => {
    render(<TimersSettingsColors />);

    openEditor("Czerwony");
    const borderHexInput = screen.getByLabelText("Kolor ramki HEX");
    fireEvent.change(borderHexInput, { target: { value: "#123456" } });
    fireEvent.blur(borderHexInput);

    const state = useTimersStore.getState();
    expect(state.overriddenDefaultColors.red).toMatchObject({
      borderColor: "#123456",
    });
    expect(state.defaultColorNames.red).toBeUndefined();
  });

  it("renames a default colour without creating a colour override", () => {
    render(<TimersSettingsColors />);

    openEditor("Czerwony");
    const nameInput = screen.getByLabelText("Nazwa");
    fireEvent.change(nameInput, { target: { value: "Bossy" } });
    fireEvent.blur(nameInput);

    const state = useTimersStore.getState();
    expect(state.defaultColorNames.red).toBe("Bossy");
    expect(state.overriddenDefaultColors.red).toBeUndefined();
  });

  it("rejects an invalid HEX value", () => {
    render(<TimersSettingsColors />);

    openEditor("Czerwony");
    const borderHexInput = screen.getByLabelText("Kolor ramki HEX");
    fireEvent.change(borderHexInput, { target: { value: "#12" } });
    fireEvent.blur(borderHexInput);

    expect(
      useTimersStore.getState().overriddenDefaultColors.red,
    ).toBeUndefined();
    expect(borderHexInput).toHaveValue("#EF4444");
  });

  it("does not mark an unchanged persisted default name as modified", () => {
    useTimersStore.setState({
      defaultColorNames: { red: getDefaultColorName("red") },
    });

    render(<TimersSettingsColors />);

    expect(
      screen.getByRole("button", { name: "Przywróć domyślny: Czerwony" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Przywróć wszystkie" }),
    ).toBeDisabled();
  });

  it("restores every modified default colour at once", () => {
    useTimersStore.setState({
      defaultColorNames: { red: "Bossy" },
      overriddenDefaultColors: {
        green: { borderColor: "#123456", backgroundColor: "#12345633" },
      },
    });

    render(<TimersSettingsColors />);

    fireEvent.click(screen.getByRole("button", { name: "Przywróć wszystkie" }));

    const state = useTimersStore.getState();
    expect(state.defaultColorNames).toEqual({});
    expect(state.overriddenDefaultColors).toEqual({});
  });

  it("hides a default colour from its editor", () => {
    render(<TimersSettingsColors />);

    openEditor("Czerwony");
    fireEvent.click(screen.getByRole("button", { name: "Ukryj kolor" }));

    expect(useTimersStore.getState().hiddenDefaultColors).toEqual(["red"]);
  });

  it("deletes a custom colour from its row", () => {
    useTimersStore.setState({
      customColors: {
        "custom-1": {
          id: "custom-1",
          name: "Topka",
          borderColor: "#123456",
          backgroundColor: "#12345633",
        },
      },
    });

    render(<TimersSettingsColors />);

    fireEvent.click(screen.getByRole("button", { name: "Usuń kolor: Topka" }));

    expect(useTimersStore.getState().customColors).toEqual({});
  });

  it("restores a hidden default color from the collapsed list", () => {
    useTimersStore.setState({ hiddenDefaultColors: ["red"] });

    render(<TimersSettingsColors />);

    fireEvent.click(screen.getByRole("button", { name: "Ukryte (1)" }));
    fireEvent.click(screen.getByRole("button", { name: /Przywróć kolor: / }));

    expect(useTimersStore.getState().hiddenDefaultColors).toEqual([]);
  });
});
