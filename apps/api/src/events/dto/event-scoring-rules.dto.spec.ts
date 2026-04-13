import { DEFAULT_ADVANCED_EVENT_SCORING_RULES } from "@lootlog/types";
import { EventScoringRulesSchema } from "./event-scoring-rules.dto";

const cloneRulesPayload = () =>
  JSON.parse(JSON.stringify(DEFAULT_ADVANCED_EVENT_SCORING_RULES));

describe("EventScoringRulesDto", () => {
  it("accepts the default advanced ruleset with boolean conditions", () => {
    const result = EventScoringRulesSchema.safeParse(cloneRulesPayload());

    expect(result.success).toBe(true);
  });

  it("rejects a boolean condition with a numeric factor", () => {
    const payload = cloneRulesPayload();
    payload.rules[3].conditions[1] = {
      type: "BOOLEAN",
      factor: "trackingDurationPercentage",
      value: false,
    };

    const result = EventScoringRulesSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });

  it("rejects a numeric condition with a boolean value", () => {
    const payload = cloneRulesPayload();
    payload.rules[0].conditions[0] = {
      type: "NUMERIC",
      factor: "trackingDurationPercentage",
      operator: ">=",
      value: false,
    };

    const result = EventScoringRulesSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });

  it("rejects a boolean condition with extra properties", () => {
    const payload = cloneRulesPayload();
    payload.rules[3].conditions[1] = {
      type: "BOOLEAN",
      factor: "memberPresentAtKill",
      value: false,
      operator: ">=",
    };

    const result = EventScoringRulesSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });

  it("rejects an incomplete kill time window condition", () => {
    const payload = cloneRulesPayload();
    payload.rules[6].conditions[0] = {
      type: "KILL_TIME_IN_WINDOW",
      from: "08:00",
    };

    const result = EventScoringRulesSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });
});
