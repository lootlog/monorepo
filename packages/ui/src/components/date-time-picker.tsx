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
}

const getCurrentTimeValue = () => format(new Date(), "HH:mm");

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Wybierz datę i czas",
  className,
  disabled,
  locale = pl,
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

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDate(undefined);
    setTimeValue(getCurrentTimeValue());
    onChange?.(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPP HH:mm", { locale })
          ) : (
            <span>{placeholder}</span>
          )}
          {selectedDate && (
            <div
              onMouseDown={handleClear}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
          disabled={disabled}
          locale={locale}
        />
        <div className="border-t p-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Czas</Label>
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
