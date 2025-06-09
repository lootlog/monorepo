import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@lootlog/ui/components/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from "react";

export const LootsListItemSkeleton: React.FC = () => {
  const RANDOM_ITEMS = useRef(Math.floor(Math.random() * 5) + 1);
  const RANDOM_PLAYERS = useRef(Math.floor(Math.random() * 10) + 1);

  return (
    <li className="">
      <Card className="rounded-none border-b border-t-0 border-x-0 h-32 flex flex-col justify-center">
        <CardHeader className="flex-row space-y-0 px-4 py-1 flex-wrap">
          <Skeleton className="w-72 h-[20px] rounded-md" />
        </CardHeader>
        <CardContent className="flex flex-row justify-between items-center flex-wrap px-4 py-1 gap-4">
          <div className="flex flex-row gap-2">
            {[...Array(RANDOM_ITEMS.current)].map((_, i) => (
              <Skeleton key={i} className="w-[36px] h-[36px] rounded-md" />
            ))}
          </div>
          <div className="flex flex-row gap-2">
            {[...Array(RANDOM_PLAYERS.current)].map((_, i) => (
              <Skeleton key={i} className="w-[32px] h-[48px] rounded-md" />
            ))}
          </div>
        </CardContent>
        <CardFooter className="px-4 py-1">
          <Skeleton className="w-36 h-[20px] rounded-md" />
        </CardFooter>
      </Card>
    </li>
  );
};
