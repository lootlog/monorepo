import type { CharacterAuraGrantsResponseDto } from "@lootlog/client/main";
import { PERSONAL_CHARACTER_AURA_IDS } from "@lootlog/schema/character-aura";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { Link } from "@tanstack/react-router";
import { Section } from "@/components/section";
import { personalAuraText, text } from "@/lib/messages";
import { useAuraAction } from "@/lib/use-aura-action";

const linkClass =
  "rounded-control text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

function GrantBadge({ granted }: { granted: boolean }) {
  return granted ? (
    <Badge variant="ready">{text.aurasGranted}</Badge>
  ) : (
    <Badge variant="secondary">{text.aurasNotGranted}</Badge>
  );
}

/**
 * What the User who plays one Margonem account may choose, with the ways to
 * grant each aura and to take every grant back.
 */
export function AuraGrants({
  gameAccountId,
  grants,
}: {
  gameAccountId: string;
  grants: CharacterAuraGrantsResponseDto;
}) {
  const { run, pending } = useAuraAction(gameAccountId);
  const personal = new Set<string>(grants.personalAuraIds);
  const anyGrant = grants.granted || personal.size > 0;

  return (
    <Section id="aura-grants" title={text.aurasAccountHeading(gameAccountId)}>
      <div className="flex flex-col gap-6">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="grid min-w-0">
            <dt className="text-xs text-muted-foreground">
              {text.aurasLootlogUser}
            </dt>
            <dd className="break-all">
              <Link
                to="/users/$userId"
                params={{ userId: grants.userId }}
                className={linkClass}
              >
                {grants.userId}
              </Link>
            </dd>
          </div>
          <div className="grid min-w-0">
            <dt className="text-xs text-muted-foreground">
              {text.aurasProfileLink}
            </dt>
            <dd className="break-all">
              <a
                href={`https://www.margonem.pl/profile/view,${gameAccountId}`}
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                margonem.pl/profile/view,{gameAccountId}
              </a>
            </dd>
          </div>
        </dl>
        {grants.admin ? (
          <p className="text-sm text-muted-foreground">{text.aurasAdmin}</p>
        ) : null}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold">
              {text.aurasGeneralHeading}
            </h3>
            <GrantBadge granted={grants.granted} />
          </div>
          <p className="text-sm text-muted-foreground">
            {text.aurasGeneralDescription}
          </p>
          {grants.granted ? null : (
            <div>
              <Button
                loading={pending === "grant"}
                onClick={() => void run({ action: "grant" })}
              >
                {text.aurasGrant}
              </Button>
            </div>
          )}
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
                      loading={pending === auraId}
                      onClick={() =>
                        void run({ action: "grant-personal", auraId })
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
        {anyGrant ? (
          <div>
            <ConfirmDialog
              title={text.aurasRevokeConfirmTitle(gameAccountId)}
              description={text.aurasRevokeConfirmDescription}
              confirmButtonLabel={text.aurasRevoke}
              cancelButtonLabel={text.cancel}
              onConfirm={() => run({ action: "revoke" })}
              trigger={
                <Button variant="destructive">{text.aurasRevoke}</Button>
              }
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}
