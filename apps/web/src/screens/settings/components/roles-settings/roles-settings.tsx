import { SearchInput } from "components/ui/search-input";
import { useGuildRoles } from "hooks/api/use-guild-roles";
import { useState } from "react";
import { RolesSettingsForm } from "screens/settings/components/roles-settings/roles-settings-form";
import { cn } from "utils/cn";

export const RolesSettings = () => {
  const { data: roles } = useGuildRoles();
  const [searchValue, setSearchValue] = useState("");

  const filteredRoles = roles?.filter((role) => {
    return role.name.toLowerCase().includes(searchValue.toLowerCase());
  });

  return (
    <div className="h-full">
      <div className="p-4 pb-6">
        <div className="text-lg font-semibold">Role</div>
        <div className="text-sm text-gray-500">
          Ustawienia ról i dostępów np. jaka rola na discord ma dostęp do jakiej
          części serwisu
        </div>
      </div>
      <div className="p-4">
        <SearchInput
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Szukaj roli..."
        />
      </div>
      <div className="flex-1 border-t h-full">
        {filteredRoles?.map((role) => {
          const color = role.color === 0 ? "FFF" : role.color.toString(16);

          return (
            <div
              key={role.id}
              className="border-b flex flex-row justify-between py-4 px-4 items-center"
            >
              <div className="flex gap-4 items-center">
                <div
                  className={cn(`size-4 bg-[#${color}] rounded-full`)}
                  style={{ backgroundColor: `#${color}` }}
                />
                <div className="font-semibold">{role.name}</div>
              </div>
              <div>
                <RolesSettingsForm role={role} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
