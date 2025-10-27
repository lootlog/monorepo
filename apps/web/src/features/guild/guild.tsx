import { LootsFilters } from "@/features/guild/components/loots-filters/loots-filters";
import { Filter } from "lucide-react";
import { LootsList } from "@/features/guild/components/loots-list/loots-list";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { Button } from "@lootlog/ui/components/button";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";

export const Guild: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      {isMobile && (
        <Drawer>
          <DrawerTrigger className="w-full" asChild>
            <div className="p-2 w-full border-b">
              <Button className="w-full">
                <Filter /> Filtry
              </Button>
            </div>
          </DrawerTrigger>
          <DrawerContent className="">
            <DrawerTitle className="px-4 pt-4 flex items-center justify-center">
              Filtry
            </DrawerTitle>
            <div className="pb-4">
              <LootsFilters />
            </div>
            <DrawerFooter>
              <DrawerClose className="w-full" asChild>
                <Button variant="default" className="w-full">
                  Zapisz
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
      {!isMobile && <LootsFilters />}
      <LootsList />
    </div>
  );
};
