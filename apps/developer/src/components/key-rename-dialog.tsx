import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { Field, FieldLabel } from "@lootlog/ui/components/field";
import { Input } from "@lootlog/ui/components/input";
import { useState } from "react";
import { getKeyErrorMessage, keyRequest, type ApiKey } from "~/lib/key-client";
import { portalText as t } from "~/lib/translations";

export function KeyRenameDialog({
  apiKey,
  disabled,
  onChange,
}: {
  apiKey: ApiKey;
  disabled: boolean;
  onChange: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(apiKey.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `key-name-${apiKey.id}`;

  async function rename() {
    setPending(true);
    setError(null);

    try {
      await keyRequest(`/${encodeURIComponent(apiKey.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await onChange();
      setOpen(false);
    } catch (error) {
      setError(getKeyErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);

        if (next) {
          setName(apiKey.name);
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render=<Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={`${t.rename}: ${apiKey.name}`}
        />
      >
        {t.rename}
      </DialogTrigger>
      <DialogContent className="gap-0 p-6">
        <form
          aria-busy={pending}
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void rename();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.renameTitle}</DialogTitle>
            <DialogDescription>{t.renameDescription}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={inputId}>{t.name}</FieldLabel>
            <Input
              id={inputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              autoComplete="off"
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={pending || !name.trim() || name === apiKey.name}
            >
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
