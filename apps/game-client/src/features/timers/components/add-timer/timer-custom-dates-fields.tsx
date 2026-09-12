import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import { parseMsToTime } from "@lootlog/datetime";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AddTimerFormValues } from "@/features/timers/model/add-timer-form-schema";
import { TimerFormFieldError } from "./timer-form-field-error";

type TimerCustomDatesFieldsProps = {
  form: UseFormReturn<AddTimerFormValues>;
  startDate: string | undefined;
  endDate: string | undefined;
};

export function TimerCustomDatesFields({
  form,
  startDate,
  endDate,
}: TimerCustomDatesFieldsProps) {
  const { t } = useTranslation("timers");
  const { errors } = form.formState;

  const windowMs =
    startDate && endDate
      ? new Date(endDate).getTime() - new Date(startDate).getTime()
      : null;

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full">
      <div className="ll:w-full">
        <Label htmlFor="startDate">{t("addForm.startDateLabel")}</Label>
        <Input
          id="startDate"
          type="datetime-local"
          {...form.register("startDate")}
          className="ll:text-xs"
        />
        <TimerFormFieldError message={errors.startDate?.message} />
      </div>
      <div className="ll:w-full">
        <Label htmlFor="endDate">{t("addForm.endDateLabel")}</Label>
        <Input
          id="endDate"
          type="datetime-local"
          {...form.register("endDate")}
          className="ll:text-xs"
        />
        <TimerFormFieldError message={errors.endDate?.message} />
      </div>
      {windowMs !== null && (
        <p className="ll:text-xs ll:text-gray-400">
          {t("addForm.windowLabel")}{" "}
          {windowMs > 0 ? parseMsToTime(windowMs) : t("addForm.invalidRange")}
        </p>
      )}
    </div>
  );
}
