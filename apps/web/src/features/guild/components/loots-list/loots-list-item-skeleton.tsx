import { CardContent } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type Props = {
  index?: number;
};

export const LootsListItemSkeleton: React.FC<Props> = ({ index = 0 }) => {
  const ITEMS_COUNT = ((index % 5) + 1);
  const PLAYERS_COUNT = ((index % 8) + 1);

  return (
    <li className="">
      <div className="rounded-none border-b border-t-0 border-x-0 md:h-32 py-1 md:py-0 flex flex-col justify-center">
        <div className="flex-row space-y-0 px-4 py-1 flex-wrap">
          <Skeleton className="w-72 h-[20px] rounded-md" />
        </div>
        <CardContent className="flex flex-row justify-between items-center flex-wrap px-4 py-1 gap-4">
          <div className="flex flex-row gap-2">
            {[...Array(ITEMS_COUNT)].map((_, i) => (
              <Skeleton key={i} className="w-[36px] h-[36px] rounded-md" />
            ))}
          </div>
          <div className="flex flex-row gap-2">
            {[...Array(PLAYERS_COUNT)].map((_, i) => (
              <Skeleton key={i} className="w-[32px] h-[48px] rounded-md" />
            ))}
          </div>
        </CardContent>
        <div className="px-4 py-1">
          <Skeleton className="w-36 h-[20px] rounded-md" />
        </div>
      </div>
    </li>
  );
};
