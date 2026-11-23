import { SECTION_LABEL_CLASS_NAME } from "@/components/section-label";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsSectionHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  as?: "h3" | "h4";
  className?: string;
};

export const SettingsSectionHeader: FC<SettingsSectionHeaderProps> = ({
  title,
  description,
  actions,
  as: Heading = "h3",
  className,
}) => (
  <div
    className={cn(
      "ll:flex ll:flex-wrap ll:items-center ll:justify-between ll:gap-x-6 ll:gap-y-1 ll:px-2",
      className,
    )}
  >
    <div className="ll:min-w-0 ll:flex-1">
      {title ? (
        <Heading
          className={cn(
            "ll:m-0",
            Heading === "h3"
              ? SECTION_LABEL_CLASS_NAME
              : "ll:text-[13px] ll:font-semibold ll:leading-[18px] ll:text-foreground",
          )}
        >
          {title}
        </Heading>
      ) : null}
      {description ? (
        <p className="ll:m-0 ll:mt-1 ll:max-w-[80ch] ll:text-xs ll:leading-[17px] ll:text-pretty ll:text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
    {actions ? (
      <div className="ll:flex ll:shrink-0 ll:items-center">{actions}</div>
    ) : null}
  </div>
);
