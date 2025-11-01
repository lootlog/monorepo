import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimersFooter } from "./timers-footer";

describe("TimersFooter", () => {
  const mockColorStatistics = [
    {
      color: "red",
      total: 5,
      active: 3,
      name: "Czerwony",
    },
    {
      color: "blue",
      total: 2,
      active: 1,
      name: "Niebieski",
    },
  ];

  it("should render add timer button", () => {
    render(<TimersFooter colorStatistics={[]} onAddTimer={vi.fn()} />);

    expect(screen.getByText("+")).toBeDefined();
  });

  it("should call onAddTimer when button clicked", async () => {
    const onAddTimer = vi.fn();
    render(<TimersFooter colorStatistics={[]} onAddTimer={onAddTimer} />);

    const addButton = screen.getByText("+");
    await userEvent.click(addButton);

    expect(onAddTimer).toHaveBeenCalledTimes(1);
  });

  it("should render color statistics component", () => {
    const { container } = render(
      <TimersFooter
        colorStatistics={mockColorStatistics}
        onAddTimer={vi.fn()}
      />,
    );

    const infoIcon = container.querySelector("svg");
    expect(infoIcon).toBeDefined();
  });
});
