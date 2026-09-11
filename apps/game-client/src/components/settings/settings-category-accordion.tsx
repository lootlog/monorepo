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
  children: ReactNode;
  className?: string;
};

/**
 * Stack of collapsible categories inside one section (notification rules,
 * detector types, sound categories). Several items may be open at once.
 */
export const SettingsCategoryAccordion: FC<SettingsCategoryAccordionProps> = ({
  defaultOpen = [],
  children,
  className,
}) => (
  <Accordion
    type="multiple"
    defaultValue={defaultOpen}
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
  /** Controls that stay usable without expanding (e.g. a volume slider). */
  headerControls?: ReactNode;
  /** Accessible name of the expand trigger when the title is not plain text. */
  triggerLabel: string;
  children: ReactNode;
};

export const SettingsCategoryAccordionItem: FC<
  SettingsCategoryAccordionItemProps
> = ({ id, title, summary, headerControls, triggerLabel, children }) => (
  <AccordionItem value={id} className="ll:rounded-sm ll:bg-black/25">
    <div className="ll:flex ll:min-h-7 ll:items-center ll:gap-2 ll:pl-2">
      <div className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-2">
        <span className="ll:min-w-0 ll:truncate ll:text-xs ll:font-semibold ll:text-gray-100">
          {title}
        </span>
        {summary ? (
          <span className="ll:min-w-0 ll:truncate ll:text-[11px] ll:text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </div>
      {headerControls ? (
        <div
          className="ll:flex ll:shrink-0 ll:items-center"
          onClick={(event) => event.stopPropagation()}
        >
          {headerControls}
        </div>
      ) : null}
      <AccordionTrigger
        aria-label={triggerLabel}
        className="ll:w-auto ll:border-0 ll:px-2 ll:py-1.5 ll:hover:bg-white/5"
      />
    </div>
    <AccordionContent className="ll:border-0 ll:border-t ll:border-solid ll:border-gray-400/20 ll:[&>div]:px-0 ll:[&>div]:pb-1 ll:[&>div]:pt-1">
      <div className="ll:flex ll:flex-col ll:gap-0.5">{children}</div>
    </AccordionContent>
  </AccordionItem>
);
