"use client";

import * as React from "react";
import { format, type Locale } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { Button } from "@lootlog/ui/components/button";
import { Calendar } from "@lootlog/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import type { Matcher } from "react-day-picker";

export interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: Matcher | Matcher[];
  locale?: Locale;
  min?: Date;
  max?: Date;
  minuteStep?: number;
  timeLabel?: string;
  clearLabel?: string;
  required?: boolean;
}

const getCurrentTimeValue = () => format(new Date(), "HH:mm");

const getDisabledDays = (
  disabled: Matcher | Matcher[] | undefined,
  min: Date | undefined,
  max: Date | undefined,
): Matcher | Matcher[] | undefined => {
  const rangeMatchers: Matcher[] = [];

  if (min) {
    const minDay = new Date(min);
    minDay.setHours(0, 0, 0, 0);
    rangeMatchers.push({ before: minDay });
  }

  if (max) {
    const maxDay = new Date(max);
    maxDay.setHours(23, 59, 59, 999);
    rangeMatchers.push({ after: maxDay });
  }

  if (disabled) {
    rangeMatchers.push(...(Array.isArray(disabled) ? disabled : [disabled]));
  }

  return rangeMatchers.length > 0 ? rangeMatchers : undefined;
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Wybierz datę i czas",
  className,
  disabled,
  locale = pl,
  min,
  max,
  minuteStep = 1,
  timeLabel = "Czas",
  clearLabel = "Wyczyść datę i czas",
  required = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value,
  );
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(value, "HH:mm") : getCurrentTimeValue(),
  );

  React.useEffect(() => {
    setSelectedDate(value);
    if (value) {
      setTimeValue(format(value, "HH:mm"));
      return;
    }
    setTimeValue(getCurrentTimeValue());
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange?.(undefined);
      return;
    }

    const [hours, minutes] = timeValue.split(":").map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);

    if (selectedDate) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      setSelectedDate(newDate);
      onChange?.(newDate);
    }
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setTimeValue(getCurrentTimeValue());
    onChange?.(undefined);
    setOpen(false);
  };

  const disabledDays = getDisabledDays(disabled, min, max);

  const selectedDay = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const minTime =
    min && selectedDay === format(min, "yyyy-MM-dd")
      ? format(min, "HH:mm")
      : undefined;
  const maxTime =
    max && selectedDay === format(max, "yyyy-MM-dd")
      ? format(max, "HH:mm")
      : undefined;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "min-w-0 flex-1 justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground",
                className,
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          <span className="truncate">
            {selectedDate
              ? format(selectedDate, "PPP HH:mm", { locale })
              : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            autoFocus
            disabled={disabledDays}
            locale={locale}
          />
          <div className="flex flex-col gap-2 border-t p-3">
            <Label className="text-xs text-muted-foreground">{timeLabel}</Label>
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="w-full"
              min={minTime}
              max={maxTime}
              step={minuteStep * 60}
              required={required}
            />
          </div>
        </PopoverContent>
      </Popover>
      {selectedDate && !required && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={clearLabel}
          onClick={handleClear}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
