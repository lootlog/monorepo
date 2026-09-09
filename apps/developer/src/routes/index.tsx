import { createFileRoute, Link } from "@tanstack/react-router";
import { portalText as t } from "~/lib/translations";

export const Route = createFileRoute("/")({ component: Overview });

const steps = [
  {
    title: t.stepKey,
    description: t.stepKeyDescription,
    to: "/keys",
    params: {},
  },
  {
    title: t.stepRequest,
    description: t.stepRequestDescription,
    to: "/docs/$",
    params: { _splat: "http" },
  },
  {
    title: t.stepExplore,
    description: t.stepExploreDescription,
    to: "/reference",
    params: {},
  },
] as const;

function Overview() {
  return (
    <main className="portal-overview">
      <header className="overview-hero">
        <p className="portal-eyebrow">{t.developerTools}</p>
        <h1>{t.overviewTitle}</h1>
        <p className="overview-description">{t.overviewDescription}</p>
        <div className="overview-actions">
          <Link
            to="/docs/$"
            params={{ _splat: "http" }}
            className="portal-primary-link"
          >
            {t.startBuilding}
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/reference" className="portal-secondary-link">
            {t.exploreApi}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
      <section className="overview-section" aria-labelledby="quick-start">
        <div className="overview-section-heading">
          <h2 id="quick-start">{t.quickStart}</h2>
          <p>{t.quickStartDescription}</p>
        </div>
        <ol className="overview-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="overview-step-number" aria-hidden="true">
                0{index + 1}
              </span>
              <div>
                <h3>
                  <Link to={step.to} params={step.params}>
                    {step.title}
                    <span aria-hidden="true"> →</span>
                  </Link>
                </h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="overview-section" aria-labelledby="integrations">
        <h2 id="integrations">{t.integrationHeading}</h2>
        <div className="overview-integrations">
          <div>
            <p className="portal-eyebrow">{t.serverIntegration}</p>
            <p>{t.serverDescription}</p>
            <div className="overview-resource-links">
              <Link to="/docs/$" params={{ _splat: "http" }}>
                {t.httpApi} ↗
              </Link>
              <Link to="/docs/$" params={{ _splat: "sdk" }}>
                {t.sdk} ↗
              </Link>
              <Link to="/docs/$" params={{ _splat: "realtime" }}>
                {t.realtime} ↗
              </Link>
            </div>
          </div>
          <div>
            <p className="portal-eyebrow">{t.addonIntegration}</p>
            <p>{t.addonDescription}</p>
            <div className="overview-resource-links">
              <Link to="/docs/$" params={{ _splat: "game-client" }}>
                {t.gameClient} ↗
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
