import { Module } from "@nestjs/common";
import { RulesController } from "./rules.controller";
import { RulesService } from "./rules.service";

@Module({
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
