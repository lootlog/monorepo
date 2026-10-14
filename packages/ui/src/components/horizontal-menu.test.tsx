import {
  act,
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
  vi.unstubAllGlobals();
});

it("recenters the selected link after the viewport or menu resizes", async () => {
  let notifyResize = () => {};

  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollTo");
  render(
    <HorizontalMenu aria-label="Settings">
      <li>
        <a href="#roles" aria-current="page">
          Roles
        </a>
      </li>
    </HorizontalMenu>,
  );
  const link = screen.getByRole("link", { name: "Roles" });
  const viewport = screen.getByRole("navigation").firstElementChild;
  expect(viewport).not.toBeNull();
  let viewportWidth = 400;
  let linkWidth = 80;
  Object.defineProperty(viewport, "clientWidth", {
    get: () => viewportWidth,
  });
  Object.defineProperties(link, {
    offsetLeft: { value: 300 },
    offsetWidth: { get: () => linkWidth },
  });
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  scroll.mockClear();
  viewportWidth = 200;
  act(notifyResize);
  await waitFor(() =>
    expect(scroll).toHaveBeenLastCalledWith({
      left: 240,
      behavior: "smooth",
    }),
  );
  scroll.mockClear();
  linkWidth = 100;
  act(notifyResize);
  await waitFor(() =>
    expect(scroll).toHaveBeenLastCalledWith({
      left: 250,
      behavior: "smooth",
    }),
  );
});

it("preserves the highlight and scroll position on unrelated renders while tracking selection changes", async () => {
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollTo");

  const { rerender } = render(
    <HorizontalMenu aria-label="Settings">
      <li>
        <a href="#general" aria-current="page">
          General
        </a>
      </li>
      <li>
        <a href="#roles">Roles</a>
      </li>
    </HorizontalMenu>,
  );

  const general = screen.getByRole("link", { name: "General" });
  const roles = screen.getByRole("link", { name: "Roles" });
  Object.defineProperties(general, {
    offsetLeft: { value: 4 },
    offsetWidth: { value: 80 },
  });
  Object.defineProperties(roles, {
    offsetLeft: { value: 88 },
    offsetWidth: { value: 64 },
  });
  act(() => general.setAttribute("aria-current", "page"));
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  const highlight = screen.getByRole("presentation", { hidden: true });
  await waitFor(() => expect(highlight).toHaveStyle({ width: "80px" }));
  scroll.mockClear();
  rerender(
    <HorizontalMenu aria-label="Settings" className="text-sm">
      <li>
        <a href="#general" aria-current="page">
          General
        </a>
      </li>
      <li>
        <a href="#roles">Roles</a>
      </li>
    </HorizontalMenu>,
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  expect(scroll).not.toHaveBeenCalled();
  expect(highlight).not.toHaveAttribute("hidden");
  expect(highlight).toHaveStyle({
    width: "80px",
    transform: "translateX(4px)",
  });
  rerender(
    <HorizontalMenu aria-label="Settings" className="text-sm">
      <li>
        <a href="#general">General</a>
      </li>
      <li>
        <a href="#roles" aria-current="page">
          Roles
        </a>
      </li>
    </HorizontalMenu>,
  );
  await waitFor(() => {
    expect(highlight).toHaveStyle({
      width: "64px",
      transform: "translateX(88px)",
    });
    expect(scroll).toHaveBeenCalledOnce();
  });
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
