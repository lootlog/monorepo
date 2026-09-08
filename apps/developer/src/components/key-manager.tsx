import { useEffect, useRef, useState, type FormEvent } from "react";
import { KeyRow } from "~/components/key-row";
import { getPortalEnvironment } from "~/lib/environment";
import {
  createdKeySchema,
  isApiKeyActive,
  keyListSchema,
  keyRequest,
  organizationsSchema,
  type ApiKey,
} from "~/lib/key-client";
import { portalText as t } from "~/lib/translations";

export function KeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [organizations, setOrganizations] = useState<
    { id: string; name: string }[]
  >([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [observedAt, setObservedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copyState, setCopyState] = useState("");
  const secretHeading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const activeKeys = keys.filter((key) =>
    isApiKeyActive(key, observedAt),
  ).length;
  async function refresh() {
    setKeys(keyListSchema.parse(await keyRequest()).keys);
    setObservedAt(Date.now());
  }
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      keyRequest("", { signal: controller.signal }),
      fetch(
        `${getPortalEnvironment(location.hostname).main}/users/@me/guilds/accessible`,
        { credentials: "include", signal: controller.signal },
      ).then((response) => {
        if (!response.ok) throw new Error("Organization request failed");
        return response.json();
      }),
    ])
      .then(([keyResponse, organizationResponse]) => {
        if (controller.signal.aborted) return;
        setKeys(keyListSchema.parse(keyResponse).keys);
        setOrganizations(organizationsSchema.parse(organizationResponse));
        setObservedAt(Date.now());
        setLoadState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState("error");
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (secret) secretHeading.current?.focus();
  }, [secret]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || secret) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const organizationIds = data.getAll("organizationIds");
    const personalData = data.has("personalData");
    if (!organizationIds.length && !personalData) {
      setError(t.selectScope);
      return;
    }
    setPending(true);
    setError(null);
    setCopyState("");
    try {
      const days = data.get("expiresIn");
      const result = createdKeySchema.parse(
        await keyRequest("", {
          method: "POST",
          body: JSON.stringify({
            name: data.get("name"),
            organizationIds,
            personalData,
            mode: data.get("mode"),
            expiresIn: days === "never" ? null : Number(days) * 86400,
          }),
        }),
      );
      setSecret(result.key);
      form.reset();
      await refresh();
    } catch {
      setError(t.error);
    } finally {
      setPending(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret ?? "");
      setCopyState(t.copied);
    } catch {
      setCopyState(t.copyFailed);
    }
  }
  return (
    <>
      <p>{t.keyIntro}</p>
      {secret && (
        <section className="portal-secret" aria-labelledby="new-key-secret">
          <h2 id="new-key-secret" ref={secretHeading} tabIndex={-1}>
            {t.secret}
          </h2>
          <code>{secret}</code>
          <div className="portal-actions">
            <button onClick={() => void copy()}>{t.copy}</button>
            <button
              onClick={() => {
                setSecret(null);
                nameInput.current?.focus();
              }}
            >
              {t.dismiss}
            </button>
          </div>
          <p role="status">{copyState}</p>
        </section>
      )}
      {loadState === "loading" && <p role="status">{t.loading}</p>}
      {loadState === "error" && (
        <>
          <p role="alert">{t.error}</p>
          <button
            onClick={() => {
              setLoadState("loading");
              setAttempt((value) => value + 1);
            }}
          >
            {t.retry}
          </button>
        </>
      )}
      {loadState === "ready" && (
        <>
          <form
            className="portal-form"
            onSubmit={(event) => void create(event)}
            aria-busy={pending}
          >
            <label>
              {t.name}
              <input
                ref={nameInput}
                name="name"
                required
                maxLength={80}
                autoComplete="off"
              />
            </label>
            <label>
              {t.mode}
              <select name="mode">
                <option value="read">{t.read}</option>
                <option value="read-write">{t.readWrite}</option>
              </select>
            </label>
            <fieldset>
              <legend>{t.organizations}</legend>
              {organizations.map((org) => (
                <label key={org.id}>
                  <input
                    type="checkbox"
                    name="organizationIds"
                    value={org.id}
                  />
                  {org.name}
                </label>
              ))}
              {!organizations.length && <p>{t.noOrganizations}</p>}
            </fieldset>
            <label>
              <input type="checkbox" name="personalData" />
              {t.personal}
            </label>
            <p>{t.selectScope}</p>
            <label>
              {t.expiration}
              <select name="expiresIn" defaultValue="90">
                <option value="30">{t.days30}</option>
                <option value="90">{t.days90}</option>
                <option value="365">{t.days365}</option>
                <option value="never">{t.never}</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={pending || secret !== null || activeKeys >= 10}
            >
              {t.create}
            </button>
            {activeKeys >= 10 && <p>{t.keyLimit}</p>}
          </form>
          {!keys.length && <p>{t.empty}</p>}
          {keys.map((key) => (
            <KeyRow
              key={key.id}
              apiKey={key}
              organizations={organizations}
              observedAt={observedAt}
              onChange={refresh}
            />
          ))}
        </>
      )}
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
    </>
  );
}
