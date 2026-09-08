import { useState } from "react";
import { isApiKeyActive, keyRequest, type ApiKey } from "~/lib/key-client";
import { portalText as t } from "~/lib/translations";
const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeZone: "Europe/Warsaw",
});
export function KeyRow({
  apiKey,
  onChange,
  organizations,
  observedAt,
}: {
  apiKey: ApiKey;
  organizations: { id: string; name: string }[];
  observedAt: number;
  onChange: () => Promise<void>;
}) {
  const [name, setName] = useState(apiKey.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function mutate(method: "PATCH" | "DELETE") {
    setPending(true);
    setError(false);
    try {
      const request: RequestInit = { method };
      if (method === "PATCH") request.body = JSON.stringify({ name });
      await keyRequest(`/${encodeURIComponent(apiKey.id)}`, request);
      await onChange();
      setConfirm(false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  const expired = !isApiKeyActive(apiKey, observedAt);
  return (
    <article className="portal-key">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void mutate("PATCH");
        }}
      >
        <label>
          {t.name}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
          />
        </label>
        <dl>
          <div>
            <dt>{t.status}</dt>
            <dd>{expired ? t.expired : t.active}</dd>
          </div>
          <div>
            <dt>{t.created}</dt>
            <dd>{dateFormatter.format(new Date(apiKey.createdAt))}</dd>
          </div>
          <div>
            <dt>{t.personal}</dt>
            <dd>{apiKey.personalData ? t.yes : t.no}</dd>
          </div>
          <div>
            <dt>{t.mode}</dt>
            <dd>{apiKey.mode === "read" ? t.read : t.readWrite}</dd>
          </div>
          <div>
            <dt>{t.expires}</dt>
            <dd>
              {apiKey.expiresAt
                ? dateFormatter.format(new Date(apiKey.expiresAt))
                : t.never}
            </dd>
          </div>
          <div>
            <dt>{t.organizations}</dt>
            <dd>
              {apiKey.organizationIds
                .map(
                  (id) =>
                    organizations.find((org) => org.id === id)?.name ?? id,
                )
                .join(", ") || "—"}
            </dd>
          </div>
        </dl>
        <div className="portal-actions">
          <button disabled={pending || name === apiKey.name} type="submit">
            {t.save}
          </button>
          <button
            disabled={pending}
            type="button"
            aria-expanded={confirm}
            aria-label={`${t.remove}: ${apiKey.name}`}
            onClick={() => setConfirm(true)}
          >
            {t.remove}
          </button>
        </div>
      </form>
      {confirm && (
        <div>
          <p role="alert">{t.confirmRemove}</p>
          <div className="portal-actions">
            <button disabled={pending} onClick={() => void mutate("DELETE")}>
              {t.remove}
            </button>
            <button disabled={pending} onClick={() => setConfirm(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert">{t.error}</p>}
    </article>
  );
}
