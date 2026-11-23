import { PLATFORM_ROLES } from "@lootlog/schema/platform-roles";
import { Button } from "@lootlog/ui/components/button";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { useNavigate } from "@tanstack/react-router";
import { FilterBarRow } from "@/components/filter-bar-row";
import { SearchForm } from "@/components/search-form";
import { roleText, text } from "@/lib/messages";
import { toggleSearchValue } from "@/lib/search-params";
import { hasUsersFilters, type UsersSearch } from "@/lib/users-search";

const roleOptions = PLATFORM_ROLES.map((role) => ({
  value: role,
  label: roleText[role].name,
}));

const statusOptions = [
  { value: "yes" as const, label: text.filterBanned },
  { value: "no" as const, label: text.filterNotBanned },
];

const auraOptions = [
  { value: "yes" as const, label: text.filterWithAura },
  { value: "no" as const, label: text.filterWithoutAura },
];

export function UsersFilter({ search }: { search: UsersSearch }) {
  const navigate = useNavigate();

  const update = (patch: Partial<UsersSearch>) =>
    void navigate({
      to: "/",
      search: { ...search, ...patch, page: undefined },
    });

  return (
    <FilterBarRow
      search={
        <SearchForm
          value={search.search}
          placeholder={text.filterSearchPlaceholder}
          onSearch={(value) => update({ search: value })}
        />
      }
    >
      <FilterPopover
        options={roleOptions}
        value={search.role}
        onValueChange={(role) =>
          update({ role: toggleSearchValue(search.role, role) })
        }
        placeholder={text.filterRole}
        showSearch={false}
        active={search.role !== undefined}
      />
      <FilterPopover
        options={statusOptions}
        value={search.banned}
        onValueChange={(banned) =>
          update({ banned: toggleSearchValue(search.banned, banned) })
        }
        placeholder={text.filterStatus}
        showSearch={false}
        active={search.banned !== undefined}
      />
      <FilterPopover
        options={auraOptions}
        value={search.aura}
        onValueChange={(aura) =>
          update({ aura: toggleSearchValue(search.aura, aura) })
        }
        placeholder={text.filterAura}
        showSearch={false}
        active={search.aura !== undefined}
      />
      {hasUsersFilters(search) ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => void navigate({ to: "/", search: {} })}
        >
          {text.filterClear}
        </Button>
      ) : null}
    </FilterBarRow>
  );
}
