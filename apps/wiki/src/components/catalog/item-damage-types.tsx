import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { findDamageTypes } from "@/lib/damage-types";

/** The item's damage types as icons, each named in a tooltip. */
export function ItemDamageTypes({ stat }: { stat: string }) {
  const damageTypes = findDamageTypes(stat);

  if (damageTypes.length === 0) return null;

  return (
    <ul className="flex shrink-0 items-center gap-1">
      {damageTypes.map(({ key, icon: Icon, className }) => (
        <li key={key} className="flex">
          <Tooltip>
            <TooltipTrigger
              render={<span role="img" />}
              aria-label={t(`catalog.damageTypes.${key}`)}
              className={cn("cursor-pointer", className)}
            >
              <Icon aria-hidden="true" className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{t(`catalog.damageTypes.${key}`)}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
