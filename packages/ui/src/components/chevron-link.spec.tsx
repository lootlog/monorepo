// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ChevronLink } from "./chevron-link";

afterEach(cleanup);

it("keeps native link semantics and excludes the decorative chevron from its name", () => {
  render(<ChevronLink href="/statistics">Statistics</ChevronLink>);
  const link = screen.getByRole("link", { name: "Statistics" });
  expect(link.getAttribute("href")).toBe("/statistics");
  expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});

it("preserves the destination and attributes of a custom rendered anchor", () => {
  const anchor = <a href="/reservations" target="_blank" />;
  render(<ChevronLink render={anchor}>Reservations</ChevronLink>);
  const link = screen.getByRole("link", { name: "Reservations" });
  expect(link.getAttribute("href")).toBe("/reservations");
  expect(link.getAttribute("target")).toBe("_blank");
});
