import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { t } from "@/i18n/messages";
import { fetchPlayersSearch } from "@/lib/search-api";
import type { PlayerHit } from "@/types/search";

type PlayersRouteSearch = {
  query: string;
  world: string;
};

function validateSearch(search: Record<string, unknown>): PlayersRouteSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
    world: typeof search.world === "string" ? search.world : "",
  };
}

export const Route = createFileRoute("/players")({
  component: PlayersRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.playersTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
  validateSearch,
});

function PlayersRoute() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [queryValue, setQueryValue] = useState(search.query);
  const [worldValue, setWorldValue] = useState(search.world);
  const [data, setData] = useState<PlayerHit[]>([]);
  const [status, setStatus] = useState<"error" | "idle" | "loading" | "ready">(
    "idle",
  );

  useEffect(() => {
    setQueryValue(search.query);
    setWorldValue(search.world);
  }, [search.query, search.world]);

  useEffect(() => {
    const hasActiveSearch =
      search.query.trim() !== "" || search.world.trim() !== "";

    if (!hasActiveSearch) {
      setData([]);
      setStatus("idle");
      return;
    }

    let ignore = false;
    setStatus("loading");

    void fetchPlayersSearch({
      query: search.query.trim() || undefined,
      world: search.world.trim() || undefined,
    })
      .then((response) => {
        if (ignore) {
          return;
        }

        setData(response);
        setStatus("ready");
      })
      .catch(() => {
        if (ignore) {
          return;
        }

        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [search.query, search.world]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({
        search: {
          query: queryValue.trim(),
          world: worldValue.trim(),
        },
      });
    });
  }

  function handleReset() {
    setQueryValue("");
    setWorldValue("");

    startTransition(() => {
      void navigate({
        search: {
          query: "",
          world: "",
        },
      });
    });
  }

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rounded-[2rem] px-6 py-8 sm:px-10">
        <p className="island-kicker mb-2">{t("players.eyebrow")}</p>
        <h1 className="display-title mb-3 text-4xl text-[var(--sea-ink)] sm:text-5xl">
          {t("players.title")}
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          {t("players.description")}
        </p>

        <form
          className="mt-8 grid gap-4 md:grid-cols-[1.6fr_1fr_auto_auto]"
          onSubmit={handleSubmit}
        >
          <label className="search-field">
            <span>{t("search.queryLabel")}</span>
            <input
              value={queryValue}
              onChange={(event) => setQueryValue(event.target.value)}
              placeholder={t("search.queryPlaceholder")}
            />
          </label>
          <label className="search-field">
            <span>{t("search.worldLabel")}</span>
            <input
              value={worldValue}
              onChange={(event) => setWorldValue(event.target.value)}
              placeholder={t("search.worldPlaceholder")}
            />
          </label>
          <button className="search-button" type="submit">
            {t("search.submit")}
          </button>
          <button
            className="search-button is-secondary"
            type="button"
            onClick={handleReset}
          >
            {t("search.reset")}
          </button>
        </form>
      </section>

      <section className="mt-8">
        {status === "idle" ? (
          <div className="state-card">{t("search.idle")}</div>
        ) : null}
        {status === "loading" ? (
          <div className="state-card">{t("search.loading")}</div>
        ) : null}
        {status === "error" ? (
          <div className="state-card is-error">{t("search.error")}</div>
        ) : null}
        {status === "ready" && data.length === 0 ? (
          <div className="state-card">{t("search.noResults")}</div>
        ) : null}
        {status === "ready" && data.length > 0 ? (
          <>
            <p className="mb-4 text-sm font-semibold text-[var(--sea-ink-soft)]">
              {t("search.results", { count: data.length })}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.map((player) => (
                <article
                  key={`${player.id}_${player.world}`}
                  className="result-card"
                >
                  <div className="flex items-start gap-4">
                    {player.icon ? (
                      <img
                        alt={t("search.iconAlt", { name: player.name })}
                        className="h-14 w-14 rounded-xl border border-[var(--line)] bg-black/5 object-contain p-2"
                        src={player.icon}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-[var(--sea-ink)]">
                        {player.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[var(--sea-ink-soft)]">
                        <span className="result-badge">
                          {t("players.professionLabel")}:{" "}
                          {player.prof || t("search.missingValue")}
                        </span>
                        <span className="result-badge">{player.world}</span>
                        <span className="result-badge">
                          {t("players.characterIdLabel")}: {player.characterId}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
