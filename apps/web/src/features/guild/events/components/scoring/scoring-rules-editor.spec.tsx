// @vitest-environment happy-dom
import { useForm } from "react-hook-form";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringRules,
} from "@lootlog/domain/scoring";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { ScoringRulesEditor } from "./scoring-rules-editor";

await initializeTestTranslations();

afterEach(cleanup);

type ParentValues = { name: string; scoringRules: EventScoringRules };

const initialRules = { ...DEFAULT_ADVANCED_EVENT_SCORING_RULES, rules: [] };

function ParentForm({ onSave }: { onSave: (values: ParentValues) => void }) {
  const form = useForm<ParentValues>({
    defaultValues: { name: "Event", scoringRules: initialRules },
  });

  return (
    <form aria-label="scoring-form" onSubmit={form.handleSubmit(onSave)}>
      <ScoringRulesEditor
        value={form.watch("scoringRules")}
        onChange={(value) =>
          form.setValue("scoringRules", value, { shouldDirty: true })
        }
      />
      <button type="submit">Save</button>
      <button
        type="button"
        onClick={() =>
          form.reset({
            name: "Reset event",
            scoringRules: { ...initialRules, hardCapPoints: 9 },
          })
        }
      >
        Reset
      </button>
    </form>
  );
}

it("updates the parent form without replacing the focused field and accepts parent resets", async () => {
  const onSave = vi.fn<(values: ParentValues) => void>();
  render(<ParentForm onSave={onSave} />);
  const cap = screen.getAllByRole("spinbutton")[0];

  if (!(cap instanceof HTMLInputElement))
    throw new Error("Missing hard cap input");
  cap.focus();
  fireEvent.change(cap, { target: { value: "7" } });
  expect(document.activeElement).toBe(cap);
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Event",
        scoringRules: expect.objectContaining({ hardCapPoints: 7 }),
      }),
      expect.anything(),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  await waitFor(() => {
    const resetCap = screen.getAllByRole("spinbutton")[0];
    expect(resetCap instanceof HTMLInputElement && resetCap.value).toBe("9");
  });
  fireEvent.click(
    screen.getByRole("button", { name: "events.scoring.addRule" }),
  );
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() =>
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Reset event",
        scoringRules: expect.objectContaining({
          hardCapPoints: 9,
          rules: [expect.objectContaining({ enabled: true })],
        }),
      }),
      expect.anything(),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  await waitFor(() =>
    expect(screen.queryByText("events.scoring.unnamedRule")).toBeNull(),
  );
});
