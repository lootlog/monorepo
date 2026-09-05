import {
  ArrowUpRight,
  Code2,
  Coins,
  Fingerprint,
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
      className="bg-[var(--broadcast-ink-soft)] py-16 text-[var(--broadcast-white)] sm:py-20 lg:py-28"
    >
      <div className="landing-container grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-12 lg:gap-20">
        <div>
          <h2
            id="trust-record-title"
            className="landing-heading-section text-balance"
          >
            {t("landing.trust.title")}
          </h2>
          <p className="mt-6 text-base leading-7 text-[var(--broadcast-text-muted)]">
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
              <h3 className="text-xl font-bold">
                {t(`landing.trust.items.${key}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--broadcast-text-muted)]">
                {t(`landing.trust.items.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
