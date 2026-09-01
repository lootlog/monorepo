import type { Capability } from "@lootlog/types";
import { SetMetadata } from "@nestjs/common";

export const REQUIRED_CAPABILITIES_KEY = "requiredCapabilities";

export const RequiresCapabilities = (...capabilities: Capability[]) =>
  SetMetadata(REQUIRED_CAPABILITIES_KEY, capabilities);
