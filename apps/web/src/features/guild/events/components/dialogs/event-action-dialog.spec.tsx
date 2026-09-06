// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventActionDialog } from "./event-action-dialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const baseProps = {
  open: true,
  eventName: "Event",
  titleKey: "title",
  descriptionKey: "description",
  actionLabelKey: "confirm",
};

describe("EventActionDialog", () => {
  it("keeps a failed confirmation open for retry", async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockRejectedValue(new Error("request failed"));
    render(
      <EventActionDialog
        {...baseProps}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isPending={false}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "confirm" }));
    });
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("keeps the action label while pending and prevents cancellation", () => {
    const onOpenChange = vi.fn();
    render(
      <EventActionDialog
        {...baseProps}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        isPending
      />,
    );
    const action = screen.getByRole("button", { name: "confirm" });
    expect(action.getAttribute("aria-busy")).toBe("true");
    expect(action.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
