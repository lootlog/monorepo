import { Module } from "@nestjs/common";
import { WatchedItemsController } from "./watched-items.controller";
import { WatchedItemsService } from "./watched-items.service";

@Module({
  controllers: [WatchedItemsController],
  providers: [WatchedItemsService],
  exports: [WatchedItemsService],
})
export class WatchedItemsModule {}
