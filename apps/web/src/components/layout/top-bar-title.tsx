import type { CSSProperties, ReactNode } from "react";

type TopBarTitleProps = {
  children: ReactNode;
  media?: ReactNode;
  style?: CSSProperties;
};

export const TopBarTitle = ({ children, media, style }: TopBarTitleProps) => (
  <span
    aria-current="page"
    className="flex h-8 min-w-0 items-center gap-2 px-2 text-sm font-semibold text-foreground max-md:px-0 max-md:text-base"
  >
    {media}
    <span className="truncate" style={style}>
      {children}
    </span>
  </span>
);
