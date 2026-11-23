import {
  PLATFORM_ROLES,
  type PlatformRole,
} from "@lootlog/schema/platform-roles";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { useState } from "react";
import { roleText, text } from "@/lib/messages";
import { useUserAction } from "@/lib/use-user-action";

export function RolesForm({
  userId,
  roles,
}: {
  userId: string;
  roles: ReadonlyArray<PlatformRole>;
}) {
  const [selected, setSelected] = useState(roles);
  const { run, pending } = useUserAction(userId);

  const toggle = (role: PlatformRole, checked: boolean) =>
    setSelected((current) =>
      checked ? [...current, role] : current.filter((held) => held !== role),
    );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void run({ action: "roles", roles: selected });
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{text.rolesHeading}</legend>
        {PLATFORM_ROLES.map((role) => (
          <div key={role} className="flex items-start gap-3">
            <Checkbox
              id={`role-${role}`}
              className="mt-0.5"
              checked={selected.includes(role)}
              onCheckedChange={(checked) => toggle(role, checked)}
              aria-describedby={`role-${role}-description`}
            />
            <div className="grid gap-0.5">
              <label htmlFor={`role-${role}`} className="text-sm font-medium">
                {roleText[role].name}
              </label>
              <p
                id={`role-${role}-description`}
                className="text-sm text-muted-foreground"
              >
                {roleText[role].description}
              </p>
            </div>
          </div>
        ))}
      </fieldset>
      <div>
        <Button type="submit" loading={pending?.action === "roles"}>
          {text.rolesSave}
        </Button>
      </div>
    </form>
  );
}
