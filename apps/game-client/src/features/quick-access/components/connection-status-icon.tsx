import { cn } from "cn";
import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import type { SubmissionFeedback } from "@/store/game-store/submission-feedback.store";

type ConnectionStatusIconProps = {
  Icon: LucideIcon;
  className: string;
  recoveryCount: number;
  signalCount: number;
  feedback: SubmissionFeedback | null;
};

export const ConnectionStatusIcon: FC<ConnectionStatusIconProps> = ({
  Icon,
  className,
  recoveryCount,
  signalCount,
  feedback,
}) => {
  const bumpCount = recoveryCount + signalCount;

  return (
    <span className="ll:relative ll:flex">
      <span
        key={`bump-${bumpCount}`}
        className={cn("ll:flex", bumpCount > 0 && "ll-icon-bump")}
      >
        <Icon aria-hidden="true" className={className} />
      </span>
      {recoveryCount > 0 ? (
        <span
          key={`recovery-${recoveryCount}`}
          aria-hidden="true"
          className="ll-connection-recovered ll:pointer-events-none ll:absolute ll:-inset-1 ll:rounded-full ll:border-2 ll:border-solid ll:border-success"
        />
      ) : null}
      {feedback ? (
        <span
          key={`submission-${feedback.sequence}`}
          aria-hidden="true"
          className={cn(
            "ll-submission-dot ll:pointer-events-none ll:absolute ll:-top-0.5 ll:-right-0.5 ll:size-1.5 ll:rounded-full ll:ring-1 ll:ring-black/80",
            feedback.outcome === "logged"
              ? "ll:bg-success"
              : "ll:bg-destructive",
          )}
        />
      ) : null}
    </span>
  );
};
