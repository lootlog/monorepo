import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { type ValidationError, validateSync } from "class-validator";
import { DEFAULT_ADVANCED_EVENT_SCORING_RULES } from "../constants/scoring-rules.constant";
import { EventScoringRulesDto } from "./event-scoring-rules.dto";

const cloneRulesPayload = () =>
  JSON.parse(JSON.stringify(DEFAULT_ADVANCED_EVENT_SCORING_RULES));

const collectConstraintMessages = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...collectConstraintMessages(error.children ?? []),
  ]);

const validatePayload = (payload: unknown) =>
  validateSync(plainToInstance(EventScoringRulesDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe("EventScoringRulesDto", () => {
  it("accepts the default advanced ruleset with boolean conditions", () => {
    const errors = validatePayload(cloneRulesPayload());

    expect(errors).toHaveLength(0);
  });

  it("rejects a boolean condition with a numeric factor", () => {
    const payload = cloneRulesPayload();
    payload.rules[3].conditions[1] = {
      type: "BOOLEAN",
      factor: "trackingDurationPercentage",
      value: false,
    };

    const messages = collectConstraintMessages(validatePayload(payload));

    expect(messages).toContain(
      "factor must be one of the following values: eligible, memberPresentAtKill, wasPresent",
    );
  });

  it("rejects a numeric condition with a boolean value", () => {
    const payload = cloneRulesPayload();
    payload.rules[0].conditions[0] = {
      type: "NUMERIC",
      factor: "trackingDurationPercentage",
      operator: ">=",
      value: false,
    };

    const messages = collectConstraintMessages(validatePayload(payload));

    expect(messages).toContain(
      "value must be a number conforming to the specified constraints",
    );
  });

  it("rejects a boolean condition with a numeric operator", () => {
    const payload = cloneRulesPayload();
    payload.rules[3].conditions[1] = {
      type: "BOOLEAN",
      factor: "memberPresentAtKill",
      value: false,
      operator: ">=",
    };

    const messages = collectConstraintMessages(validatePayload(payload));

    expect(messages).toContain("property operator should not exist");
  });

  it("rejects an incomplete kill time window condition", () => {
    const payload = cloneRulesPayload();
    payload.rules[6].conditions[0] = {
      type: "KILL_TIME_IN_WINDOW",
      from: "08:00",
    };

    const messages = collectConstraintMessages(validatePayload(payload));

    expect(messages).toContain(
      "to must match /^([01]\\d|2[0-3]):([0-5]\\d)$/ regular expression",
    );
  });
});
