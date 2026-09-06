import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import { LiveFeedKillRow } from "./live-feed-kill-row";
import upperFirst from "lodash/upperFirst";
import { LiveFeedCompactRow } from "./live-feed-compact-row";
import { LiveFeedLootRow } from "./live-feed-loot-row";

type Props = {
  item: UserFeedResponseDtoOutput["items"][number];
  now: number;
  organizations?: UserFeedResponseDtoOutput["items"][number]["guild"][];
};
export function LiveFeedRow(props: Props) {
  const { item, organizations } = props;
  if (item.type === "kill") {
    return (
      <LiveFeedKillRow
        item={item}
        now={props.now}
        organizations={organizations ?? [item.guild]}
      />
    );
  }
  if (item.summary) {
    return (
      <LiveFeedLootRow
        now={props.now}
        loot={{
          ...item.summary,
          location: [upperFirst(item.world), item.summary.location]
            .filter(Boolean)
            .join(" · "),
          world: item.world,
          createdAt: item.occurredAt,
        }}
        organizations={organizations ?? [item.guild]}
      />
    );
  }
  return <LiveFeedCompactRow {...props} item={item} />;
}
