// @vitest-environment happy-dom
import "@/i18n/config";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { latestReleaseAnnouncement } from "./release-announcement";
import { ReleaseAnnouncementsDialog } from "./release-announcements-dialog";

const fetchSpy = vi.spyOn(globalThis, "fetch");

afterEach(() => {
  cleanup();
  fetchSpy.mockClear();
});

describe("ReleaseAnnouncementsDialog", () => {
  it("renders the newest static release without fetching it", () => {
    const onOpenChange = vi.fn();
    render(<ReleaseAnnouncementsDialog open onOpenChange={onOpenChange} />);

    expect(
      screen.getByRole("heading", { name: latestReleaseAnnouncement.title }),
    ).toBeTruthy();
    expect(screen.getByText(/Count unique Discord accounts/u)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
