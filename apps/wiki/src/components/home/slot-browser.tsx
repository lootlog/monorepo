import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { Button } from "@lootlog/ui/components/button";
import { t } from "@/i18n/messages";
import { SlotSearch } from "./slot-search";

export function SlotBrowser() {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="grid items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16"
    >
      <SlotSearch />
      <div className="flex max-w-xl flex-col gap-4">
        <h2
          id={headingId}
          className="text-2xl font-semibold tracking-[-0.02em] text-balance text-foreground md:text-4xl"
        >
          {t("home.slotsTitle")}
        </h2>
        <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
          {t("home.slotsDescription")}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button nativeButton={false} render={<Link to="/set" />}>
            {t("home.buildSet")}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/compare" />}
          >
            {t("home.compareItems")}
          </Button>
        </div>
      </div>
    </section>
  );
}
