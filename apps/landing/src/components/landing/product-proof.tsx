import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChartColumn, Gem, LayoutDashboard } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { SectionHead } from "@/src/components/landing/section-head";
import { links } from "@/src/config/links";

const AUTOPLAY_MS = 7000;

const evidenceItems = [
  {
    key: "dashboard",
    icon: Gem,
    tone: "amber",
    image: "/screenshots/guild-lootlog-current.jpg",
  },
  {
    key: "statistics",
    icon: ChartColumn,
    tone: "cyan",
    image: "/screenshots/guild-kill-stats-current.png",
  },
  {
    key: "personal",
    icon: LayoutDashboard,
    tone: "lime",
    image: "/screenshots/dashboard-current.png",
  },
] as const;

const lastIndex = evidenceItems.length - 1;

const keyboardTarget = (key: string, index: number) => {
  switch (key) {
    case "ArrowDown":
      return index === lastIndex ? 0 : index + 1;
    case "ArrowUp":
      return index === 0 ? lastIndex : index - 1;
    case "Home":
      return 0;
    case "End":
      return lastIndex;
    default:
      return undefined;
  }
};

const screenVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -48 }),
};

export function ProductProof() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [selection, setSelection] = useState({ index: 0, direction: 1 });
  const [autoplayStopped, setAutoplayStopped] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = tabsRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.4 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const autoplay = !reducedMotion && !autoplayStopped;
  const active = evidenceItems[selection.index] ?? evidenceItems[0];

  const select = (index: number) => {
    setAutoplayStopped(true);
    setSelection((current) => ({
      index,
      direction: index >= current.index ? 1 : -1,
    }));
  };

  const advance = () => {
    setSelection((current) => ({
      index: (current.index + 1) % evidenceItems.length,
      direction: 1,
    }));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = keyboardTarget(event.key, selection.index);

    if (next === undefined) return;

    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      id="product"
      aria-labelledby="product-proof-title"
      className="landing-section bg-[var(--broadcast-ink)] text-[var(--broadcast-white)]"
    >
      <div className="landing-container">
        <SectionHead
          id="product-proof-title"
          title={t("landing.proof.title")}
          description={t("landing.proof.description")}
        >
          <a
            href={links.organizationGuide}
            className="landing-footer-link mt-3"
          >
            {t("landing.proof.guide")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </SectionHead>

        <div
          ref={tabsRef}
          className={`landing-proof-card landing-tone-${active.tone}`}
          data-autoplay={autoplay && inView ? "" : undefined}
        >
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label={t("landing.proof.tabsLabel")}
            className="landing-proof-tabs"
            onKeyDown={handleKeyDown}
          >
            {evidenceItems.map(({ key, icon: Icon }, index) => {
              const selected = index === selection.index;

              return (
                <div
                  key={key}
                  className="landing-proof-tab"
                  data-selected={selected ? "" : undefined}
                >
                  <button
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`product-tab-${key}`}
                    aria-selected={selected}
                    aria-controls="product-tab-panel"
                    aria-describedby={`product-tab-${key}-description`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => select(index)}
                    className="landing-proof-tab-trigger"
                  >
                    <span className="landing-badge">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="landing-number" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="landing-proof-tab-title">
                      {t(`landing.proof.${key}.title`)}
                    </span>
                  </button>
                  <div className="landing-proof-tab-body" inert={!selected}>
                    <p
                      id={`product-tab-${key}-description`}
                      className="landing-proof-tab-description"
                    >
                      {t(`landing.proof.${key}.description`)}
                    </p>
                  </div>
                  {selected && autoplay ? (
                    <span
                      aria-hidden="true"
                      className="landing-proof-progress"
                      style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                      onAnimationEnd={advance}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id="product-tab-panel"
            aria-labelledby={`product-tab-${active.key}`}
            className="landing-proof-visual"
          >
            <span aria-hidden="true" className="landing-shape landing-ring" />
            <span aria-hidden="true" className="landing-shape landing-dot" />
            <AnimatePresence
              initial={false}
              mode="popLayout"
              custom={selection.direction}
            >
              <motion.div
                key={active.key}
                className="landing-screen"
                custom={selection.direction}
                variants={reducedMotion ? undefined : screenVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <img
                  src={active.image}
                  width={1600}
                  height={900}
                  alt={t(`landing.proof.${active.key}.imageAlt`)}
                  decoding="async"
                  className="landing-screen-image"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
