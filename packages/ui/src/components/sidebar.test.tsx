import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar, SidebarProvider, SidebarTrigger } from "./sidebar";

vi.mock("@lootlog/ui/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

describe("mobile sidebar", () => {
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
