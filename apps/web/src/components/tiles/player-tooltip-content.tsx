import { formatLevel } from "@lootlog/domain/profession";
import type { FC } from "react";

type PlayerTooltipContentProps = {
  name?: string;
  lvl?: number;
  prof?: string;
};

export const PlayerTooltipContent: FC<PlayerTooltipContentProps> = ({
  name,
  lvl,
  prof,
}) => (
  <p className="font-semibold text-foreground">
    {name}
    {lvl !== undefined && (
      <span className="font-normal text-muted-foreground">
        {" "}
        ({formatLevel(lvl, prof)})
      </span>
    )}
  </p>
);
