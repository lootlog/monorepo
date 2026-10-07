import {
  ArrowUpRight,
  Code2,
  Coins,
  Fingerprint,
  Heart,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { links } from "@/src/config/links";

const facts = [
  { key: "free", icon: Coins },
  { key: "openSource", icon: Code2 },
  { key: "discordAccount", icon: Fingerprint },
  { key: "multiWorld", icon: UsersRound },
] as const;

export function TrustRecord() {
  const { t } = useTranslation();

  return (
    <section
      id="trust"
      aria-labelledby="trust-record-title"
      className="landing-section bg-[var(--broadcast-ink-soft)] text-[var(--broadcast-white)]"
    >
      <div className="landing-container grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-12 lg:gap-20">
        <div>
          <h2
            id="trust-record-title"
            className="landing-heading-section text-balance"
          >
            {t("landing.trust.title")}
          </h2>
          <p className="landing-lead mt-6 text-[var(--broadcast-text-muted)]">
            {t("landing.trust.description")}
          </p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-action landing-action-solid"
            >
              <Code2 className="size-4" aria-hidden="true" />
              {t("landing.trust.github")}
            </a>
            <a href={links.docs} className="landing-footer-link">
              {t("landing.trust.docs")}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
        <ul className="grid gap-x-8 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          {facts.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="border-t border-[var(--broadcast-line)] py-6"
            >
              <Icon
                className="mb-5 size-6 text-[var(--broadcast-cyan)]"
                aria-hidden="true"
              />
              <h3 className="text-balance text-xl font-bold tracking-[-0.01em]">
                {t(`landing.trust.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-pretty text-sm leading-6 text-[var(--broadcast-text-muted)]">
                {t(`landing.trust.items.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-6 rounded-[var(--broadcast-radius-card)] border-2 border-[var(--broadcast-coral)] p-6 sm:p-8 md:col-span-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <Heart
              className="mt-1 size-6 shrink-0 text-[var(--broadcast-coral)]"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-balance text-xl font-bold tracking-[-0.01em]">
                {t("landing.trust.support.title")}
              </h3>
              <p className="mt-2 max-w-[68ch] text-pretty text-sm leading-6 text-[var(--broadcast-text-muted)]">
                {t("landing.trust.support.description")}
              </p>
            </div>
          </div>
          <a
            href={links.support}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-action landing-action-coral self-start lg:self-auto"
          >
            <Heart className="size-4" aria-hidden="true" />
            {t("landing.trust.support.action")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
