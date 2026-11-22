import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { cloneElement } from "react";

type MemberProfileLinkProps = {
  link: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  icon: LucideIcon;
  primary?: boolean;
  children: React.ReactNode;
};

export const MemberProfileLink = ({
  link,
  icon: Icon,
  primary = false,
  children,
}: MemberProfileLinkProps) =>
  cloneElement(link, {
    className: cn(
      "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm no-underline outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 motion-reduce:transition-none",
      primary
        ? "font-medium text-foreground"
        : "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
    ),
    children: (
      <>
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{children}</span>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </>
    ),
  });
