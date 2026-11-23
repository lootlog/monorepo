import { Link, type LinkOptions } from "@tanstack/react-router";
import { NavigationMenuLink } from "@lootlog/ui/components/navigation-menu";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type WikiNavigationMenuLinkProps = {
  link: LinkOptions;
  icon: LucideIcon;
  label: string;
  description?: string;
  badge?: ReactNode;
  active: boolean;
};

export function WikiNavigationMenuLink({
  link,
  icon: Icon,
  label,
  description,
  badge,
  active,
}: WikiNavigationMenuLinkProps) {
  return (
    <NavigationMenuLink
      active={active}
      closeOnClick
      render={<Link {...link} />}
      className="items-start gap-3 p-3"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium text-foreground">
          {label}
          {badge}
        </span>
        {description && (
          <span className="line-clamp-2 text-xs/relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </NavigationMenuLink>
  );
}
