import { Link, createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n/messages";

const sections = [
  {
    descriptionKey: "home.itemsDescription",
    href: "/items",
    titleKey: "home.itemsTitle",
  },
  {
    descriptionKey: "home.npcsDescription",
    href: "/npcs",
    titleKey: "home.npcsTitle",
  },
  {
    descriptionKey: "home.playersDescription",
    href: "/players",
    titleKey: "home.playersTitle",
  },
] as const;

export const Route = createFileRoute("/")({
  component: HomeRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.homeTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
});

function HomeRoute() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="hero-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(215,167,57,0.28),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(51,102,74,0.16),transparent_66%)]" />
        <p className="island-kicker mb-3">{t("home.eyebrow")}</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          {t("home.title")}
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          {t("home.description")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/items"
            search={{ filter: "", query: "", world: "" }}
            className="rounded-full border border-[rgba(126,94,40,0.3)] bg-[rgba(215,167,57,0.12)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(215,167,57,0.2)]"
          >
            {t("home.ctaItems")}
          </Link>
          <Link
            to="/npcs"
            search={{ query: "", world: "" }}
            className="rounded-full border border-[rgba(41,69,53,0.22)] bg-white/55 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(41,69,53,0.35)]"
          >
            {t("home.ctaNpcs")}
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section, index) => (
          <article
            key={section.href}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {t(section.titleKey)}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
              {t(section.descriptionKey)}
            </p>
          </article>
        ))}
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="island-kicker mb-2">{t("home.statusEyebrow")}</p>
        <h2 className="display-title mb-3 text-3xl text-[var(--sea-ink)] sm:text-4xl">
          {t("home.statusTitle")}
        </h2>
        <p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          {t("home.statusDescription")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/players"
            search={{ query: "", world: "" }}
            className="rounded-full border border-[rgba(41,69,53,0.22)] bg-[var(--chip-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5"
          >
            {t("home.ctaPlayers")}
          </Link>
        </div>
      </section>
    </main>
  );
}
