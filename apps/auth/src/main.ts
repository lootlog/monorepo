import { env } from "src/config/env";
import { createApp } from "src/app.factory";

async function bootstrap() {
  const app = await createApp();

  await app.listen(env.PORT, "0.0.0.0");
}

bootstrap();
