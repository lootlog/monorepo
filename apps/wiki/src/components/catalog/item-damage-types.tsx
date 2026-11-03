import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";
import { findDamageTypes } from "@/lib/damage-types";

/** The item's damage types as icons, each named in a tooltip. */
export function ItemDamageTypes({ stat }: { stat: string }) {
  const damageTypes = findDamageTypes(stat);

  if (damageTypes.length === 0) return null;

  return (
    <ul className="flex max-w-12 flex-wrap justify-center gap-1">
      {damageTypes.map(({ key, icon: Icon, className }) => (
        <li key={key} className="flex">
          <Tooltip>
            <TooltipTrigger
              render={<span role="img" />}
              aria-label={t(`catalog.damageTypes.${key}`)}
              className={className}
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
