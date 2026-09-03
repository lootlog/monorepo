import { afterAll } from "bun:test";
import setup from "./bun.e2e.global-setup.js";
import "./bun.setup.js";

const teardown = await setup();
afterAll(teardown);
