import { DAYS, LABEL_COLUMN_WIDTH } from "./constants";

type ScheduleDaysHeaderProps = {
  weekStart: Date;
};

export const ScheduleDaysHeader: React.FC<ScheduleDaysHeaderProps> = ({
  weekStart,
}) => {
  return (
    <div
      className="grid border-b border-border"
      style={{
        gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${DAYS.length}, minmax(0, 1fr))`,
      }}
    >
      <div className="bg-background" />
      {DAYS.map((day, idx) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + idx);
        const dayNumber = date.getDate();
        return (
          <div
            key={day}
            className="border-l border-border flex flex-col items-center justify-center py-1"
            style={{ minWidth: 0 }}
          >
            <span className="text-xs text-muted-foreground">{day}</span>
            <span className="text-xs font-semibold text-primary mt-1">
              {dayNumber}
            </span>
          </div>
        );
      })}
    </div>
  );
};
