import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar, SidebarProvider, SidebarTrigger } from "./sidebar";

beforeEach(() => {
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const result = matchMedia(query);

    if (query === "(max-width: 767px)")
      Object.defineProperty(result, "matches", { value: true });

    return result;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mobile sidebar", () => {
  it("toggles the current sidebar state with the keyboard shortcut", async () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <span>Sidebar content</span>
        </Sidebar>
      </SidebarProvider>,
    );

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeVisible();
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("preserves hidden content while disconnecting its effects", async () => {
    const onEffectConnect = vi.fn<() => void>();
    const onEffectDisconnect = vi.fn<() => void>();

    const Content = () => {
      useEffect(() => {
        onEffectConnect();

        return onEffectDisconnect;
      }, []);

      return <div data-testid="sidebar-content" />;
    };

    render(
      <SidebarProvider>
        <Sidebar>
          <Content />
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    const content = await screen.findByTestId("sidebar-content");
    expect(onEffectConnect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    await waitFor(() => expect(onEffectConnect).toHaveBeenCalledOnce());
    expect(screen.getByTestId("sidebar-content")).toBe(content);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onEffectDisconnect).toHaveBeenCalledOnce());
    expect(screen.getByTestId("sidebar-content")).toBe(content);

    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    await waitFor(() => expect(onEffectConnect).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("sidebar-content")).toBe(content);
  });
});
