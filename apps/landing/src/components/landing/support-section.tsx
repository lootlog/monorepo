import { ArrowUpRight, Coffee, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { CtaBand } from "@/components/landing/cta-band";
import { links } from "@/config/links";

export function SupportSection() {
  const { t } = useTranslation();

  return (
    <CtaBand
      id="support-title"
      tone="amber"
      title={t("landing.support.title")}
      description={t("landing.support.description")}
      emblem={<Coffee className="landing-cta-emblem-icon" />}
      actions={
        <Button
          size="xl"
          className="landing-action landing-action-dark"
          render={
            <a href={links.support} target="_blank" rel="noopener noreferrer">
              <Heart className="size-4" />
              {t("landing.support.action")}
              <ArrowUpRight className="landing-action-arrow size-4" />
            </a>
          }
          nativeButton={false}
        />
      }
    />
  );
}
