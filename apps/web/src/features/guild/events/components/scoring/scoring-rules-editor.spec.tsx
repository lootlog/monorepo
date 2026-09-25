// @vitest-environment happy-dom
import { Controller, useForm } from "react-hook-form";
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
import { hasValidScoringNumbers } from "../../utils/scoring-number-validation";

await initializeTestTranslations();

afterEach(cleanup);

type ParentValues = { name: string; scoringRules: EventScoringRules };

const initialRules = { ...DEFAULT_ADVANCED_EVENT_SCORING_RULES, rules: [] };

function ParentForm({
  onSave,
  rules = initialRules,
}: {
  onSave: (values: ParentValues) => void;
  rules?: EventScoringRules;
}) {
  const form = useForm<ParentValues>({
    defaultValues: { name: "Event", scoringRules: rules },
  });

  return (
    <form aria-label="scoring-form" onSubmit={form.handleSubmit(onSave)}>
      <Controller
        control={form.control}
        name="scoringRules"
        rules={{ validate: hasValidScoringNumbers }}
        render={({ field }) => (
          <ScoringRulesEditor
            value={field.value}
            onChange={field.onChange}
            ref={field.ref}
          />
        )}
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

it.each([
  {
    name: "numeric penalty condition",
    condition: {
      type: "NUMERIC",
      factor: "afkPercentage",
      operator: ">=",
      value: 50,
    },
  },
  {
    name: "respawn coverage penalty condition",
    condition: {
      type: "RESPAWN_WINDOW_COVERAGE",
      from: "00:00",
      to: "23:59",
      operator: "<=",
      value: 50,
    },
  },
] satisfies {
  name: string;
  condition: EventScoringRules["rules"][number]["conditions"][number];
}[])(
  "does not save an unconditional penalty when clearing the last $name",
  async ({ condition }) => {
    const onSave = vi.fn<(values: ParentValues) => void>();

    const rules: EventScoringRules = {
      ...initialRules,
      rules: [
        {
          id: "penalty",
          name: "Penalty",
          conditions: [condition],
          action: { type: "ZERO_BASE" },
        },
      ],
    };

    render(<ParentForm rules={rules} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Penalty/ }));

    const threshold = screen.getByRole("spinbutton", {
      name: "events.scoring.fieldLabel.conditionValue",
    });

    fireEvent.change(threshold, { target: { value: "" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(document.activeElement).toBe(threshold));
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(threshold, { target: { value: "25" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0]?.[0].scoringRules.rules).toEqual([
      {
        ...rules.rules[0],
        conditions: [{ ...condition, value: 25 }],
      },
    ]);
  },
);

it.each(["SET_BASE", "ADD_BONUS"] as const)(
  "does not drop a %s rule when its points are cleared",
  async (type) => {
    const onSave = vi.fn<(values: ParentValues) => void>();

    const rules: EventScoringRules = {
      ...initialRules,
      rules: [
        {
          id: "award",
          name: "Award",
          conditions: [{ type: "BOOLEAN", factor: "eligible", value: true }],
          action: { type, points: 0.5 },
        },
      ],
    };

    render(<ParentForm rules={rules} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Award/ }));

    const points = screen.getByRole("spinbutton", {
      name: "events.scoring.fieldLabel.actionPoints",
    });

    fireEvent.change(points, { target: { value: "" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(document.activeElement).toBe(points));
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(points, { target: { value: "0.75" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0]?.[0].scoringRules.rules).toEqual([
      { ...rules.rules[0], action: { type, points: 0.75 } },
    ]);
  },
);

it.each([
  ["hardCapPoints", ""],
  ["hardCapPoints", "-1"],
  ["minTrackingPercentForBonuses", ""],
  ["minTrackingPercentForBonuses", "101"],
])(
  "does not silently replace invalid %s settings (%s) with normalized defaults",
  async (setting, value) => {
    const onSave = vi.fn<(values: ParentValues) => void>();
    render(<ParentForm onSave={onSave} />);

    const input = screen.getByRole("spinbutton", {
      name: `events.scoring.${setting}`,
    });

    fireEvent.change(input, { target: { value } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0]?.[0].scoringRules).toEqual({
      ...initialRules,
      [setting]: 0,
    });
  },
);
