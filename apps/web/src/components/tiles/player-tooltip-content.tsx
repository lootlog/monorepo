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
    {name}{" "}
    <span className="font-normal text-muted-foreground">
      ({lvl}
      {prof?.charAt(0).toLowerCase()})
    </span>
  </p>
);
