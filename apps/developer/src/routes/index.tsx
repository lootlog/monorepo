import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, Globe, Package, Radio } from "lucide-react";
import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import { PortalFooter } from "~/components/portal-footer";
import { RequestSample } from "~/components/request-sample";
import { ResourceCard } from "~/components/resource-card";
import { pageHead } from "~/lib/seo";
import { portalText as t } from "~/lib/translations";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      path: "/",
      title: t.title,
      description: t.description,
    }),
  component: Overview,
});

const steps = [
  {
    title: t.stepKey,
    description: t.stepKeyDescription,
    link: { to: "/keys" },
  },
  {
    title: t.stepRequest,
    description: t.stepRequestDescription,
    link: { to: "/docs/$", params: { _splat: "http" } },
  },
  {
    title: t.stepExplore,
    description: t.stepExploreDescription,
    link: { to: "/reference" },
  },
] as const;

const integrations = [
  {
    icon: <Globe />,
    title: t.httpApi,
    description: t.httpApiDescription,
    link: { to: "/docs/$", params: { _splat: "http" } },
  },
  {
    icon: <Package />,
    title: t.sdk,
    description: t.sdkDescription,
    link: { to: "/docs/$", params: { _splat: "sdk" } },
  },
  {
    icon: <Radio />,
    title: t.realtime,
    description: t.realtimeDescription,
    link: { to: "/docs/$", params: { _splat: "realtime" } },
  },
  {
    icon: <Gamepad2 />,
    title: t.gameClient,
    description: t.gameClientDescription,
    link: { to: "/docs/$", params: { _splat: "game-client" } },
  },
] as const;

const services = [
  { slug: "main", host: "api.lootlog.pl", description: t.mainDescription },
  {
    slug: "activity",
    host: "activity.lootlog.pl",
    description: t.activityDescription,
  },
  {
    slug: "battlelog",
    host: "battlelog.lootlog.pl",
    description: t.battlelogDescription,
  },
  {
    slug: "search",
    host: "search.lootlog.pl",
    description: t.searchDescription,
  },
] as const;

function Overview() {
  return (
    <>
      <main className="portal-page flex flex-col gap-20 md:gap-24">
        <header className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-14">
          <div className="flex max-w-xl flex-col gap-6">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-balance md:text-5xl">
              {t.overviewTitle}
            </h1>
            <p className="text-base leading-relaxed text-pretty text-text-supporting md:text-lg">
              {t.overviewDescription}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/keys" className={buttonVariants({ size: "lg" })}>
                {t.createKey}
              </Link>
              <Link
                to="/docs/$"
                params={{ _splat: "http" }}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {t.readGuide}
              </Link>
            </div>
          </div>
          <RequestSample />
        </header>

        <section aria-labelledby="quick-start" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h2
              id="quick-start"
              className="text-xl font-semibold tracking-tight"
            >
              {t.quickStart}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.quickStartDescription}
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex">
                <ResourceCard
                  icon={
                    <span className="font-mono text-xs font-semibold">
                      {index + 1}
                    </span>
                  }
                  title={step.title}
                  description={step.description}
                  link={step.link}
                />
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="integrations" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h2
              id="integrations"
              className="text-xl font-semibold tracking-tight"
            >
              {t.integrationHeading}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.integrationDescription}
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {integrations.map((integration) => (
              <li key={integration.title} className="flex">
                <ResourceCard {...integration} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="services" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 id="services" className="text-xl font-semibold tracking-tight">
              {t.servicesHeading}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.servicesDescription}
            </p>
          </div>
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {services.map((service) => (
              <li
                key={service.slug}
                className="group/service relative grid gap-1 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-accent/35 md:grid-cols-[12rem_minmax(0,1fr)_auto] md:items-center md:gap-6"
              >
                <Link
                  to="/reference"
                  hash={service.slug}
                  className="text-sm font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                >
                  {t[service.slug]}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {service.description}
                </p>
                <code className="font-mono text-xs text-text-supporting">
                  {service.host}
                </code>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <PortalFooter />
    </>
  );
}
