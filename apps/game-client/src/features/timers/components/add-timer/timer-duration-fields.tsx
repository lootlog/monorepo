import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AddTimerFormValues } from "@/features/timers/model/add-timer-form-schema";
import { TimerFormFieldError } from "./timer-form-field-error";

type TimerDurationFieldsProps = {
  form: UseFormReturn<AddTimerFormValues>;
  disabled: boolean;
};

export function TimerDurationFields({
  form,
  disabled,
}: TimerDurationFieldsProps) {
  const { t } = useTranslation("timers");
  const { errors } = form.formState;

  return (
    <>
      <div className="ll:w-full">
        <Label htmlFor="minDuration">{t("addForm.minDurationLabel")}</Label>
        <Input
          id="minDuration"
          placeholder={t("addForm.minDurationPlaceholder")}
          autoComplete="off"
          disabled={disabled}
          {...form.register("minDuration")}
        />
        <TimerFormFieldError message={errors.minDuration?.message} />
      </div>

      <div className="ll:w-full">
        <Label htmlFor="maxDuration">{t("addForm.maxDurationLabel")}</Label>
        <Input
          id="maxDuration"
          placeholder={t("addForm.maxDurationPlaceholder")}
          autoComplete="off"
          disabled={disabled}
          {...form.register("maxDuration")}
        />
        <TimerFormFieldError message={errors.maxDuration?.message} />
      </div>
    </>
  );
}
