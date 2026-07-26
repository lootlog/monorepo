import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/config/routes";

export const BrandNavItem = () => {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={ROUTES.user.dashboard}
          className="mx-auto flex size-11 items-center justify-center rounded-xl transition-[background-color,transform] hover:bg-sidebar-accent motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
          aria-label={t("layout.navigation.lootlog")}
        >
          <img
            src="/brand/lootlog-mark.svg"
            alt=""
            aria-hidden="true"
            className="size-9 rounded-lg"
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">
        {t("layout.navigation.lootlog")}
      </TooltipContent>
    </Tooltip>
  );
};
