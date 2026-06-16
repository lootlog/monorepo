import { useState, useEffect, useRef, type FC } from "react";
import { XCircle } from "lucide-react";

type DatePickerProps = {
  placeholder: string;
  label?: string;
  date: Date | undefined;
  setDate: (date: Date) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  onClear?: () => void;
  minuteStep?: number;
};

export const DatePicker: FC<DatePickerProps> = ({
  placeholder,
  label,
  date,
  setDate,
  open,
  setOpen,
  onClear,
  minuteStep = 1,
}) => {
  const defaultDate = date || new Date();
  const [viewYear, setViewYear] = useState<number>(defaultDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(defaultDate.getMonth());
  const [hour, setHour] = useState<number>(defaultDate.getHours());
  const [minute, setMinute] = useState<number>(defaultDate.getMinutes());

  const ref = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hourScrollRef = useRef<HTMLDivElement | null>(null);
  const minuteScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const clickedElement = e.target as Node;

      const isInsideButton =
        ref.current && ref.current.contains(clickedElement);
      const isInsidePopover =
        popoverRef.current && popoverRef.current.contains(clickedElement);

      if (!isInsideButton && !isInsidePopover) {
        setOpen(false);
      }
    };

    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [open, setOpen]);

  useEffect(() => {
    if (date) {
      setHour(date.getHours());
      setMinute(date.getMinutes());
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    }
  }, [date]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (hourScrollRef.current) {
          const hourButton = hourScrollRef.current.querySelector(
            `button:nth-child(${hour + 1})`,
          );
          hourButton?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (minuteScrollRef.current) {
          const minuteButton = minuteScrollRef.current.querySelector(
            `button:nth-child(${minute + 1})`,
          );
          minuteButton?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 0);
    }
  }, [open, hour, minute]);

  const startOfMonth = (y: number, m: number) => new Date(y, m, 1);
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  const formatDisplay = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}.${month}.${year}`;
  };

  const handleDayClick = (d: number) => {
    const newDate = new Date(viewYear, viewMonth, d, hour, minute);
    setDate(newDate);
  };

  const display = date
    ? formatDisplay(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          hour,
          minute,
        ),
      )
    : "";

  return (
    <>
      <div className="flex flex-col gap-1 w-full">
        {label && <span className="text-xs font-semibold px-3">{label}</span>}
        <div className="relative" ref={ref} data-picker-root>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setOpen(!open);
              }
            }}
            className="w-full text-left flex h-9 items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <span
              className={`truncate text-sm ${date ? "text-foreground" : "text-muted-foreground"}`}
            >
              {date ? display : placeholder || "Wybierz datę i godzinę"}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {date && onClear && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  title="Wyczyść datę"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              <svg
                className="h-4 w-4 shrink-0 opacity-50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l4 4 4-4"
                />
              </svg>
            </div>
          </div>

          {open && (
            <div
              ref={popoverRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute z-20 mt-2 w-80 rounded-md border border-input bg-popover p-3 shadow-md text-popover-foreground"
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewMonth(11);
                      setViewYear((y) => y - 1);
                    } else setViewMonth((m) => m - 1);
                  }}
                  className="px-2 py-1 rounded hover:bg-accent text-accent-foreground"
                >
                  ‹
                </button>
                <div className="font-medium text-foreground text-center flex-1">
                  {new Date(viewYear, viewMonth).toLocaleString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewMonth(0);
                      setViewYear((y) => y + 1);
                    } else setViewMonth((m) => m + 1);
                  }}
                  className="px-2 py-1 rounded hover:bg-accent text-accent-foreground"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-3">
                {(() => {
                  const firstDay = startOfMonth(viewYear, viewMonth).getDay();
                  const leading = (firstDay + 6) % 7;
                  const total = daysInMonth(viewYear, viewMonth);
                  const cells: React.ReactElement[] = [];
                  for (let i = 0; i < leading; i++)
                    cells.push(<div key={`e-${i}`} className="py-2" />);
                  for (let d = 1; d <= total; d++) {
                    const isSelected =
                      date &&
                      date.getFullYear() === viewYear &&
                      date.getMonth() === viewMonth &&
                      date.getDate() === d;
                    cells.push(
                      <button
                        key={`d-${d}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(d);
                        }}
                        className={`py-1 rounded ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      >
                        {d}
                      </button>,
                    );
                  }
                  return cells;
                })()}
              </div>

              <div className="flex items-center justify-center gap-2 mb-3 py-4">
                <div className="flex flex-col items-center">
                  <div
                    ref={hourScrollRef}
                    className="overflow-y-auto h-32 w-16 snap-y snap-proximity flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <button
                        key={`h-${i}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHour(i);
                          const newDate = new Date(
                            viewYear,
                            viewMonth,
                            defaultDate.getDate(),
                            i,
                            minute,
                          );
                          setDate(newDate);
                        }}
                        className={`h-6 flex items-center justify-center text-sm transition-colors flex-shrink-0 snap-center ${
                          hour === i
                            ? "bg-primary text-primary-foreground font-semibold text-lg"
                            : "text-muted-foreground hover:bg-accent/50"
                        }`}
                      >
                        {String(i).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-foreground">:</div>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    ref={minuteScrollRef}
                    className="overflow-y-auto h-32 w-16 snap-y snap-proximity flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
                  >
                    {Array.from(
                      { length: Math.ceil(60 / minuteStep) },
                      (_, i) => i * minuteStep,
                    ).map((i) => (
                      <button
                        key={`m-${i}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMinute(i);
                          const newDate = new Date(
                            viewYear,
                            viewMonth,
                            defaultDate.getDate(),
                            hour,
                            i,
                          );
                          setDate(newDate);
                        }}
                        className={`h-6 flex items-center justify-center text-sm transition-colors flex-shrink-0 snap-center ${
                          minute === i
                            ? "bg-primary text-primary-foreground font-semibold text-lg"
                            : "text-muted-foreground hover:bg-accent/50"
                        }`}
                      >
                        {String(i).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
