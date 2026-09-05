import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import i18n from "@/i18n/config";
import { LogsActionCard } from "./logs-action-card";

it("toggles details with the keyboard without toggling when copying an action", async () => {
  const user = userEvent.setup();
  const onCopyAction = vi.fn();
  render(
    <LogsActionCard
      action={{
        id: "action",
        actionType: "audit-example",
        createdAt: "2026-01-01T12:00:00Z",
        status: "success",
        payload: {},
        requests: [],
      }}
      onCopyAction={onCopyAction}
      onCopyRequest={vi.fn()}
    />,
  );
  const header = screen.getByRole("button", { name: "audit-example" });
  header.focus();
  await user.keyboard("{Enter}");
  expect(header).toHaveAttribute("aria-expanded", "true");
  await user.keyboard(" ");
  expect(header).toHaveAttribute("aria-expanded", "false");
  await user.click(
    screen.getByRole("button", { name: i18n.t("common:actions.copyAction") }),
  );
  expect(onCopyAction).toHaveBeenCalledTimes(1);
  expect(header).toHaveAttribute("aria-expanded", "false");
});
