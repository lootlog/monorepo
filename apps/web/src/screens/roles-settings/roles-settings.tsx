import { SearchInput } from "@/components/ui/search-input";
import { GuildRole, useGuildRoles } from "@/hooks/api/use-guild-roles";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@lootlog/ui/components/button";
import { EllipsisVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { RolePanelContent } from "@/screens/roles-settings/components/roles-panel";

export const RolesSettings = () => {
  const { data: roles } = useGuildRoles();
  const [searchValue, setSearchValue] = useState("");
  const [selectedRole, setSelectedRole] = useState<GuildRole | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const prevSelectedRole = useRef<GuildRole | null>(null);

  useEffect(() => {
    if (prevSelectedRole.current === null && selectedRole !== null) {
      setShouldAnimate(true);
    } else {
      setShouldAnimate(false);
    }
    prevSelectedRole.current = selectedRole;
  }, [selectedRole]);

  const filteredRoles = roles?.filter((role) => {
    return role.name.toLowerCase().includes(searchValue.toLowerCase());
  });

  const selectedRoleColor =
    selectedRole?.color === 0 ? "FFF" : selectedRole?.color.toString(16);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-6">
        <div className="text-lg font-semibold">Ustawienia ról</div>
        <div className="text-sm text-gray-500">
          Ustawienia ról, które mogą być przypisane do graczy na serwerze
          Discord. Tutaj możesz przypisać uprawnienia do ról.
        </div>
      </div>
      <div className="p-4 border-t">
        <SearchInput
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Szukaj roli..."
        />
      </div>
      <div
        className={cn("border-t grid grid-cols-[1fr] flex-1", {
          "grid-cols-[theme(width.64)_1fr]": selectedRole,
        })}
      >
        <ScrollArea className="flex flex-col h-[calc(100vh-182px)]">
          {filteredRoles?.map((role) => {
            const color = role.color === 0 ? "FFF" : role.color.toString(16);
            const active = selectedRole?.id === role.id;

            return (
              <div
                key={role.id}
                className={cn(
                  "border-b flex flex-row justify-between py-4 px-6 h-12 items-center hover:bg-[#181C25] cursor-pointer text-sm",
                  {
                    "bg-[#181C25]": active,
                  }
                )}
                onClick={() => setSelectedRole(role)}
              >
                <div className="flex gap-4 items-center">
                  <div
                    className={cn("size-4 rounded-full")}
                    style={{ backgroundColor: `#${color}` }}
                  />
                  <div className="font-semibold">{role.name}</div>
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
        </ScrollArea>
        <AnimatePresence>
          {selectedRole &&
            (shouldAnimate ? (
              <motion.div
                className="border-l"
                initial={{ opacity: 0, x: 64 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                key={selectedRole.id}
              >
                <RolePanelContent
                  selectedRole={selectedRole}
                  setSelectedRole={setSelectedRole}
                  selectedRoleColor={selectedRoleColor}
                />
              </motion.div>
            ) : (
              <div className="border-l">
                <RolePanelContent
                  key={selectedRole.id}
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
