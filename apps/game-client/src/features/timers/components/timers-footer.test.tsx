import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const timersColorStatisticsSpy = vi.fn();

vi.mock("./timers-color-statistics", () => ({
  TimersColorStatistics: (props: unknown) => {
    timersColorStatisticsSpy(props);
    return <div>TimersColorStatistics</div>;
  },
}));

vi.mock("@/features/timers/components/timers-connection-status", () => ({
  TimersConnectionStatus: () => <div>TimersConnectionStatus</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { TimersFooter } from "./timers-footer";

describe("TimersFooter", () => {
  it("renders statistics, socket status, and the add action", async () => {
    const user = userEvent.setup();
    const onAddTimer = vi.fn();
    const colorStatistics = [
      { color: "red", total: 2, active: 1, name: "Red" },
    ];

    render(
      <TimersFooter
        colorStatistics={colorStatistics}
        onAddTimer={onAddTimer}
      />,
    );

    expect(screen.getByText("TimersColorStatistics")).toBeVisible();
    expect(screen.getByText("TimersConnectionStatus")).toBeVisible();
    expect(screen.getByText("Dodaj timer")).toBeVisible();
    expect(timersColorStatisticsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        colorStatistics,
      }),
    );

    await user.click(screen.getByRole("button", { name: "+" }));

    expect(onAddTimer).toHaveBeenCalledTimes(1);
  });
});
