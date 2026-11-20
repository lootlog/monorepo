// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { Form } from "@lootlog/ui/components/form";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
} from "@testing-library/react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { afterEach, expect, it } from "vitest";
import { NotificationScheduleFields } from "./notification-schedule-fields";
import type { RuleFormValues } from "./utils/notification-rule-form.schema";

await initializeTestTranslations();

afterEach(cleanup);

it("lets users enter a schedule after switching from a timer without replacing the form", () => {
  const { result } = renderHook(() => ({
    form: useForm<RuleFormValues>({
      defaultValues: {
        triggerType: "TIMER_BEFORE_SPAWN",
        scheduleIntervalType: "ONCE",
        scheduledAt: "",
        scheduleTimeOfDay: "",
      },
    }),
    t: useTranslation().t,
  }));

  const { form, t } = result.current;

  const view = render(
    <Form {...form}>
      <NotificationScheduleFields form={form} t={t} />
    </Form>,
  );

  act(() => form.setValue("triggerType", "SCHEDULED_MESSAGE"));

  const scheduledAt = view.getByLabelText(
    t("settings.notifications.fields.scheduledAt"),
  );

  fireEvent.change(scheduledAt, { target: { value: "2099-09-22T18:30" } });
  expect(form.getValues("scheduledAt")).toBe("2099-09-22T18:30");

  act(() => form.setValue("scheduleIntervalType", "DAILY"));

  const time = view.getByLabelText(
    t("settings.notifications.fields.scheduleTimeOfDay"),
  );

  fireEvent.change(time, { target: { value: "19:45" } });
  expect(form.getValues("scheduleTimeOfDay")).toBe("19:45");
});
