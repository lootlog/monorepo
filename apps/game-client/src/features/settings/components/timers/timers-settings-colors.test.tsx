import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import { useTimersStore } from "@/store/timers.store";
import { TimersSettingsColors } from "./timers-settings-colors";

describe("TimersSettingsColors", () => {
  beforeEach(() => {
    useTimersStore.setState({
      customColors: {},
      defaultColorNames: {},
      overriddenDefaultColors: {},
      hiddenDefaultColors: [],
    });
  });

  it("opens a compact quick editor from a timer color preview", () => {
    const { container } = render(<TimersSettingsColors />);

    expect(container.querySelector("#timer-colors-list")).toHaveClass(
      "ll:grid-cols-2",
    );

    const colorTrigger = screen.getAllByRole("button", {
      name: /Edytuj kolor/i,
    })[0];
    expect(colorTrigger).toHaveClass(
      "ll:appearance-none",
      "ll:border-0",
      "ll:bg-transparent",
      "ll:p-0",
    );
    fireEvent.click(colorTrigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Kolor ramki HEX")).toBeInTheDocument();
    expect(screen.getByLabelText("Kolor tła HEX")).toBeInTheDocument();
    expect(screen.getByText("Podgląd")).toBeInTheDocument();
  });

  it("commits a valid border HEX value from the quick editor", () => {
    render(<TimersSettingsColors />);

    fireEvent.click(
      screen.getAllByRole("button", { name: /Edytuj kolor/i })[0],
    );
    const borderHexInput = screen.getByLabelText("Kolor ramki HEX");
    fireEvent.change(borderHexInput, { target: { value: "#123456" } });
    fireEvent.blur(borderHexInput);

    expect(useTimersStore.getState().overriddenDefaultColors.red).toMatchObject(
      {
        borderColor: "#123456",
      },
    );
  });

  it("keeps only one editor popover open at a time", () => {
    render(<TimersSettingsColors />);

    fireEvent.click(
      screen.getAllByRole("button", { name: /Edytuj kolor/i })[0],
    );
    fireEvent.click(
      screen.getAllByRole("button", {
        name: /Więcej ustawień koloru/i,
      })[0],
    );

    expect(
      document.querySelectorAll('[data-slot="popover-content"][data-open]'),
    ).toHaveLength(1);
    expect(screen.getByLabelText("Nazwa")).toBeInTheDocument();
  });

  it("does not mark an unchanged persisted default name as modified", () => {
    useTimersStore.setState({
      defaultColorNames: { red: getDefaultColorName("red") },
    });

    render(<TimersSettingsColors />);

    expect(screen.queryByTitle("Zmieniony")).not.toBeInTheDocument();
  });
});
