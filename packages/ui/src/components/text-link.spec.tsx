// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { TextLink } from "./text-link";

afterEach(cleanup);

it("preserves external and download destinations without adding decorative text", () => {
  render(
    <TextLink
      href="https://example.com/report#results"
      target="_blank"
      rel="noopener noreferrer"
      download="report.html"
    >
      Report
    </TextLink>,
  );
  const link = screen.getByRole("link", { name: "Report" });
  expect(link.getAttribute("href")).toBe("https://example.com/report#results");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(link.getAttribute("download")).toBe("report.html");
});

it("preserves anchor composition and keyboard activation", async () => {
  const activate = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) =>
    event.preventDefault(),
  );
  render(
    <TextLink
      render={
        <a href="/statistics?world=pandora#activity" onClick={activate} />
      }
    >
      Statistics
    </TextLink>,
  );
  const user = userEvent.setup();
  await user.tab();
  expect(document.activeElement).toBe(
    screen.getByRole("link", { name: "Statistics" }),
  );
  await user.keyboard("{Enter}");
  expect(activate).toHaveBeenCalledOnce();
  expect(screen.getByRole("link").getAttribute("href")).toBe(
    "/statistics?world=pandora#activity",
  );
});
