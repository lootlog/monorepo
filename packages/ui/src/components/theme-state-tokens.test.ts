import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const COMPONENT_FILES = [
  "badge.tsx",
  "button.tsx",
  "calendar.tsx",
  "card.tsx",
  "command.tsx",
  "input-group.tsx",
  "input.tsx",
  "navigation-menu.tsx",
  "radio-group.tsx",
  "select.tsx",
  "sidebar.tsx",
  "switch.tsx",
  "table.tsx",
  "tabs.tsx",
  "textarea.tsx",
  "toggle.tsx",
] as const;

const FORBIDDEN_IMPLICIT_COLOR =
  /color-mix|(?:bg|border|ring|text)-(?:accent|destructive|input|muted|primary|ring|secondary|sidebar-accent)\/\d+/;

describe("generic component theme states", () => {
  it.each(COMPONENT_FILES)("uses named colors in %s", (fileName) => {
    const filePath = fileURLToPath(new URL(fileName, import.meta.url));
    const source = readFileSync(filePath, "utf8");

    expect(source).not.toMatch(FORBIDDEN_IMPLICIT_COLOR);
  });
});
