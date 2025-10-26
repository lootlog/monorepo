import { SearchInput } from "@/components/ui/search-input";
import {
  useGuildRoles,
  type GuildRole,
} from "@/hooks/api/guilds/use-guild-roles";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@lootlog/ui/components/button";
import { EllipsisVertical } from "lucide-react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { RolePanelContent } from "@/features/roles-settings/components/roles-panel";

export const RolesSettings = () => {
  const { data: roles } = useGuildRoles();
  const [searchValue, setSearchValue] = useState("");
  const [selectedRole, setSelectedRole] = useState<GuildRole | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const handleSelectRole = (role: GuildRole) => {
    if (selectedRole === null) {
      setShouldAnimate(true);
    }
    setSelectedRole(role);
  };

  const filteredRoles = roles?.filter((role) => {
    return role.name.toLowerCase().includes(searchValue.toLowerCase());
  });

  const selectedRoleColor =
    selectedRole?.color === 0 ? "FFF" : selectedRole?.color.toString(16);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="p-4 pb-4 flex-shrink-0">
        <div className="text-lg font-semibold">Ustawienia ról</div>
        <div className="text-sm text-gray-500">
          Ustawienia ról, które mogą być przypisane do graczy na serwerze
          Discord. Tutaj możesz przypisać uprawnienia do ról.
        </div>
      </div>
      <div className="px-4 py-3 border-t flex-shrink-0">
        <SearchInput
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Szukaj roli..."
        />
      </div>
      <div
        className={cn(
          "border-t grid flex-1 min-h-0 transition-[grid-template-columns] overflow-hidden",
          selectedRole
            ? "grid-cols-1 md:grid-cols-[theme(width.64)_1fr]"
            : "grid-cols-1 md:grid-cols-[1fr]",
        )}
      >
        <ScrollArea
          className={cn("h-full min-h-0", selectedRole && "hidden md:block")}
        >
          <div className="flex flex-col">
            {filteredRoles?.map((role) => {
              const color = role.color === 0 ? "FFF" : role.color.toString(16);
              const active = selectedRole?.id === role.id;

              return (
                <div
                  key={role.id}
                  className={cn(
                    "border-b flex flex-row justify-between py-3 px-5 items-center hover:bg-secondary cursor-pointer text-sm",
                    {
                      "bg-secondary": active,
                    },
                  )}
                  onClick={() => handleSelectRole(role)}
                >
                  <div className="flex gap-4 items-center">
                    <div
                      className={cn("size-4 rounded-full")}
                      style={{ backgroundColor: `#${color}` }}
                    />
                    <div>
                      <div className="font-semibold">{role.name}</div>
                      <div className="text-xs text-gray-500">
                        ({role.lvlRangeFrom} - {role.lvlRangeTo})
                      </div>
                    </div>
                  </div>
                  {!selectedRole && (
                    <Button
                      className="size-8 rounded-full"
                      size="sm"
                      variant="secondary"
                    >
                      <EllipsisVertical />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <AnimatePresence mode="popLayout">
          {selectedRole &&
            (shouldAnimate ? (
              <motion.div
                className={cn(
                  "border-l min-h-0 h-full overflow-hidden",
                  "md:border-l border-l-0",
                )}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                key={selectedRole.id}
              >
                <RolePanelContent
                  selectedRole={selectedRole}
                  setSelectedRole={setSelectedRole}
                  selectedRoleColor={selectedRoleColor}
                />
              </motion.div>
            ) : (
              <div
                className={cn(
                  "border-l min-h-0 h-full overflow-hidden",
                  "md:border-l border-l-0",
                )}
                key={selectedRole.id}
              >
                <RolePanelContent
                  selectedRole={selectedRole}
                  setSelectedRole={setSelectedRole}
                  selectedRoleColor={selectedRoleColor}
                />
              </div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
