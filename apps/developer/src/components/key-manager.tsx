import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@lootlog/ui/components/card";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
} from "@lootlog/ui/components/field";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectGroup,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@lootlog/ui/components/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@lootlog/ui/components/sheet";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { KeyList } from "~/components/key-list";
import { getPortalEnvironment } from "~/lib/environment";
import {
  createdKeySchema,
  getKeyErrorMessage,
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
  const [scopeInvalid, setScopeInvalid] = useState(false);
  const scopeErrorId = scopeInvalid ? "key-scope-error" : undefined;

  const [refreshState, setRefreshState] = useState<
    "ready" | "loading" | "error"
  >("ready");

  const [createOpen, setCreateOpen] = useState(false);
  const createTrigger = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [copyState, setCopyState] = useState("");
  const secretHeading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const scopeFields = useRef<HTMLFieldSetElement>(null);

  const activeKeys = keys.filter((key) =>
    isApiKeyActive(key, observedAt),
  ).length;

  async function refresh() {
    setRefreshState("loading");

    try {
      setKeys(keyListSchema.parse(await keyRequest()).keys);
      setObservedAt(Date.now());
      setRefreshState("ready");
    } catch {
      setRefreshState("error");
    }
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
      setScopeInvalid(true);
      requestAnimationFrame(() => {
        scopeFields.current
          ?.querySelector<HTMLElement>('[role="checkbox"]')
          ?.focus();
      });

      return;
    }

    setScopeInvalid(false);
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
      setCreateOpen(false);
      form.reset();
      setFormVersion((value) => value + 1);
      await refresh();
    } catch (error) {
      setError(getKeyErrorMessage(error));
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
    <div className="flex flex-col gap-10">
      {secret && (
        <Card aria-labelledby="new-key-secret">
          <CardHeader>
            <CardTitle>
              <h2
                id="new-key-secret"
                ref={secretHeading}
                tabIndex={-1}
                className="focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t.secretTitle}
              </h2>
            </CardTitle>
            <CardDescription>{t.secret}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <code className="block break-all rounded-lg border bg-background p-4 text-sm text-primary">
              {secret}
            </code>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void copy()}>{t.copy}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSecret(null);
                  requestAnimationFrame(() => createTrigger.current?.focus());
                }}
              >
                {t.dismiss}
              </Button>
            </div>
            <p role="status" className="text-sm text-muted-foreground">
              {copyState}
            </p>
          </CardContent>
        </Card>
      )}
      {loadState === "loading" && (
        <div role="status" className="flex flex-col gap-4">
          <span className="sr-only">{t.loading}</span>
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}
      {loadState === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{t.error}</AlertDescription>
          <Button
            variant="outline"
            className="mt-3 w-fit"
            onClick={() => {
              setLoadState("loading");
              setAttempt((value) => value + 1);
            }}
          >
            {t.retry}
          </Button>
        </Alert>
      )}
      {loadState === "ready" && (
        <div className="flex min-w-0 flex-col gap-8">
          <Sheet
            open={createOpen}
            onOpenChange={(open) => {
              if (!pending) setCreateOpen(open);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t.keyIntro}
              </p>
              <SheetTrigger
                ref={createTrigger}
                className={buttonVariants()}
                disabled={
                  secret !== null ||
                  activeKeys >= 10 ||
                  refreshState !== "ready"
                }
              >
                {t.create}
              </SheetTrigger>
            </div>
            {activeKeys >= 10 && (
              <Alert>
                <AlertDescription>{t.keyLimit}</AlertDescription>
              </Alert>
            )}
            <SheetContent
              className="w-full overflow-y-auto p-6 sm:max-w-lg"
              closeLabel={t.cancel}
              initialFocus={nameInput}
              finalFocus={() => secretHeading.current ?? createTrigger.current}
            >
              <SheetHeader className="pr-6">
                <SheetTitle id="key-create-title">{t.create}</SheetTitle>
                <SheetDescription>{t.selectScope}</SheetDescription>
              </SheetHeader>
              <form
                key={formVersion}
                onSubmit={(event) => void create(event)}
                aria-busy={pending}
              >
                <FieldGroup className="gap-6">
                  <Field>
                    <FieldLabel htmlFor="key-name">{t.name}</FieldLabel>
                    <Input
                      id="key-name"
                      ref={nameInput}
                      name="name"
                      required
                      maxLength={80}
                      autoComplete="off"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="key-mode">{t.mode}</FieldLabel>
                    <Select
                      name="mode"
                      defaultValue="read"
                      items={[
                        { value: "read", label: t.read },
                        { value: "read-write", label: t.readWrite },
                      ]}
                    >
                      <SelectTrigger id="key-mode" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="read">{t.read}</SelectItem>
                          <SelectItem value="read-write">
                            {t.readWrite}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <FieldSet
                    ref={scopeFields}
                    aria-invalid={scopeInvalid}
                    aria-describedby={scopeErrorId}
                  >
                    <FieldLegend>{t.organizations}</FieldLegend>
                    <FieldDescription>{t.selectScope}</FieldDescription>
                    <div className="max-h-64 flex flex-col gap-3 overflow-y-auto p-1">
                      {organizations.map((org) => (
                        <Field key={org.id} orientation="horizontal">
                          <Checkbox
                            id={`organization-${org.id}`}
                            name="organizationIds"
                            value={org.id}
                            aria-invalid={scopeInvalid}
                            aria-describedby={scopeErrorId}
                            onCheckedChange={() => setScopeInvalid(false)}
                          />
                          <FieldLabel
                            htmlFor={`organization-${org.id}`}
                            className="break-words"
                          >
                            {org.name}
                          </FieldLabel>
                        </Field>
                      ))}
                      {!organizations.length && (
                        <p className="text-sm text-muted-foreground">
                          {t.noOrganizations}
                        </p>
                      )}
                    </div>
                    <Field orientation="horizontal">
                      <Checkbox
                        id="personal-data"
                        name="personalData"
                        aria-invalid={scopeInvalid}
                        aria-describedby={scopeErrorId}
                        onCheckedChange={() => setScopeInvalid(false)}
                      />
                      <FieldLabel htmlFor="personal-data">
                        {t.personal}
                      </FieldLabel>
                    </Field>
                    {scopeInvalid && (
                      <FieldError id="key-scope-error">
                        {t.selectScope}
                      </FieldError>
                    )}
                  </FieldSet>
                  <Field>
                    <FieldLabel htmlFor="key-expiration">
                      {t.expiration}
                    </FieldLabel>
                    <Select
                      name="expiresIn"
                      defaultValue="90"
                      items={[
                        { value: "30", label: t.days30 },
                        { value: "90", label: t.days90 },
                        { value: "365", label: t.days365 },
                        { value: "never", label: t.never },
                      ]}
                    >
                      <SelectTrigger id="key-expiration" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="30">{t.days30}</SelectItem>
                          <SelectItem value="90">{t.days90}</SelectItem>
                          <SelectItem value="365">{t.days365}</SelectItem>
                          <SelectItem value="never">{t.never}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button
                    type="submit"
                    className="w-full"
                    loading={pending}
                    disabled={
                      pending ||
                      secret !== null ||
                      activeKeys >= 10 ||
                      refreshState !== "ready"
                    }
                  >
                    {t.create}
                  </Button>
                  {activeKeys >= 10 && (
                    <Alert>
                      <AlertDescription>{t.keyLimit}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </FieldGroup>
              </form>
            </SheetContent>
          </Sheet>
          <KeyList
            keys={keys}
            organizations={organizations}
            observedAt={observedAt}
            refreshState={refreshState}
            onRefresh={refresh}
          />
        </div>
      )}
    </div>
  );
}
