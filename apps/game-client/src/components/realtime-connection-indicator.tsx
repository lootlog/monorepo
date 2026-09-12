import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRealtimeConnection } from "@/hooks/use-realtime-connection";

type RealtimeConnectionIndicatorProps = {
  className?: string;
};

/** Green or red dot with the joined servers in its tooltip; the parent positions it. */
export const RealtimeConnectionIndicator: FC<
  RealtimeConnectionIndicatorProps
> = ({ className }) => {
  const { t } = useTranslation("common");
  const { isConnected, joinedGuildNames } = useRealtimeConnection();

  const label = t(
    isConnected ? "realtime.connectedToServers" : "realtime.notConnected",
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "ll:p-0 ll:border-0 ll:size-3 ll:rounded-full ll:cursor-pointer",
            isConnected ? "ll:bg-green-400" : "ll:bg-red-400",
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        {isConnected ? (
          <div className="ll:flex ll:flex-col ll:gap-2">
            <div>{label}</div>
            <div>
              {joinedGuildNames.map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>
          </div>
        ) : (
          <div>{label}</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
