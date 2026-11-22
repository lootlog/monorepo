import { Link } from "@tanstack/react-router";
import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";
import { useState } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@lootlog/ui/components/navigation-menu";
import { cn } from "cn";
import { EquipmentSlotIcon } from "@/components/equipment/equipment-slot-icon";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";
import {
  EMPTY_ITEMS_SEARCH,
  WIKI_NAVIGATION,
} from "@/navigation/wiki-navigation";
import { WikiNavigationMenuLink } from "./wiki-navigation-menu-link";

type WikiSection = (typeof WIKI_NAVIGATION)[number];

const browseSections = WIKI_NAVIGATION.filter(
  ({ group }) => group === "browse",
);

const toolSections = WIKI_NAVIGATION.filter(({ group }) => group === "tools");

const INLINE_MIN_WIDTH = 1024;

type WikiNavigationMenuProps = {
  activeSection: WikiSection | undefined;
};

export function WikiNavigationMenu({ activeSection }: WikiNavigationMenuProps) {
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const collapsed = useMaxWidth(INLINE_MIN_WIDTH);

  if (collapsed && openPanel !== null) setOpenPanel(null);

  const renderSection = (section: WikiSection) => (
    <li key={section.link.to}>
      <WikiNavigationMenuLink
        link={section.link}
        icon={section.icon}
        label={t(section.labelKey)}
        description={
          section.descriptionKey ? t(section.descriptionKey) : undefined
        }
        active={section === activeSection}
      />
    </li>
  );

  const triggerClassName = (sections: readonly WikiSection[]) =>
    cn(
      activeSection && sections.includes(activeSection)
        ? "bg-muted/50 text-foreground"
        : "text-muted-foreground hover:text-foreground data-popup-open:text-foreground",
    );

  return (
    <NavigationMenu
      aria-label={t("navigation.ariaLabel")}
      value={openPanel}
      onValueChange={setOpenPanel}
    >
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem value="browse">
          <NavigationMenuTrigger className={triggerClassName(browseSections)}>
            {t("navigation.browse")}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[46rem] grid-cols-[1fr_23rem] gap-1">
              <ul className="flex flex-col gap-1">
                {browseSections.map(renderSection)}
              </ul>
              <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("navigation.itemsBySlot")}
                </p>
                <ul className="grid grid-cols-2 gap-0.5">
                  {EQUIPMENT_SLOTS.map((slot) => (
                    <li key={slot.id}>
                      <NavigationMenuLink
                        closeOnClick
                        render={
                          <Link
                            to="/items"
                            search={{ ...EMPTY_ITEMS_SEARCH, slot: slot.id }}
                          />
                        }
                        className="px-2 py-1.5 font-medium whitespace-nowrap"
                      >
                        <EquipmentSlotIcon
                          slot={slot.id}
                          className="text-muted-foreground"
                        />
                        {t(`slots.${slot.id}`)}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="tools">
          <NavigationMenuTrigger className={triggerClassName(toolSections)}>
            {t("navigation.tools")}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[40rem] grid-cols-2 gap-1">
              {toolSections.map(renderSection)}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
