import {
  type CharacterAuraGrants,
  PERSONAL_CHARACTER_AURA_IDS,
} from "@lootlog/schema/character-aura";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { GrantBadge } from "@/components/grant-badge";
import { personalAuraText, text } from "@/lib/messages";
import { useUserAction } from "@/lib/use-user-action";

export function AuraGrants({
  user,
  grants,
}: {
  user: { readonly id: string; readonly name: string };
  grants: CharacterAuraGrants;
}) {
  const { run, pending } = useUserAction(user.id);
  const busy = pending !== undefined;
  const personal = new Set<string>(grants.personalAuraIds);

  return (
    <div className="flex flex-col gap-6">
      {grants.admin ? (
        <p className="text-sm text-muted-foreground">{text.aurasAdmin}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <GrantBadge granted={grants.granted} />
        <p className="text-sm text-muted-foreground">
          {text.aurasGeneral(grants.granted)}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{text.aurasPersonalHeading}</h3>
        <p className="text-sm text-muted-foreground">
          {text.aurasPersonalDescription}
        </p>
        <ul className="flex flex-col divide-y divide-border">
          {PERSONAL_CHARACTER_AURA_IDS.map((auraId) => {
            const name = personalAuraText[auraId];

            return (
              <li
                key={auraId}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  {name}
                  <GrantBadge granted={personal.has(auraId)} />
                </span>
                {personal.has(auraId) ? null : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    aria-label={text.aurasGrantPersonalLabel(name)}
                    loading={
                      pending?.action === "grant-personal-aura" &&
                      pending.auraId === auraId
                    }
                    disabled={busy}
                    onClick={() =>
                      void run({ action: "grant-personal-aura", auraId })
                    }
                  >
                    {text.aurasGrantPersonal}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {personal.size > 0 ? (
        <div>
          <ConfirmDialog
            title={text.aurasRevokeConfirmTitle(user.name)}
            description={text.aurasRevokeConfirmDescription}
            confirmButtonLabel={text.aurasRevoke}
            cancelButtonLabel={text.cancel}
            confirmText={text.confirmWord}
            confirmLabel={text.confirmWordLabel(text.confirmWord)}
            onConfirm={() => run({ action: "revoke-personal-auras" })}
            pending={pending?.action === "revoke-personal-auras"}
            trigger={
              <Button variant="destructive" disabled={busy}>
                {text.aurasRevoke}
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
