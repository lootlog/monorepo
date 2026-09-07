import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HorizontalMenu } from "./horizontal-menu";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps a pointer target stationary until the click activates the link", async () => {
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollTo");
  const activate = vi.fn<() => void>();
  render(
    <HorizontalMenu aria-label="Settings">
      <li>
        <a href="#general" aria-current="page">
          General
        </a>
      </li>
      <li>
        <a href="#roles" onClick={activate}>
          Roles
        </a>
      </li>
    </HorizontalMenu>,
  );
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  scroll.mockClear();
  const link = screen.getByRole("link", { name: "Roles" });
  fireEvent.pointerDown(link);
  fireEvent.focusIn(link);
  expect(scroll).not.toHaveBeenCalled();
  fireEvent.pointerUp(link);
  fireEvent.click(link);
  expect(activate).toHaveBeenCalledOnce();
  await waitFor(() => expect(scroll).toHaveBeenCalledOnce());
});
