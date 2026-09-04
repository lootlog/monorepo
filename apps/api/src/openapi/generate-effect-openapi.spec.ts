import { expect, it } from "bun:test";
import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

it("exports current source contracts without depending on compiled output", async () => {
  const appDirectory = path.resolve(import.meta.dir, "../..");
  const fixture = await mkdtemp(path.join(tmpdir(), "api-openapi-source-"));
  try {
    await cp(path.join(appDirectory, "src"), path.join(fixture, "src"), {
      recursive: true,
    });
    await cp(
      path.join(appDirectory, "package.json"),
      path.join(fixture, "package.json"),
    );
    await cp(
      path.join(appDirectory, "tsconfig.json"),
      path.join(fixture, "tsconfig.json"),
    );
    await symlink(
      path.join(appDirectory, "node_modules"),
      path.join(fixture, "node_modules"),
      "dir",
    );
    const generate = async () => {
      const child = Bun.spawn([process.execPath, "run", "openapi:generate"], {
        cwd: fixture,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [exitCode, output, errors] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      expect({
        exitCode,
        diagnostics: exitCode === 0 ? "" : output + errors,
      }).toEqual({
        exitCode: 0,
        diagnostics: "",
      });
      return Bun.file(path.join(fixture, "openapi.yaml")).text();
    };

    expect(await generate()).toContain("openapi: 3.0.0");

    const sharedSource = Bun.file(
      path.join(fixture, "src/contracts/shared.ts"),
    );
    await Bun.write(
      sharedSource,
      (await sharedSource.text()).replace(
        'Schema.Literal("OK")',
        'Schema.Literal("SOURCE_CONTRACT_PROBE")',
      ),
    );
    await mkdir(path.join(fixture, "dist/src/contracts"), { recursive: true });
    await Bun.write(
      path.join(fixture, "dist/src/contracts/shared.js"),
      'throw new Error("Generator loaded stale compiled contracts");',
    );
    expect(await generate()).toContain("SOURCE_CONTRACT_PROBE");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 10_000);
