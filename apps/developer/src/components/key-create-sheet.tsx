import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@lootlog/ui/components/field";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import {
  decodeCreatedKey,
  getKeyErrorMessage,
  keyRequest,
} from "~/lib/key-client";
import { portalText as t } from "~/lib/translations";

type KeyCreateBody = {
  name: FormDataEntryValue | null;
  organizationIds: FormDataEntryValue[];
  personalData: boolean;
  mode: FormDataEntryValue | null;
  expiresIn: number | null;
};

/** The intro with the create button, and the sheet holding the new key's form. */
export function KeyCreateSheet({
  organizations,
  disabled,
  keyLimitReached,
  triggerRef,
  finalFocus,
  onCreated,
}: {
  organizations: readonly { readonly id: string; readonly name: string }[];
  disabled: boolean;
  keyLimitReached: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  finalFocus: () => HTMLElement | null;
  /** Receives the secret, which the server shows only once. */
  onCreated: (secret: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [scopeInvalid, setScopeInvalid] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const scopeFields = useRef<HTMLFieldSetElement>(null);
  const scopeErrorId = scopeInvalid ? "key-scope-error" : undefined;

  const createKey = useMutation({
    mutationFn: async (body: KeyCreateBody) =>
      decodeCreatedKey(
        await keyRequest("", { method: "POST", body: JSON.stringify(body) }),
      ),
    onSuccess: async (result) => {
      setOpen(false);
      setFormVersion((value) => value + 1);
      await onCreated(result.key);
    },
  });

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (createKey.isPending || disabled) return;
    const data = new FormData(event.currentTarget);
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
    const days = data.get("expiresIn");

    createKey.mutate({
      name: data.get("name"),
      organizationIds,
      personalData,
      mode: data.get("mode"),
      expiresIn: days === "never" ? null : Number(days) * 86400,
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!createKey.isPending) setOpen(nextOpen);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t.keyIntro}
        </p>
        <SheetTrigger
          ref={triggerRef}
          className={buttonVariants()}
          disabled={disabled}
        >
          {t.create}
        </SheetTrigger>
      </div>
      {keyLimitReached && (
        <Alert>
          <AlertDescription>{t.keyLimit}</AlertDescription>
        </Alert>
      )}
      <SheetContent
        className="w-full overflow-y-auto p-6 sm:max-w-lg"
        closeLabel={t.cancel}
        initialFocus={nameInput}
        finalFocus={finalFocus}
      >
        <SheetHeader className="pr-6">
          <SheetTitle id="key-create-title">{t.create}</SheetTitle>
          <SheetDescription>{t.selectScope}</SheetDescription>
        </SheetHeader>
        <form
          key={formVersion}
          onSubmit={create}
          aria-busy={createKey.isPending}
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
                    <SelectItem value="read-write">{t.readWrite}</SelectItem>
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
                <FieldLabel htmlFor="personal-data">{t.personal}</FieldLabel>
              </Field>
              {scopeInvalid && (
                <FieldError id="key-scope-error">{t.selectScope}</FieldError>
              )}
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="key-expiration">{t.expiration}</FieldLabel>
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
              loading={createKey.isPending}
              disabled={createKey.isPending || disabled}
            >
              {t.create}
            </Button>
            {keyLimitReached && (
              <Alert>
                <AlertDescription>{t.keyLimit}</AlertDescription>
              </Alert>
            )}
            {createKey.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {getKeyErrorMessage(createKey.error)}
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
