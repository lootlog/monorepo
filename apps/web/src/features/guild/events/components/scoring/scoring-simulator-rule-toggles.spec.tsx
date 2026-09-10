// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_ADVANCED_EVENT_SCORING_RULES } from "@lootlog/domain/scoring";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { ScoringSimulatorRuleToggles } from "./scoring-simulator-rule-toggles";

await initializeTestTranslations();

afterEach(cleanup);

it("toggles a rule exactly once from its labeled row and from its switch", () => {
  const rule = DEFAULT_ADVANCED_EVENT_SCORING_RULES.rules[0];

  if (!rule) throw new Error("Missing default scoring rule");
  const onToggle = vi.fn();
  const name = "Test rule";
  render(
    <ScoringSimulatorRuleToggles
      rules={[{ ...rule, name, enabled: true }]}
      overrides={{}}
      appliedRules={[]}
      onToggle={onToggle}
    />,
  );
  fireEvent.click(screen.getByText(name));
  expect(onToggle).toHaveBeenCalledExactlyOnceWith(rule.id, true);
  onToggle.mockClear();
  fireEvent.click(screen.getByRole("switch", { name }));
  expect(onToggle).toHaveBeenCalledExactlyOnceWith(rule.id, true);
});
