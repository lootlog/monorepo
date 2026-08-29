import { Module } from "@nestjs/common";
import { AllController } from "./all.controller.js";
import { AllService } from "./all.service.js";
import { ItemsModule } from "#src/items/items.module";
import { NpcsModule } from "#src/npcs/npcs.module";
import { PlayersModule } from "#src/players/players.module";

@Module({
  imports: [ItemsModule, PlayersModule, NpcsModule],
  controllers: [AllController],
  providers: [AllService],
})
export class AllModule {}
