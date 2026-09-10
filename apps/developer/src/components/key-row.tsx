import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card, CardContent } from "@lootlog/ui/components/card";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { Field, FieldGroup, FieldLabel } from "@lootlog/ui/components/field";
import { Input } from "@lootlog/ui/components/input";
import { useState } from "react";
import {
  getKeyErrorMessage,
  isApiKeyActive,
  keyRequest,
  type ApiKey,
} from "~/lib/key-client";
import { portalText as t } from "~/lib/translations";
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
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
  const [error, setError] = useState<string | null>(null);
  async function mutate(method: "PATCH" | "DELETE") {
    setPending(true);
    setError(null);
    try {
      const request: RequestInit = { method };
      if (method === "PATCH") request.body = JSON.stringify({ name });
      await keyRequest(`/${encodeURIComponent(apiKey.id)}`, request);
      await onChange();
    } catch (error) {
      setError(getKeyErrorMessage(error));
      if (method === "DELETE") throw error;
    } finally {
      setPending(false);
    }
  }
  const expired = !isApiKeyActive(apiKey, observedAt);
  return (
    <Card>
      <CardContent>
        <form
          aria-busy={pending}
          onSubmit={(event) => {
            event.preventDefault();
            void mutate("PATCH");
          }}
        >
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel htmlFor={`key-name-${apiKey.id}`}>
                {t.name}
              </FieldLabel>
              <Input
                id={`key-name-${apiKey.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
              />
            </Field>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm [&_dt]:mb-1 [&_dt]:text-muted-foreground [&_dd]:break-words">
              <div>
                <dt>{t.status}</dt>
                <dd>
                  <Badge variant={expired ? "outline" : "ready"}>
                    {expired ? t.expired : t.active}
                  </Badge>
                </dd>
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
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={pending || name === apiKey.name}
                type="submit"
              >
                {t.save}
              </Button>
              <ConfirmDeleteDialog
                disabled={pending}
                title={t.confirmRemoveTitle(apiKey.name)}
                description={
                  error ? `${t.confirmRemove} ${error}` : t.confirmRemove
                }
                confirmButtonLabel={t.remove}
                cancelButtonLabel={t.cancel}
                onConfirm={() => mutate("DELETE")}
                trigger={
                  <Button
                    variant="destructive"
                    type="button"
                    aria-label={`${t.remove}: ${apiKey.name}`}
                  >
                    {t.remove}
                  </Button>
                }
              />
            </div>
          </FieldGroup>
        </form>
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
