import {
  createNestFastifyApp,
  type NestFastifyApplication,
} from "@lootlog/nest-shared";
import { AppModule } from "./app.module";

export function createApp(): Promise<NestFastifyApplication> {
  return createNestFastifyApp(AppModule);
}
