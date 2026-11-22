import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { text } from "@/lib/messages";

export function AuraAccountForm({
  account,
  invalid,
}: {
  account: string | undefined;
  invalid: boolean;
}) {
  return (
    <form
      method="get"
      action="/auras"
      role="search"
      className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="aura-account">{text.aurasAccountLabel}</Label>
        <Input
          id="aura-account"
          name="account"
          type="search"
          required
          maxLength={300}
          defaultValue={account ?? ""}
          placeholder={text.aurasAccountPlaceholder}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "aura-account-error" : undefined}
        />
      </div>
      <div>
        <Button type="submit">{text.aurasLookup}</Button>
      </div>
      {invalid ? (
        <p
          id="aura-account-error"
          className="text-sm text-destructive md:col-span-2"
        >
          {text.aurasAccountInvalid}
        </p>
      ) : null}
    </form>
  );
}
