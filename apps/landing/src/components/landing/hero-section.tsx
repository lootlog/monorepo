import { ArrowUpRight, Download } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { DiscordCommunityLink } from "@/components/landing/discord-community-link";
import { TimerIllustration } from "@/components/landing/timer-illustration";
import { ADDON_URL } from "@/config/addon";
import { links } from "@/config/links";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="landing-hero relative isolate overflow-hidden bg-[var(--broadcast-ink)]"
    >
      <div aria-hidden="true" className="landing-hero-deco">
        <span className="landing-shape" />
        <span className="landing-shape" />
        <span className="landing-shape" />
        <span className="landing-shape" />
        <span className="landing-shape" />
      </div>

      <div className="broadcast-hero-layout landing-container relative z-10">
        <div className="broadcast-hero-copy min-w-0">
          <DiscordCommunityLink />
          <h1
            id="landing-hero-title"
            className="landing-heading-display text-balance text-[var(--broadcast-white)]"
          >
            <Trans
              i18nKey="landing.hero.title"
              components={{ mark: <mark className="landing-hero-mark" /> }}
            />
          </h1>

          <p className="landing-hero-lead landing-lead text-[var(--broadcast-text-muted)]">
            {t("landing.hero.description")}
          </p>

          <div className="landing-hero-actions">
            <Button
              size="xl"
              className="landing-action landing-action-solid"
              render={
                <a href={links.dashboard}>
                  {t("landing.hero.openDashboard")}
                  <ArrowUpRight className="landing-action-arrow size-4" />
                </a>
              }
              nativeButton={false}
            />
            <Button
              size="xl"
              className="landing-action landing-action-light"
              render={
                <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  {t("landing.hero.installAddon")}
                </a>
              }
              nativeButton={false}
            />
          </div>
        </div>

        <div className="broadcast-hero-product relative min-w-0">
          <TimerIllustration />
        </div>
      </div>
    </section>
  );
}
