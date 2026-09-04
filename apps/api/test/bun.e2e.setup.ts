import { afterAll } from "bun:test";
import setup from "./bun.e2e.global-setup.js";

const teardown = await setup();
afterAll(teardown);
