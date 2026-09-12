import * as z from "zod";
import {
  CreateManualTimerDtoType,
  type CreateManualTimerDto,
} from "@lootlog/client/main";
import { parseDurationToSeconds } from "./add-timer-duration";

export const MAX_NPC_NAME_LENGTH = 50;

export const MIN_NPC_LEVEL = 1;

export const MAX_NPC_LEVEL = 500;

export const EMPTY_NPC_TYPE_VALUE = "none";

export const MANUAL_TIMER_NPC_TYPES = [
  CreateManualTimerDtoType.ELITE2,
  CreateManualTimerDtoType.ELITE3,
  CreateManualTimerDtoType.HERO,
  CreateManualTimerDtoType.TITAN,
] as const satisfies readonly NonNullable<CreateManualTimerDto["type"]>[];

export const resolveManualTimerNpcType = (value: string) =>
  MANUAL_TIMER_NPC_TYPES.find((npcType) => npcType === value) ?? "";

export type TimerFormTranslation = (
  key: string,
  options?: { min?: number; max?: number },
) => string;

type TimerFormValidationData = {
  endDate?: string;
  lvl?: string;
  maxDuration?: string;
  minDuration?: string;
  startDate?: string;
};

const hasText = (value?: string): value is string =>
  value !== undefined && value.length > 0;

const addValidationIssue = (
  context: z.RefinementCtx,
  message: string,
  path: keyof TimerFormValidationData,
) => {
  context.addIssue({ code: "custom", message, path: [path] });
};

const validateTimerLevel = (
  data: TimerFormValidationData,
  context: z.RefinementCtx,
  t: TimerFormTranslation,
) => {
  if (!hasText(data.lvl)) {
    return;
  }

  const level = Number(data.lvl);

  if (
    Number.isInteger(level) &&
    level >= MIN_NPC_LEVEL &&
    level <= MAX_NPC_LEVEL
  ) {
    return;
  }

  addValidationIssue(
    context,
    t("addForm.validation.lvlRange", {
      min: MIN_NPC_LEVEL,
      max: MAX_NPC_LEVEL,
    }),
    "lvl",
  );
};

const validateTimerDurations = (
  data: TimerFormValidationData,
  context: z.RefinementCtx,
  t: TimerFormTranslation,
) => {
  const { minDuration, maxDuration } = data;

  if (!hasText(minDuration)) {
    addValidationIssue(
      context,
      t("addForm.validation.minDurationRequired"),
      "minDuration",
    );
  } else if (parseDurationToSeconds(minDuration) <= 0) {
    addValidationIssue(
      context,
      t("addForm.validation.durationGreaterThanZero"),
      "minDuration",
    );
  }

  if (!hasText(maxDuration)) {
    addValidationIssue(
      context,
      t("addForm.validation.maxDurationRequired"),
      "maxDuration",
    );

    return;
  }

  const maxSeconds = parseDurationToSeconds(maxDuration);

  if (maxSeconds <= 0) {
    addValidationIssue(
      context,
      t("addForm.validation.durationGreaterThanZero"),
      "maxDuration",
    );
  }

  if (
    hasText(minDuration) &&
    maxSeconds < parseDurationToSeconds(minDuration)
  ) {
    addValidationIssue(
      context,
      t("addForm.validation.maxDurationMin"),
      "maxDuration",
    );
  }
};

const validateTimerDates = (
  data: TimerFormValidationData,
  context: z.RefinementCtx,
  t: TimerFormTranslation,
) => {
  const { startDate, endDate } = data;

  if (!hasText(startDate)) {
    addValidationIssue(
      context,
      t("addForm.validation.startDateRequired"),
      "startDate",
    );
  }

  if (!hasText(endDate)) {
    addValidationIssue(
      context,
      t("addForm.validation.endDateRequired"),
      "endDate",
    );
  }

  if (
    hasText(startDate) &&
    hasText(endDate) &&
    new Date(endDate) <= new Date(startDate)
  ) {
    addValidationIssue(
      context,
      t("addForm.validation.endDateAfterStart"),
      "endDate",
    );
  }
};

export const createAddTimerFormSchema = (t: TimerFormTranslation) =>
  z
    .object({
      name: z
        .string()
        .min(1, t("addForm.validation.nameRequired"))
        .max(
          MAX_NPC_NAME_LENGTH,
          t("addForm.validation.nameMax", { max: MAX_NPC_NAME_LENGTH }),
        ),
      minDuration: z.string().optional(),
      maxDuration: z.string().optional(),
      lvl: z.string().optional(),
      type: z.enum(MANUAL_TIMER_NPC_TYPES).or(z.literal("")).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const usingDurations =
        hasText(data.minDuration) || hasText(data.maxDuration);

      const usingDates = hasText(data.startDate) || hasText(data.endDate);

      validateTimerLevel(data, ctx, t);

      if (!usingDurations && !usingDates) {
        addValidationIssue(
          ctx,
          t("addForm.validation.provideRespawnOrDates"),
          "minDuration",
        );

        return;
      }

      if (usingDurations) {
        validateTimerDurations(data, ctx, t);
      }

      if (usingDates) {
        validateTimerDates(data, ctx, t);
      }
    });

export type AddTimerFormValues = z.infer<
  ReturnType<typeof createAddTimerFormSchema>
>;
