import { ArrowUpRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { LootlogMark } from "@lootlog/ui/components/lootlog-mark";
import { CtaBand } from "@/components/landing/cta-band";
import { ADDON_URL } from "@/config/addon";
import { links } from "@/config/links";

export function ClosingCta() {
  const { t } = useTranslation();

  return (
    <CtaBand
      id="closing-cta-title"
      tone="coral"
      title={t("landing.closingCta.title")}
      description={t("landing.closingCta.description")}
      emblem={<LootlogMark />}
      actions={
        <>
          <Button
            size="xl"
            className="landing-action landing-action-dark"
            render={
              <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
                <Download className="size-4" />
                {t("landing.closingCta.install")}
              </a>
            }
            nativeButton={false}
          />
          <Button
            size="xl"
            variant="outline"
            className="landing-action landing-action-outline"
            render={
              <a href={links.installationGuide}>
                {t("landing.closingCta.guide")}
                <ArrowUpRight className="landing-action-arrow size-4" />
              </a>
            }
            nativeButton={false}
          />
        </>
      }
    />
  );
}
