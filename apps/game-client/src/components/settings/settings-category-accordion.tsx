import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsCategoryAccordionProps = {
  /** Items open by default; pass every id to start fully expanded. */
  defaultOpen?: string[];
  /** Controlled open ids, for lists that open an item they just added. */
  value?: string[];
  onValueChange?: (openIds: string[]) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Stack of collapsible categories inside one section (sound categories).
 * Several items may be open at once.
 */
export const SettingsCategoryAccordion: FC<SettingsCategoryAccordionProps> = ({
  defaultOpen = [],
  value,
  onValueChange,
  children,
  className,
}) => (
  <Accordion
    type="multiple"
    defaultValue={value === undefined ? defaultOpen : undefined}
    value={value}
    onValueChange={onValueChange}
    className={cn("ll:flex ll:flex-col ll:gap-1", className)}
  >
    {children}
  </Accordion>
);

type SettingsCategoryAccordionItemProps = {
  id: string;
  /** Category name; usually an NpcTypeChip or icon + text. */
  title: ReactNode;
  /** Short state summary shown right of the title, e.g. "Włączone · 3 serwery". */
  summary?: ReactNode;
  /** Small trailing actions that stay usable without expanding (icon buttons). */
  actions?: ReactNode;
  /** Accessible name of the expand trigger when the title is not plain text. */
  triggerLabel: string;
  children: ReactNode;
};

/**
 * One collapsible category. The header holds only the name, a short summary
 * and the chevron, so it never competes with controls for width; the
 * controls live in the rows below.
 */
export const SettingsCategoryAccordionItem: FC<
  SettingsCategoryAccordionItemProps
> = ({ id, title, summary, actions, triggerLabel, children }) => (
  <AccordionItem value={id} className="ll:rounded-sm ll:bg-black/25">
    <div className="ll:flex ll:min-h-7 ll:items-center ll:gap-2 ll:ps-2">
      <div className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-2">
        <span className="ll:min-w-0 ll:truncate ll:text-xs ll:font-semibold ll:text-foreground">
          {title}
        </span>
        {summary ? (
          <span className="ll:min-w-0 ll:truncate ll:text-[11px] ll:tabular-nums ll:text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
          {actions}
        </div>
      ) : null}
      <AccordionTrigger
        aria-label={triggerLabel}
        className="ll:w-auto ll:border-0 ll:px-2 ll:py-1.5 ll:hover:bg-white/5"
      />
    </div>
    <AccordionContent className="ll:border-0 ll:border-t ll:border-solid ll:border-border ll:[&>div]:px-0 ll:[&>div]:pb-1 ll:[&>div]:pt-1">
      <div className="ll:flex ll:flex-col ll:gap-0.5">{children}</div>
    </AccordionContent>
  </AccordionItem>
);
