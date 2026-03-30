import { Module } from "@nestjs/common";
import { RulesModule } from "src/rules/rules.module";
import { WatchedItemsModule } from "src/watched-items/watched-items.module";
import { SchedulerModule } from "src/scheduler/scheduler.module";
import { TimerConsumer } from "./timer.consumer";
import { LootConsumer } from "./loot.consumer";
import { RespawnWindowConsumer } from "./respawn-window.consumer";

@Module({
  imports: [RulesModule, WatchedItemsModule, SchedulerModule],
  providers: [TimerConsumer, LootConsumer, RespawnWindowConsumer],
})
export class ConsumersModule {}
